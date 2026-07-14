import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { join } from 'path';
import { createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { parse as parseCsvStream } from 'csv-parse';
import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { CreateFromQueryDto } from './dto/create-from-query.dto';

const PREVIEW_ROW_LIMIT = 5000;

interface ColumnInfo {
  name: string;
  type: string;
  nullCount: number;
  sampleValues: any[];
}

interface ParseResult {
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  rowCount: number;
}

@Injectable()
export class FilesService {
  private uploadDir = join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, dto: UploadFileDto, userId: string) {
    const filePath = file.path;
    const ext = file.originalname.toLowerCase().endsWith('.xlsx') || file.originalname.toLowerCase().endsWith('.xls')
      ? 'xlsx'
      : 'csv';

    let parseResult: ParseResult;
    let sheetNames: string[] = [];

    if (ext === 'xlsx') {
      try {
        const excelResult = this.parseExcel(filePath, dto.sheetName);
        sheetNames = excelResult.sheetNames;
        parseResult = excelResult;
      } catch (err) {
        try { unlinkSync(filePath); } catch {}
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException('Failed to parse Excel file. Ensure the file is not corrupted or password-protected.');
      }
    } else {
      try {
        parseResult = await this.parseCsvFile(filePath, dto.delimiter || ',', dto.hasHeader !== false);
      } catch (err) {
        try { unlinkSync(filePath); } catch {}
        throw new BadRequestException('Failed to parse CSV file. Check the file encoding and formatting.');
      }
    }

    if (parseResult.rowCount === 0) {
      try { unlinkSync(filePath); } catch {}
      throw new BadRequestException('File appears to be empty or has no parseable data.');
    }

    try {
      const uploadedFile = await this.prisma.uploadedFile.create({
        data: {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          rowCount: parseResult.rowCount,
          columns: JSON.parse(JSON.stringify(parseResult.columns)) as Prisma.InputJsonValue,
          preview: JSON.parse(JSON.stringify(parseResult.rows.slice(0, PREVIEW_ROW_LIMIT))) as Prisma.InputJsonValue,
          sheetNames,
          uploadedById: userId,
        },
      });

      return uploadedFile;
    } catch (err) {
      try { unlinkSync(filePath); } catch {}
      throw new InternalServerErrorException('Failed to save file metadata to database');
    }
  }

  async parseCsvFile(filePath: string, delimiter: string, hasHeader: boolean): Promise<ParseResult> {
    const rows: Record<string, any>[] = [];
    const columnMap: Record<string, ColumnInfo> = {};
    let rowCount = 0;

    const parser = createReadStream(filePath).pipe(parseCsvStream({
      delimiter,
      columns: hasHeader,
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
    }));

    for await (const record of parser) {
      rowCount++;
      const row = this.normalizeRow(record);
      if (rows.length < PREVIEW_ROW_LIMIT) {
        rows.push(row);
      }
      this.updateColumnStats(columnMap, row, rowCount);
    }

    return { columns: this.finalizeColumns(columnMap), rows, rowCount };
  }

  parseExcel(filePath: string, selectedSheet?: string): ParseResult & { sheetNames: string[] } {
    const workbook = XLSX.readFile(filePath, { sheetRows: PREVIEW_ROW_LIMIT + 1 });
    const sheetNames = workbook.SheetNames;

    const targetSheet = selectedSheet || sheetNames[0];
    const sheet = workbook.Sheets[targetSheet];
    if (!sheet) {
      throw new BadRequestException(`Sheet "${targetSheet}" not found`);
    }

    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!jsonData || jsonData.length === 0) {
      return { columns: [], rows: [], rowCount: 0, sheetNames };
    }

    const rows = jsonData as Record<string, any>[];
    return {
      columns: this.detectColumns(rows),
      rows: rows.slice(0, PREVIEW_ROW_LIMIT),
      rowCount: this.getExcelDataRowCount(sheet, rows.length),
      sheetNames,
    };
  }

  private detectColumns(rows: Record<string, any>[]): ColumnInfo[] {
    const columnMap: Record<string, ColumnInfo> = {};

    rows.forEach((row, index) => this.updateColumnStats(columnMap, row, index + 1));

    return this.finalizeColumns(columnMap);
  }

  private updateColumnStats(columnMap: Record<string, ColumnInfo>, row: Record<string, any>, rowNumber: number) {
    const seenKeys = new Set<string>();

    for (const [key, value] of Object.entries(row)) {
      seenKeys.add(key);
      if (!columnMap[key]) {
        columnMap[key] = { name: key, type: 'string', nullCount: rowNumber - 1, sampleValues: [] };
      }
      if (value === null || value === undefined || value === '') {
        columnMap[key].nullCount++;
      } else if (columnMap[key].sampleValues.length < 5) {
        columnMap[key].sampleValues.push(value);
      }
    }

    for (const [key, column] of Object.entries(columnMap)) {
      if (!seenKeys.has(key)) {
        column.nullCount++;
      }
    }
  }

  private finalizeColumns(columnMap: Record<string, ColumnInfo>): ColumnInfo[] {
    const columns = Object.values(columnMap);

    for (const col of columns) {
      const nonNullSamples = col.sampleValues.filter(v => v !== null && v !== undefined && v !== '');
      if (nonNullSamples.length > 0) {
        const allNumbers = nonNullSamples.every((v) => !isNaN(Number(v)) && v !== '');
        const allDates = nonNullSamples.every((v) => !isNaN(Date.parse(String(v))));
        col.type = allNumbers ? 'number' : allDates ? 'date' : 'string';
      }
    }

    return columns;
  }

  private normalizeRow(record: Record<string, any> | any[]): Record<string, any> {
    if (!Array.isArray(record)) {
      return record;
    }

    return record.reduce((row, value, index) => {
      row[String(index)] = value;
      return row;
    }, {} as Record<string, any>);
  }

  private getExcelDataRowCount(sheet: XLSX.WorkSheet, fallback: number): number {
    const ref = (sheet['!fullref'] || sheet['!ref']) as string | undefined;
    if (!ref) return fallback;

    const range = XLSX.utils.decode_range(ref);
    const physicalRows = range.e.r - range.s.r + 1;
    return Math.max(0, physicalRows - 1);
  }

  async createFromQuery(dto: CreateFromQueryDto, userId: string) {
    const uploadedFile = await this.prisma.uploadedFile.create({
      data: {
        filename: `${uuid()}.dbquery`,
        originalName: dto.originalName,
        mimeType: 'application/vnd.datamapper.db-query',
        size: 0,
        rowCount: dto.rowCount,
        columns: JSON.parse(JSON.stringify(dto.columns)) as Prisma.InputJsonValue,
        preview: JSON.parse(JSON.stringify(dto.preview)) as Prisma.InputJsonValue,
        databaseConnectionId: dto.databaseConnectionId,
        querySql: dto.querySql,
        uploadedById: userId,
      },
    });
    return uploadedFile;
  }

  async findAll(userId: string, page: number = 1, limit: number = 20) {
    const [files, total] = await Promise.all([
      this.prisma.uploadedFile.findMany({
        where: { uploadedById: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.uploadedFile.count({ where: { uploadedById: userId } }),
    ]);
    return { data: files, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFile(fileId: string) {
    const file = await this.prisma.uploadedFile.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async getPreview(fileId: string, page: number = 1, limit: number = 20) {
    const file = await this.getFile(fileId);
    const preview = (file.preview as Record<string, any>[]) || [];
    const start = (page - 1) * limit;
    const paginated = preview.slice(start, start + limit);
    return {
      columns: file.columns,
      rows: paginated,
      total: preview.length,
      page,
      limit,
      totalPages: Math.ceil(preview.length / limit),
    };
  }

  async getFileStream(fileId: string) {
    const file = await this.getFile(fileId);
    const filePath = join(this.uploadDir, file.filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }
    return createReadStream(filePath);
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: fileId, uploadedById: userId },
      include: { processingJobs: true },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const activeJobs = file.processingJobs.filter(
      (j) => j.status === 'PENDING' || j.status === 'PROCESSING',
    );
    if (activeJobs.length > 0) {
      throw new ConflictException(
        'Cannot delete file with active processing jobs. Cancel or wait for them to complete.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.processingJob.updateMany({
        where: { uploadedFileId: fileId },
        data: { uploadedFileId: null },
      });

      const filePath = join(this.uploadDir, file.filename);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }

      await tx.uploadedFile.delete({ where: { id: fileId } });
    });

    return { message: 'File deleted successfully' };
  }
}
