import { Injectable } from '@nestjs/common';
import { DatabaseQueryService } from '../../database-connections/engine/database-query.service';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface MigrationResult {
  rowsCopied: number;
  totalRows: number;
  failedRows: number;
  durationMs: number;
  errors: { row: number; message: string }[];
}

@Injectable()
export class MigrationEngineService {
  constructor(private queryService: DatabaseQueryService) {}

  async discoverColumns(
    dbType: string,
    config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
    tableName: string,
  ): Promise<ColumnInfo[]> {
    const schemaQuery = this.getSchemaQuery(dbType, tableName);
    const result = await this.queryService.executeQuery(dbType, config, schemaQuery);
    return result.rows.map((r: any) => ({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES' || r.is_nullable === true,
    }));
  }

  async discoverTables(
    dbType: string,
    config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
  ): Promise<string[]> {
    const query = this.getTableListQuery(dbType);
    const result = await this.queryService.executeQuery(dbType, config, query);
    return result.rows.map((r: any) => r.table_name);
  }

  async previewRows(
    dbType: string,
    config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
    sourceTable: string,
    columnMappings: { sourceColumn: string; destColumn: string; sourceType: string }[],
    limit: number = 10,
  ): Promise<Record<string, any>[]> {
    const sourceCols = columnMappings.map(m => `"${this.sanitizeIdentifier(m.sourceColumn)}"`).join(', ');
    const sql = `SELECT ${sourceCols} FROM "${this.sanitizeIdentifier(sourceTable)}" LIMIT ${limit}`;
    const result = await this.queryService.executeQuery(dbType, config, sql);
    return result.rows.map(row => {
      const mapped: Record<string, any> = {};
      columnMappings.forEach(m => {
        mapped[m.destColumn] = row[m.sourceColumn];
      });
      return mapped;
    });
  }

  async runMigration(
    sourceType: string,
    sourceConfig: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
    destType: string,
    destConfig: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
    sourceTable: string,
    destTable: string,
    columnMappings: { sourceColumn: string; destColumn: string; sourceType: string }[],
    dropExisting: boolean,
    batchSize: number,
    createTable: boolean,
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: { row: number; message: string }[] = [];
    const destTableSafe = this.sanitizeIdentifier(destTable);

    if (createTable) {
      const ddl = this.generateCreateTable(destTableSafe, columnMappings, destType, dropExisting);
      await this.queryService.executeQuery(destType, destConfig, ddl);
    }

    const sourceCols = columnMappings.map(m => `"${this.sanitizeIdentifier(m.sourceColumn)}"`).join(', ');
    const selectSql = `SELECT ${sourceCols} FROM "${this.sanitizeIdentifier(sourceTable)}"`;
    const sourceResult = await this.queryService.executeQuery(sourceType, sourceConfig, selectSql);
    const totalRows = sourceResult.rows.length;

    const destCols = columnMappings.map(m => `"${this.sanitizeIdentifier(m.destColumn)}"`).join(', ');
    let rowsCopied = 0;
    let failedRows = 0;

    for (let i = 0; i < totalRows; i += batchSize) {
      const batch = sourceResult.rows.slice(i, i + batchSize);
      const valueRows = batch.map(row => {
        const values = columnMappings.map(m => this.formatLiteral(row[m.sourceColumn], destType, m.sourceType));
        return `(${values.join(', ')})`;
      });
      const insertSql = `INSERT INTO "${destTableSafe}" (${destCols}) VALUES\n${valueRows.join(',\n')};`;

      try {
        await this.queryService.executeQuery(destType, destConfig, insertSql);
        rowsCopied += batch.length;
      } catch (err: any) {
        failedRows += batch.length;
        errors.push({ row: i + 1, message: err.message || 'Insert failed' });
      }
    }

    return {
      rowsCopied,
      totalRows,
      failedRows,
      durationMs: Date.now() - startTime,
      errors,
    };
  }

  private getSchemaQuery(dbType: string, tableName: string): string {
    const safe = this.sanitizeIdentifier(tableName);
    switch (dbType) {
      case 'mssql':
        return `SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${safe}' ORDER BY ORDINAL_POSITION`;
      case 'mysql':
        return `SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type, IS_NULLABLE AS is_nullable FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${safe}' ORDER BY ORDINAL_POSITION`;
      default:
        return `SELECT column_name, data_type, is_nullable FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = '${safe}' ORDER BY ordinal_position`;
    }
  }

  private getTableListQuery(dbType: string): string {
    switch (dbType) {
      case 'mssql':
        return "SELECT TABLE_NAME AS table_name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME";
      case 'mysql':
        return "SELECT TABLE_NAME AS table_name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME";
      default:
        return "SELECT table_name FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'public' ORDER BY table_name";
    }
  }

  private sanitizeIdentifier(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_') || 'col';
  }

  private generateCreateTable(
    tableName: string,
    columns: { sourceColumn: string; destColumn: string; sourceType: string }[],
    dbType: string,
    dropExisting: boolean,
  ): string {
    const drop = dropExisting ? `DROP TABLE IF EXISTS "${tableName}";\n` : '';
    const colDefs = columns.map(c => {
      const safeCol = this.sanitizeIdentifier(c.destColumn);
      const sqlType = this.mapSourceType(c.sourceType, dbType);
      return `  "${safeCol}" ${sqlType}`;
    });
    return `${drop}CREATE TABLE "${tableName}" (\n${colDefs.join(',\n')}\n);`;
  }

  private mapSourceType(sourceType: string, dbType: string): string {
    const normalized = sourceType.toLowerCase();
    if (normalized.includes('int') || normalized.includes('serial') || normalized === 'bigint' || normalized === 'integer' || normalized === 'smallint') {
      return dbType === 'mysql' ? 'BIGINT' : 'BIGINT';
    }
    if (normalized.includes('decimal') || normalized.includes('numeric') || normalized.includes('float') || normalized.includes('double') || normalized.includes('real')) {
      return dbType === 'mysql' ? 'DOUBLE' : dbType === 'mssql' ? 'FLOAT(53)' : 'DOUBLE PRECISION';
    }
    if (normalized.includes('char') || normalized.includes('text') || normalized.includes('varchar')) {
      return 'TEXT';
    }
    if (normalized.includes('timestamp') || normalized.includes('datetime') || normalized.includes('date')) {
      return dbType === 'mysql' ? 'DATETIME' : dbType === 'mssql' ? 'DATETIME2' : 'TIMESTAMP';
    }
    if (normalized.includes('bool')) {
      return dbType === 'mysql' ? 'TINYINT(1)' : dbType === 'mssql' ? 'BIT' : 'BOOLEAN';
    }
    if (normalized.includes('json')) {
      return dbType === 'mysql' ? 'JSON' : 'JSONB';
    }
    if (normalized.includes('uuid')) {
      return dbType === 'mysql' ? 'CHAR(36)' : dbType === 'mssql' ? 'UNIQUEIDENTIFIER' : 'UUID';
    }
    return 'TEXT';
  }

  private formatLiteral(val: any, dbType: string, colType: string): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    const normalized = colType.toLowerCase();
    if (normalized.includes('bool')) {
      if (val === true || val === 'true' || val === '1' || val === 1) return dbType === 'mssql' ? '1' : dbType === 'mysql' ? '1' : 'TRUE';
      return dbType === 'mssql' ? '0' : dbType === 'mysql' ? '0' : 'FALSE';
    }
    if ((normalized.includes('int') || normalized.includes('float') || normalized.includes('double') || normalized.includes('decimal') || normalized.includes('numeric')) && !isNaN(Number(val)) && val !== '') {
      return String(Number(val));
    }
    return `'${String(val).replace(/'/g, "''")}'`;
  }
}
