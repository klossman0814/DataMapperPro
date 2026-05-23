export interface NotificationPreferences {
  jobCompleted: boolean;
  jobFailed: boolean;
  weeklySummary: boolean;
  weeklySummaryDay: string;
  weeklySummaryTime: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  isActive?: boolean;
  createdAt?: string;
  notificationPreferences?: NotificationPreferences | null;
}

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    mappingProfiles: number;
    uploadedFiles: number;
    processingJobs: number;
    databaseConnections: number;
  };
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
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
    outputFormat?: OutputFormat;
    outputOptions?: Record<string, any>;
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
  outputFile?: string;
  config?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
  uploadedFile?: FilePreview;
  profile?: MappingProfile;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'mssql' | 'postgresql' | 'mysql';
  host: string;
  port: number;
  databaseName: string;
  username: string;
  sslEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateContext {
  row: Record<string, any>;
  index: number;
}

export type OutputFormat = 'txt' | 'csv' | 'json' | 'xml' | 'hl7' | 'pipe' | 'tab' | 'fixedwidth' | 'freeform';

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

export interface ParseColumnInfo {
  name: string;
  type: string;
  nullCount: number;
  sampleValues: any[];
}

export interface ParseStats {
  separator: string;
  columns: number;
  rows: number;
  consistencyScore: number;
}

export interface ParseTextResult {
  columns: ParseColumnInfo[];
  rows: Record<string, any>[];
  rowCount: number;
  separatorUsed: string;
  stats: ParseStats[];
  selectedSeparator: string;
}

export interface ImportTableResult {
  tableName: string;
  rowsInserted: number;
  ddlStatements: string[];
}

export interface SpecField {
  name: string;
  dataType?: string;
  length?: number;
  required?: boolean;
  description?: string;
  sourcePosition?: number;
  subFieldPosition?: number;
  defaultValue?: string;
  validation?: string;
  repeating?: boolean;
  delimiter?: string;
  include?: boolean;
  hl7Segment?: string;
  hl7Field?: number;
  hl7Component?: number;
}

export interface SpecFormat {
  type: string;
  delimiter?: string;
  headerRow?: boolean;
  encoding?: string;
}

export interface SpecDocument {
  id: string;
  name: string;
  description?: string;
  originalName: string;
  mimeType: string;
  size: number;
  tags?: string;
  provider?: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  fieldCount: number;
  formatCount: number;
  fields: SpecField[];
  formats: SpecFormat[];
  rules: string[];
  notes: string[];
  sections?: { heading: string; content: string; level: number }[];
  evaluations?: SpecEvaluation[];
}

export interface SpecEvaluation {
  id: string;
  specDocumentId: string;
  status: string;
  score?: number;
  fieldCoverage?: {
    matched: string[];
    missing: string[];
    extra: string[];
    typeMismatches: { field: string; expected: string; actual: string }[];
  };
  issues?: { severity: string; field?: string; message: string }[];
  summary?: string;
  inputFilename?: string;
  inputRowCount?: number;
  createdAt: string;
  completedAt?: string;
}

export interface PaginatedSpecs {
  data: SpecDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
