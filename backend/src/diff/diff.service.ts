import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { parse as parseCsvStream } from 'csv-parse';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { CompareFilesDto } from './dto/compare-files.dto';

interface ParsedFile {
  columns: string[];
  columnTypes: Record<string, string>;
  rows: Record<string, any>[];
  rowCount: number;
}

export interface ColumnDiff {
  column: string;
  type: 'both' | 'file1_only' | 'file2_only';
}

interface FieldDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface RowDiff {
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  key: string;
  fields?: FieldDiff[];
  row1?: Record<string, any>;
  row2?: Record<string, any>;
}

const PREVIEW_LIMIT = 5000;

@Injectable()
export class DiffService {
  private uploadDir = join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {}

  async compare(dto: CompareFilesDto, userId: string) {
    const [file1, file2] = await Promise.all([
      this.prisma.uploadedFile.findUnique({ where: { id: dto.fileId1 } }),
      this.prisma.uploadedFile.findUnique({ where: { id: dto.fileId2 } }),
    ]);

    if (!file1) throw new NotFoundException('File 1 not found');
    if (!file2) throw new NotFoundException('File 2 not found');

    if (file1.uploadedById !== userId) {
      throw new BadRequestException('File 1 is not accessible');
    }
    if (file2.uploadedById !== userId) {
      throw new BadRequestException('File 2 is not accessible');
    }

    const parsed1 = await this.parseFile(file1);
    const parsed2 = await this.parseFile(file2);

    const columnDiffs = this.compareColumns(parsed1.columns, parsed2.columns);

    const allColumns = [...new Set([...parsed1.columns, ...parsed2.columns])];

    let keyColumn = dto.keyColumn || null;
    if (keyColumn && !parsed1.columns.includes(keyColumn)) {
      const firstCommon = parsed1.columns.find(c => parsed2.columns.includes(c));
      keyColumn = firstCommon || parsed1.columns[0] || null;
    }

    const rowDiffs = this.compareRows(parsed1.rows, parsed2.rows, keyColumn, allColumns);

    const summary = {
      added: rowDiffs.filter(r => r.type === 'added').length,
      removed: rowDiffs.filter(r => r.type === 'removed').length,
      changed: rowDiffs.filter(r => r.type === 'changed').length,
      unchanged: rowDiffs.filter(r => r.type === 'unchanged').length,
    };

    return {
      file1: { id: file1.id, name: file1.originalName, rowCount: parsed1.rowCount, columnCount: parsed1.columns.length },
      file2: { id: file2.id, name: file2.originalName, rowCount: parsed2.rowCount, columnCount: parsed2.columns.length },
      keyColumn,
      summary,
      columnDiffs,
      rowDiffs,
      columns: allColumns,
    };
  }

  private async parseFile(file: any): Promise<ParsedFile> {
    const filePath = join(this.uploadDir, file.filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`File "${file.originalName}" not found on disk`);
    }

    if (file.filename.endsWith('.csv')) {
      return this.parseCsvFile(filePath);
    }
    if (file.filename.endsWith('.xlsx')) {
      const sheet = file.sheetNames?.[0] || undefined;
      return this.parseExcelFile(filePath, sheet);
    }
    throw new BadRequestException('Unsupported file format');
  }

  private async parseCsvFile(filePath: string): Promise<ParsedFile> {
    const rows: Record<string, any>[] = [];
    const columnTypes: Record<string, Set<string>> = {};
    let columns: string[] = [];

    const parser = createReadStream(filePath).pipe(parseCsvStream({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
    }));

    for await (const record of parser) {
      const row = record as Record<string, any>;
      if (columns.length === 0) {
        columns = Object.keys(row);
        columns.forEach(c => { columnTypes[c] = new Set(); });
      }
      for (const col of columns) {
        const val = row[col];
        if (val !== null && val !== undefined && val !== '') {
          columnTypes[col].add(typeof val === 'number' ? 'number' : isNaN(Number(val)) ? 'string' : 'number');
        }
      }
      rows.push(row);
      if (rows.length >= PREVIEW_LIMIT) break;
    }

    const types: Record<string, string> = {};
    for (const col of columns) {
      const vals = columnTypes[col];
      types[col] = vals.has('number') && !vals.has('string') ? 'number' : 'string';
    }

    return { columns, columnTypes: types, rows, rowCount: rows.length };
  }

  private parseExcelFile(filePath: string, sheetName?: string): ParsedFile {
    const workbook = XLSX.readFile(filePath, { sheetRows: PREVIEW_LIMIT + 1 });
    const sheet = sheetName && workbook.SheetNames.includes(sheetName)
      ? sheetName
      : workbook.SheetNames[0];

    if (!sheet) {
      return { columns: [], columnTypes: {}, rows: [], rowCount: 0 };
    }

    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' }) as Record<string, any>[];
    const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
    const columnTypes: Record<string, string> = {};

    if (columns.length > 0) {
      for (const col of columns) {
        const samples = jsonData.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
        const allNumbers = samples.length > 0 && samples.every(v => !isNaN(Number(v)));
        columnTypes[col] = allNumbers ? 'number' : 'string';
      }
    }

    return {
      columns,
      columnTypes,
      rows: jsonData.slice(0, PREVIEW_LIMIT),
      rowCount: jsonData.length,
    };
  }

  private compareColumns(cols1: string[], cols2: string[]): ColumnDiff[] {
    const set1 = new Set(cols1);
    const set2 = new Set(cols2);
    const all = new Set([...cols1, ...cols2]);
    const result: ColumnDiff[] = [];

    for (const col of all) {
      if (set1.has(col) && set2.has(col)) {
        result.push({ column: col, type: 'both' });
      } else if (set1.has(col)) {
        result.push({ column: col, type: 'file1_only' });
      } else {
        result.push({ column: col, type: 'file2_only' });
      }
    }

    return result;
  }

  private compareRows(
    rows1: Record<string, any>[],
    rows2: Record<string, any>[],
    keyColumn: string | null,
    allColumns: string[],
  ): RowDiff[] {
    const result: RowDiff[] = [];

    if (keyColumn) {
      const map1 = new Map<string, Record<string, any>>();
      const map2 = new Map<string, Record<string, any>>();

      rows1.forEach(r => {
        const key = String(r[keyColumn] ?? '');
        if (!map1.has(key)) map1.set(key, r);
      });
      rows2.forEach(r => {
        const key = String(r[keyColumn] ?? '');
        if (!map2.has(key)) map2.set(key, r);
      });

      const keys1 = new Set(map1.keys());
      const keys2 = new Set(map2.keys());

      for (const key of keys1) {
        if (!keys2.has(key)) {
          result.push({ type: 'removed', key, row1: map1.get(key) });
        }
      }

      for (const key of keys2) {
        if (!keys1.has(key)) {
          result.push({ type: 'added', key, row2: map2.get(key) });
        }
      }

      for (const key of keys1) {
        if (keys2.has(key)) {
          const r1 = map1.get(key)!;
          const r2 = map2.get(key)!;
          const fields: FieldDiff[] = [];
          for (const col of allColumns) {
            const v1 = r1[col];
            const v2 = r2[col];
            if (String(v1 ?? '') !== String(v2 ?? '')) {
              fields.push({ field: col, oldValue: v1 ?? '', newValue: v2 ?? '' });
            }
          }
          if (fields.length > 0) {
            result.push({ type: 'changed', key, fields, row1: r1, row2: r2 });
          } else {
            result.push({ type: 'unchanged', key, row1: r1 });
          }
        }
      }
    } else {
      const maxLen = Math.max(rows1.length, rows2.length);
      for (let i = 0; i < maxLen; i++) {
        const key = String(i + 1);
        if (i >= rows1.length) {
          result.push({ type: 'added', key, row2: rows2[i] });
        } else if (i >= rows2.length) {
          result.push({ type: 'removed', key, row1: rows1[i] });
        } else {
          const r1 = rows1[i];
          const r2 = rows2[i];
          const fields: FieldDiff[] = [];
          for (const col of allColumns) {
            const v1 = r1[col];
            const v2 = r2[col];
            if (String(v1 ?? '') !== String(v2 ?? '')) {
              fields.push({ field: col, oldValue: v1 ?? '', newValue: v2 ?? '' });
            }
          }
          if (fields.length > 0) {
            result.push({ type: 'changed', key, fields, row1: r1, row2: r2 });
          } else {
            result.push({ type: 'unchanged', key, row1: r1 });
          }
        }
      }
    }

    return result;
  }
}
