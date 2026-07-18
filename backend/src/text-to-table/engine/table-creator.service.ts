import { Injectable } from '@nestjs/common';

interface ColumnDef {
  name: string;
  type: string;
  sampleValues?: any[];
  dbTypeOverride?: string;
}

interface CreateTableResult {
  ddl: string;
  insertStatements: string[];
  totalBatches: number;
}

@Injectable()
export class TableCreatorService {
  private readonly MAX_VARCHAR = 255;

  sanitizeIdentifier(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .replace(/^(\d)/, '_$1')
      || 'column';
  }

  generateCreateTable(tableName: string, columns: ColumnDef[], dropExisting: boolean, dbType: string): string {
    const safeName = this.sanitizeIdentifier(tableName);
    const quote = this.quoteChar(dbType);

    const dropStatement = dropExisting
      ? `DROP TABLE IF EXISTS ${quote}${safeName}${quote};\n`
      : '';

    const colDefs = columns.map(col => {
      const safeCol = this.sanitizeIdentifier(col.name);
      const sqlType = col.dbTypeOverride || this.mapType(col.type, dbType, col.sampleValues);
      return `  ${quote}${safeCol}${quote} ${sqlType}`;
    });

    return `${dropStatement}CREATE TABLE ${quote}${safeName}${quote} (\n${colDefs.join(',\n')}\n);`;
  }

  generateInsertStatements(
    tableName: string,
    columns: ColumnDef[],
    rows: Record<string, any>[],
    batchSize: number,
    dbType: string,
  ): CreateTableResult {
    const safeName = this.sanitizeIdentifier(tableName);
    const quote = this.quoteChar(dbType);
    const safeCols = columns.map(c => `${quote}${this.sanitizeIdentifier(c.name)}${quote}`);

    const batches: string[] = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const sql = this.buildInsertStatement(tableName, columns, batch, dbType);
      batches.push(sql);
    }

    return {
      ddl: this.generateCreateTable(tableName, columns, false, dbType),
      insertStatements: batches,
      totalBatches: batches.length,
    };
  }

  buildInsertStatement(
    tableName: string,
    columns: ColumnDef[],
    batch: Record<string, any>[],
    dbType: string,
  ): string {
    const safeName = this.sanitizeIdentifier(tableName);
    const quote = this.quoteChar(dbType);
    const safeCols = columns.map(c => `${quote}${this.sanitizeIdentifier(c.name)}${quote}`);
    const valueRows = batch.map(row => {
      const values = columns.map(col => this.formatLiteral(row[col.name], dbType, col.type));
      return `(${values.join(', ')})`;
    });
    return `INSERT INTO ${quote}${safeName}${quote} (${safeCols.join(', ')}) VALUES\n${valueRows.join(',\n')};`;
  }

  private quoteChar(dbType: string): string {
    switch (dbType) {
      case 'mssql': return '"';
      case 'mysql': return '`';
      default: return '"';
    }
  }

  private mapType(type: string, dbType: string, sampleValues?: any[]): string {
    switch (dbType) {
      case 'mssql':
        return this.mapToMssqlType(type, sampleValues);
      case 'mysql':
        return this.mapToMysqlType(type, sampleValues);
      default:
        return this.mapToPostgresType(type, sampleValues);
    }
  }

  private mapToPostgresType(type: string, sampleValues?: any[]): string {
    switch (type) {
      case 'integer': return 'BIGINT';
      case 'number': return 'DOUBLE PRECISION';
      case 'date': return 'TIMESTAMP';
      case 'boolean': return 'BOOLEAN';
      case 'string':
      default: return this.varcharOrText(sampleValues);
    }
  }

  private mapToMssqlType(type: string, sampleValues?: any[]): string {
    switch (type) {
      case 'integer': return 'BIGINT';
      case 'number': return 'FLOAT(53)';
      case 'date': return 'DATETIME2';
      case 'boolean': return 'BIT';
      case 'string':
      default: return this.varcharOrText(sampleValues);
    }
  }

  private mapToMysqlType(type: string, sampleValues?: any[]): string {
    switch (type) {
      case 'integer': return 'BIGINT';
      case 'number': return 'DOUBLE';
      case 'date': return 'DATETIME';
      case 'boolean': return 'TINYINT(1)';
      case 'string':
      default: return this.varcharOrText(sampleValues);
    }
  }

  private varcharOrText(sampleValues?: any[]): string {
    if (sampleValues && sampleValues.length > 0) {
      const maxLen = Math.max(...sampleValues.map(v => String(v ?? '').length), 0);
      if (maxLen > 0 && maxLen <= this.MAX_VARCHAR) {
        return `VARCHAR(${Math.max(maxLen * 2, 255)})`;
      }
    }
    return 'TEXT';
  }

  private formatLiteral(val: any, dbType: string, colType: string): string {
    if (val === null || val === undefined) return 'NULL';

    if (typeof val === 'number') return String(val);

    if (colType === 'boolean') {
      if (val === true || val === 'true' || val === '1' || val === 1) {
        return dbType === 'mssql' ? '1' : dbType === 'mysql' ? '1' : 'TRUE';
      }
      return dbType === 'mssql' ? '0' : dbType === 'mysql' ? '0' : 'FALSE';
    }

    const str = String(val);

    if (colType === 'date' || colType === 'number' || colType === 'integer') {
      if (colType === 'integer' || colType === 'number') {
        if (!isNaN(Number(str)) && str !== '') return str;
        return `'${this.escapeLiteral(str)}'`;
      }
      if (colType === 'date') {
        return this.formatDateLiteral(str, dbType);
      }
    }

    return `'${this.escapeLiteral(str)}'`;
  }

  private formatDateLiteral(str: string, dbType: string): string {
    switch (dbType) {
      case 'mssql':
        return `'${this.escapeLiteral(str)}'`;
      case 'mysql':
        return `'${this.escapeLiteral(str)}'`;
      default:
        return `'${this.escapeLiteral(str)}'::TIMESTAMP`;
    }
  }

  private escapeLiteral(s: string): string {
    return s.replace(/'/g, "''").replace(/\\/g, '\\\\');
  }
}
