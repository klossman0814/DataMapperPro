import api from './api';
import type { ParseTextResult, ImportTableResult } from '../types';

export const textToTableService = {
  parse: (data: {
    text: string;
    separators: string[];
    parseMode?: 'flat' | 'hierarchical';
    hasHeader?: boolean;
  }) => api.post<ParseTextResult>('/text-to-table/parse', data).then(r => r.data),

  importToTable: (data: {
    connectionId: string;
    tableName: string;
    columns: { name: string; type: string; sampleValues?: any[] }[];
    rows: Record<string, any>[];
    dropExisting?: boolean;
    batchSize?: number;
  }) => api.post<ImportTableResult>('/text-to-table/import', data).then(r => r.data),
};
