import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseQueryService } from '../database-connections/engine/database-query.service';
import { TextParserService } from './engine/text-parser.service';
import { TableCreatorService } from './engine/table-creator.service';
import { ParseTextDto } from './dto/parse-text.dto';
import { ImportTableDto } from './dto/import-table.dto';

const MAX_RETRIES = 1;

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

    const rows: Record<string, string>[] = jsonData.map(row => {
      const cleanRow: Record<string, string> = {};
      for (const h of headers) {
        cleanRow[h] = String(row[h] ?? '');
      }
      return cleanRow;
    });

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
    const { decrypt } = await this.getCryptoUtils();
    const password = decrypt(conn.encryptedPassword);
    const dbConfig = {
      host: conn.host,
      port: conn.port,
      database: conn.databaseName,
      username: conn.username,
      password,
      ssl: conn.sslEnabled,
    };

    // Create table via one-shot connection
    const createDDL = this.tableCreator.generateCreateTable(dto.tableName, dto.columns, dto.dropExisting ?? true, dbType);
    await this.queryService.executeQuery(conn.type, dbConfig, createDDL);

    const batchSize = dto.batchSize || 500;
    const ddlStatements: string[] = [createDDL];
    const errors: { batch: number; message: string }[] = [];
    let rowsInserted = 0;
    let connHandle: any = null;

    try {
      // Open one persistent connection for all batch inserts
      connHandle = await this.queryService.createConnection(conn.type, dbConfig);

      // Use COPY for PostgreSQL (dramatically faster), batch INSERT for others
      if (dbType === 'postgresql') {
        const result = await this.importPostgresCopy(connHandle, dto.tableName, dto.columns, dto.rows);
        rowsInserted = result.rowsInserted;
        errors.push(...result.errors);
      } else {
        const result = await this.importBatchedInserts(
          connHandle, conn.type, dto.tableName, dto.columns, dto.rows, batchSize,
        );
        rowsInserted = result.rowsInserted;
        errors.push(...result.errors);
      }
    } catch (err: any) {
      throw new BadRequestException(`Database error: ${err.message}`);
    } finally {
      if (connHandle) {
        try {
          await this.queryService.closeConnection(conn.type, connHandle);
        } catch { /* ignore close errors */ }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Import completed with ${errors.length} failed batch(es). Inserted ${rowsInserted} of ${dto.rows.length} rows. ` +
        `First error: ${errors[0].message}`,
      );
    }

    return {
      tableName: dto.tableName,
      rowsInserted,
      ddlStatements,
    };
  }

  private async importPostgresCopy(
    conn: any,
    tableName: string,
    columns: { name: string; type: string; sampleValues?: any[]; dbTypeOverride?: string }[],
    rows: Record<string, any>[],
  ): Promise<{ rowsInserted: number; errors: { batch: number; message: string }[] }> {
    const errors: { batch: number; message: string }[] = [];
    const safeName = this.tableCreator.sanitizeIdentifier(tableName);
    const safeCols = columns.map(c => `"${this.tableCreator.sanitizeIdentifier(c.name)}"`);
    const copySql = `COPY "${safeName}" (${safeCols.join(', ')}) FROM STDIN WITH (FORMAT CSV, NULL 'NULL', DELIMITER E'\\x01', QUOTE E'\\x02')`;

    // Format all rows as CSV with low-ASCII delimiter/quote to avoid conflicts
    const delimiter = '\x01';
    const quote = '\x02';
    const newline = '\n';

    const csvRows = rows.map(row => {
      return columns.map(col => {
        const val = row[col.name];
        if (val === null || val === undefined) return 'NULL';
        const str = String(val);
        // Escape quote and delimiter in the value
        const escaped = str.replace(new RegExp(`[${quote}${delimiter}\\n\\r]`, 'g'), (m) => {
          if (m === quote) return quote + quote;
          return m;
        });
        return `${quote}${escaped}${quote}`;
      }).join(delimiter);
    });

    const csvData = csvRows.join(newline) + newline;

    try {
      // Use a raw pg client from the pool for COPY
      const pgPool = conn;
      const client = await pgPool.connect();
      try {
        await client.query(copySql, [csvData]);
      } finally {
        client.release();
      }
    } catch (err: any) {
      errors.push({ batch: 0, message: err.message || 'COPY failed' });
      // Fallback to batched INSERTs if COPY fails
      return this.importBatchedInserts(conn, 'postgresql', tableName, columns, rows, 500);
    }

    return { rowsInserted: rows.length, errors };
  }

  private async importBatchedInserts(
    conn: any,
    dbType: string,
    tableName: string,
    columns: { name: string; type: string; sampleValues?: any[]; dbTypeOverride?: string }[],
    rows: Record<string, any>[],
    batchSize: number,
  ): Promise<{ rowsInserted: number; errors: { batch: number; message: string }[] }> {
    const errors: { batch: number; message: string }[] = [];
    let rowsInserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const insertSql = this.tableCreator.buildInsertStatement(tableName, columns, batch, dbType);
      let attempts = 0;
      let success = false;

      while (attempts <= MAX_RETRIES && !success) {
        try {
          await this.queryService.executeOnConnection(dbType, conn, insertSql);
          rowsInserted += batch.length;
          success = true;
        } catch (err: any) {
          attempts++;
          if (attempts > MAX_RETRIES) {
            errors.push({ batch: Math.floor(i / batchSize) + 1, message: err.message || 'Insert failed' });
          } else {
            // Wait briefly before retry (exponential backoff)
            await new Promise(r => setTimeout(r, 1000 * attempts));
          }
        }
      }
    }

    return { rowsInserted, errors };
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
