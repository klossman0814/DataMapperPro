import { Injectable } from '@nestjs/common';

interface ColumnDef {
  name: string;
  type: string;
  sampleValues?: any[];
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

  mapToPostgresType(type: string, sampleValues?: any[]): string {
    switch (type) {
      case 'integer':
        return 'BIGINT';
      case 'number':
        return 'DOUBLE PRECISION';
      case 'date':
        return 'TIMESTAMP';
      case 'boolean':
        return 'BOOLEAN';
      case 'string':
      default: {
        if (sampleValues && sampleValues.length > 0) {
          const maxLen = Math.max(...sampleValues.map(v => String(v ?? '').length), 0);
          if (maxLen > 0 && maxLen <= this.MAX_VARCHAR) {
            return `VARCHAR(${Math.max(maxLen * 2, 255)})`;
          }
        }
        return 'TEXT';
      }
    }
  }

  generateCreateTable(tableName: string, columns: ColumnDef[], dropExisting: boolean): string {
    const safeName = this.sanitizeIdentifier(tableName);
    const colDefs = columns.map(col => {
      const safeCol = this.sanitizeIdentifier(col.name);
      const pgType = this.mapToPostgresType(col.type, col.sampleValues);
      return `  "${safeCol}" ${pgType}`;
    });

    const dropStatement = dropExisting ? `DROP TABLE IF EXISTS "${safeName}";\n` : '';
    return `${dropStatement}CREATE TABLE "${safeName}" (\n${colDefs.join(',\n')}\n);`;
  }

  generateInsertStatements(tableName: string, columns: ColumnDef[], rows: Record<string, any>[], batchSize: number): CreateTableResult {
    const safeName = this.sanitizeIdentifier(tableName);
    const safeCols = columns.map(c => `"${this.sanitizeIdentifier(c.name)}"`);

    const batches: string[] = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const valueRows = batch.map(row => {
        const values = columns.map(col => {
          const val = row[col.name];
          return this.formatLiteral(val);
        });
        return `(${values.join(', ')})`;
      });
      batches.push(`INSERT INTO "${safeName}" (${safeCols.join(', ')}) VALUES\n${valueRows.join(',\n')};`);
    }

    return {
      ddl: this.generateCreateTable(tableName, columns, false),
      insertStatements: batches,
      totalBatches: batches.length,
    };
  }

  private formatLiteral(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    const str = String(val);
    if (!isNaN(Date.parse(str)) && str.includes('-')) {
      return `'${this.escapeLiteral(str)}'::TIMESTAMP`;
    }
    if (!isNaN(Number(str)) && str !== '') return str;
    return `'${this.escapeLiteral(str)}'`;
  }

  private escapeLiteral(s: string): string {
    return s.replace(/'/g, "''").replace(/\\/g, '\\\\');
  }
}
