import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { join } from 'path';
import { createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import * as csvParse from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { CreateFromQueryDto } from './dto/create-from-query.dto';

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
    const ext = file.originalname.toLowerCase().endsWith('.xlsx') || file.originalname.toLowerCase().endsWith('.xls')
      ? 'xlsx'
      : 'csv';
    const filename = `${uuid()}.${ext}`;
    const filePath = join(this.uploadDir, filename);

    await writeFile(filePath, file.buffer);

    let parseResult: ParseResult;
    let sheetNames: string[] = [];

    if (ext === 'xlsx') {
      const excelResult = this.parseExcel(filePath, dto.sheetName);
      sheetNames = excelResult.sheetNames;
      parseResult = excelResult;
    } else {
      const content = file.buffer.toString('utf-8');
      parseResult = this.parseCsv(content, dto.delimiter || ',', dto.hasHeader !== false);
    }

    const uploadedFile = await this.prisma.uploadedFile.create({
      data: {
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        rowCount: parseResult.rowCount,
        columns: JSON.parse(JSON.stringify(parseResult.columns)) as Prisma.InputJsonValue,
        preview: JSON.parse(JSON.stringify(parseResult.rows.slice(0, 100))) as Prisma.InputJsonValue,
        sheetNames,
        uploadedById: userId,
      },
    });

    return uploadedFile;
  }

  parseCsv(content: string, delimiter: string, hasHeader: boolean): ParseResult {
    const records = csvParse.parse(content, {
      delimiter,
      columns: hasHeader,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    if (!records || records.length === 0) {
      return { columns: [], rows: [], rowCount: 0 };
    }

    const columns = this.detectColumns(records);
    return { columns, rows: records, rowCount: records.length };
  }

  parseExcel(filePath: string, selectedSheet?: string): ParseResult & { sheetNames: string[] } {
    const workbook = XLSX.readFile(filePath);
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
      rows,
      rowCount: rows.length,
      sheetNames,
    };
  }

  private detectColumns(rows: Record<string, any>[]): ColumnInfo[] {
    const columnMap: Record<string, ColumnInfo> = {};
    const totalRows = rows.length;

    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        if (!columnMap[key]) {
          columnMap[key] = { name: key, type: 'string', nullCount: 0, sampleValues: [] };
        }
        if (value === null || value === undefined || value === '') {
          columnMap[key].nullCount++;
        } else if (columnMap[key].sampleValues.length < 5) {
          columnMap[key].sampleValues.push(value);
        }
      }
    }

    for (const col of Object.values(columnMap)) {
      const nonNullSamples = col.sampleValues.filter(v => v !== null && v !== undefined && v !== '');
      if (nonNullSamples.length > 0) {
        const allNumbers = nonNullSamples.every((v) => !isNaN(Number(v)) && v !== '');
        const allDates = nonNullSamples.every((v) => !isNaN(Date.parse(String(v))));
        col.type = allNumbers ? 'number' : allDates ? 'date' : 'string';
      }
    }

    return Object.values(columnMap);
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
