import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseQueryService } from '../database-connections/engine/database-query.service';
import { TextParserService } from './engine/text-parser.service';
import { TableCreatorService } from './engine/table-creator.service';
import { ParseTextDto } from './dto/parse-text.dto';
import { ImportTableDto } from './dto/import-table.dto';

@Injectable()
export class TextToTableService {
  constructor(
    private prisma: PrismaService,
    private queryService: DatabaseQueryService,
    private textParser: TextParserService,
    private tableCreator: TableCreatorService,
  ) {}

  parseFile(file: Express.Multer.File, sheetName?: string) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const targetSheet = sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[targetSheet];
    if (!sheet) {
      throw new BadRequestException(`Sheet "${targetSheet}" not found`);
    }

    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    if (!jsonData || jsonData.length === 0) {
      throw new BadRequestException('No data found in sheet');
    }

    const headers = Object.keys(jsonData[0]);
    const totalRows = jsonData.length;

    // Build rows with string values — no separator parsing needed
    const rows: Record<string, string>[] = jsonData.map(row => {
      const cleanRow: Record<string, string> = {};
      for (const h of headers) {
        cleanRow[h] = String(row[h] ?? '');
      }
      return cleanRow;
    });

    // Build columns directly from the Excel data (same format as detectColumns)
    const columns = headers.map(name => {
      const values = rows.map(r => r[name]);
      const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
      const nonNullSamples = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 5);
      return { name, type: 'string' as const, nullCount, sampleValues: nonNullSamples };
    });

    return {
      columns,
      rows,
      rowCount: totalRows,
      separatorUsed: '',
      stats: [] as any[],
      selectedSeparator: '',
    };
  }

  parseText(dto: ParseTextDto) {
    console.log('[DEBUG] parseText received:', JSON.stringify({ separators: dto.separators, parseMode: dto.parseMode, hasHeader: dto.hasHeader }));
    if (!dto.text.trim()) {
      throw new BadRequestException('Text content is empty');
    }
    if (!dto.separators || dto.separators.length === 0) {
      throw new BadRequestException('At least one separator is required');
    }

    return this.textParser.parse(
      dto.text,
      dto.separators,
      dto.parseMode || 'flat',
      dto.hasHeader !== false,
      {
        fieldSep: dto.hl7FieldSep,
        compSep: dto.hl7CompSep,
        repSep: dto.hl7RepSep,
        escapeChar: dto.hl7EscapeChar,
        subCompSep: dto.hl7SubCompSep,
        autoDetect: dto.hl7AutoDetect,
        expandComponents: dto.hl7ExpandComponents,
      },
    );
  }

  async importToDatabase(dto: ImportTableDto, userId: string) {
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException('No rows to import');
    }
    if (!dto.columns || dto.columns.length === 0) {
      throw new BadRequestException('No columns defined');
    }
    if (!dto.tableName.trim()) {
      throw new BadRequestException('Table name is required');
    }

    const conn = await this.prisma.databaseConnection.findFirst({
      where: { id: dto.connectionId, createdById: userId },
    });
    if (!conn) {
      throw new BadRequestException('Database connection not found');
    }

    const dbType = conn.type;

    const createDDL = this.tableCreator.generateCreateTable(dto.tableName, dto.columns, dto.dropExisting ?? true, dbType);
    await this.executeOnConnection(conn, createDDL);

    const batchSize = dto.batchSize || 100;
    const result = this.tableCreator.generateInsertStatements(dto.tableName, dto.columns, dto.rows, batchSize, dbType);

    const ddlStatements: string[] = [createDDL];

    for (const insertSql of result.insertStatements) {
      await this.executeOnConnection(conn, insertSql);
    }

    return {
      tableName: dto.tableName,
      rowsInserted: dto.rows.length,
      ddlStatements,
    };
  }

  private async executeOnConnection(conn: any, sql: string) {
    const { decrypt } = await this.getCryptoUtils();
    const password = decrypt(conn.encryptedPassword);
    try {
      await this.queryService.executeQuery(
        conn.type,
        {
          host: conn.host,
          port: conn.port,
          database: conn.databaseName,
          username: conn.username,
          password,
          ssl: conn.sslEnabled,
        },
        sql,
      );
    } catch (err: any) {
      throw new BadRequestException(`Database error: ${err.message}`);
    }
  }

  private async getCryptoUtils() {
    const crypto = await import('crypto');
    const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'datamapper-default-change-me';

    function decrypt(encrypted: string): string {
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const parts = encrypted.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = Buffer.from(parts[2], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      return decipher.update(encryptedText as any, 'hex', 'utf8') + decipher.final('utf8');
    }

    return { decrypt };
  }
}
