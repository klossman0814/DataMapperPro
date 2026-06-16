import { create } from 'zustand';
import type { UploadedFileInfo, ColumnInfo, FieldMapping, OutputFormat } from '../types';

interface MappingState {
  uploadedFile: UploadedFileInfo | null;
  sourceColumns: ColumnInfo[];
  mappings: FieldMapping[];
  template: string;
  outputPreview: string;
  profileName: string;
  profileDescription: string;
  outputFormat: OutputFormat;
  outputExtension: string;
  savedProfileId: string | null;
  savedProfileVersion: number;
  databaseConnectionId: string | null;
  querySql: string;
  selectedFileId: string;
  selectedTemplateId: string;
  sourceTab: 'file' | 'database';
  templateDbConnectionId: string;
  templateQuerySql: string;
  previewRows: Record<string, any>[];
  livePreviewEnabled: boolean;
  liveOutput: string;
  pendingTemplateMatch: string;
  setUploadedFile: (file: UploadedFileInfo) => void;
  setSourceColumns: (columns: ColumnInfo[]) => void;
  addMapping: (mapping: FieldMapping) => void;
  updateMapping: (index: number, mapping: Partial<FieldMapping>) => void;
  removeMapping: (index: number) => void;
  reorderMappings: (from: number, to: number) => void;
  setMappings: (mappings: FieldMapping[]) => void;
  setTemplate: (template: string) => void;
  setOutputPreview: (preview: string) => void;
  setProfileName: (name: string) => void;
  setProfileDescription: (desc: string) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setOutputExtension: (ext: string) => void;
  setSavedProfileId: (id: string | null) => void;
  setSavedProfileVersion: (v: number) => void;
  setDatabaseConnection: (id: string | null, sql: string) => void;
  setSelectedFileId: (id: string) => void;
  setSelectedTemplateId: (id: string) => void;
  setSourceTab: (tab: 'file' | 'database') => void;
  setTemplateDbConnectionId: (id: string) => void;
  setTemplateQuerySql: (sql: string) => void;
  setPreviewRows: (rows: Record<string, any>[]) => void;
  setLivePreviewEnabled: (enabled: boolean) => void;
  setLiveOutput: (output: string) => void;
  setPendingTemplateMatch: (match: string) => void;
  reset: () => void;
}

const initialState = {
  uploadedFile: null,
  sourceColumns: [],
  mappings: [],
  template: '',
  outputPreview: '',
  profileName: '',
  profileDescription: '',
  outputFormat: 'txt' as OutputFormat,
  outputExtension: '',
  savedProfileId: null,
  savedProfileVersion: 0,
  databaseConnectionId: null,
  querySql: '',
  selectedFileId: '',
  selectedTemplateId: '',
  sourceTab: 'file' as 'file' | 'database',
  templateDbConnectionId: '',
  templateQuerySql: '',
  previewRows: [] as Record<string, any>[],
  livePreviewEnabled: false,
  liveOutput: '',
  pendingTemplateMatch: '',
};

export const useMappingStore = create<MappingState>((set) => ({
  ...initialState,

  setUploadedFile: (file) => set({ uploadedFile: file }),
  setSourceColumns: (columns) => set({ sourceColumns: columns }),

  addMapping: (mapping) =>
    set((state) => ({ mappings: [...state.mappings, mapping] })),

  updateMapping: (index, mapping) =>
    set((state) => ({
      mappings: state.mappings.map((m, i) =>
        i === index ? { ...m, ...mapping } : m
      ),
    })),

  removeMapping: (index) =>
    set((state) => ({
      mappings: state.mappings.filter((_, i) => i !== index),
    })),

  reorderMappings: (from, to) =>
    set((state) => {
      const mappings = [...state.mappings];
      const [removed] = mappings.splice(from, 1);
      mappings.splice(to, 0, removed);
      return { mappings };
    }),

  setMappings: (mappings) => set({ mappings }),
  setTemplate: (template) => set({ template }),
  setOutputPreview: (preview) => set({ outputPreview: preview }),
  setProfileName: (name) => set({ profileName: name }),
  setProfileDescription: (desc) => set({ profileDescription: desc }),
  setOutputFormat: (format) => set({ outputFormat: format }),
  setOutputExtension: (ext) => set({ outputExtension: ext }),
  setSavedProfileId: (id) => set({ savedProfileId: id }),
  setSavedProfileVersion: (v) => set({ savedProfileVersion: v }),
  setDatabaseConnection: (id, sql) => set({ databaseConnectionId: id, querySql: sql }),
  setSelectedFileId: (id) => set({ selectedFileId: id }),
  setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),
  setSourceTab: (tab) => set({ sourceTab: tab }),
  setTemplateDbConnectionId: (id) => set({ templateDbConnectionId: id }),
  setTemplateQuerySql: (sql) => set({ templateQuerySql: sql }),
  setPreviewRows: (rows) => set({ previewRows: rows }),
  setLivePreviewEnabled: (enabled) => set({ livePreviewEnabled: enabled }),
  setLiveOutput: (output) => set({ liveOutput: output }),
  setPendingTemplateMatch: (match) => set({ pendingTemplateMatch: match }),
  reset: () => set(initialState),
}));
