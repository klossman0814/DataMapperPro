export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullCount: number;
  nullPercentage: number;
  sampleValues: string[];
}

export interface FilePreview {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  rowCount: number;
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  sheetNames?: string[];
}

export interface FieldMapping {
  destinationField: string;
  sourceField?: string;
  transformation?: string;
  constant?: string;
  expression?: string;
  condition?: {
    field: string;
    operator: string;
    value: string;
  };
}

export interface MappingProfile {
  id: string;
  name: string;
  description?: string;
  template: string;
  configurationJson: {
    mappings: FieldMapping[];
  };
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'maxLength' | 'regex' | 'date' | 'lookup';
  value?: string;
  message?: string;
}

export interface ProcessingJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  processedRows: number;
  failedRows: number;
  errorLog: any;
  outputFormat: string;
  createdAt: string;
  completedAt?: string;
  uploadedFile?: FilePreview;
  profile?: MappingProfile;
}

export interface TemplateContext {
  row: Record<string, any>;
  index: number;
}

export type OutputFormat = 'txt' | 'csv' | 'json' | 'xml' | 'hl7' | 'pipe' | 'tab' | 'fixedwidth';

export interface UploadedFileInfo {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  rowCount: number;
  columns: ColumnInfo[];
  sheetNames?: string[];
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
