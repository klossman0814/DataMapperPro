import api from './api';

export interface ColumnMapping {
  sourceColumn: string;
  destColumn: string;
  sourceType: string;
}

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

export const databaseMigrationService = {
  discoverTables: (connectionId: string) =>
    api.post<string[]>('/database-migration/discover-tables', { connectionId }).then(r => r.data),

  discoverColumns: (connectionId: string, tableName: string) =>
    api.post<ColumnInfo[]>('/database-migration/discover-columns', { connectionId, tableName }).then(r => r.data),

  preview: (sourceConnectionId: string, sourceTable: string, columnMappings: ColumnMapping[], limit = 10) =>
    api.post<Record<string, any>[]>('/database-migration/preview', { sourceConnectionId, sourceTable, columnMappings, limit }).then(r => r.data),

  run: (data: {
    sourceConnectionId: string;
    destConnectionId: string;
    sourceTable: string;
    destTable: string;
    columnMappings: ColumnMapping[];
    dropExisting?: boolean;
    batchSize?: number;
    createTable?: boolean;
  }) => api.post<MigrationResult>('/database-migration/run', data).then(r => r.data),
};
