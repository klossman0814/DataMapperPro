import api from './api';
import type { ParseTextResult, ImportTableResult } from '../types';

export const textToTableService = {
  parse: (data: {
    text: string;
    separators: string[];
    parseMode?: 'flat' | 'hierarchical' | 'hl7-flat';
    hasHeader?: boolean;
    hl7FieldSep?: string;
    hl7CompSep?: string;
    hl7RepSep?: string;
    hl7EscapeChar?: string;
    hl7SubCompSep?: string;
    hl7AutoDetect?: boolean;
    hl7ExpandComponents?: boolean;
  }) => api.post<ParseTextResult>('/text-to-table/parse', data).then(r => r.data),

  parseFile: (file: File, sheetName?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sheetName) formData.append('sheetName', sheetName);
    return api.post<ParseTextResult>('/text-to-table/parse-file', formData, {
      headers: { 'Content-Type': undefined },
    }).then(r => r.data);
  },

  importToTable: (data: {
    connectionId: string;
    tableName: string;
    columns: { name: string; type: string; sampleValues?: any[] }[];
    rows: Record<string, any>[];
    dropExisting?: boolean;
    batchSize?: number;
  }) => api.post<ImportTableResult>('/text-to-table/import', data).then(r => r.data),
};
