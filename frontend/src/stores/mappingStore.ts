import { create } from 'zustand';
import type { UploadedFileInfo, ColumnInfo, FieldMapping } from '../types';

interface MappingState {
  uploadedFile: UploadedFileInfo | null;
  sourceColumns: ColumnInfo[];
  mappings: FieldMapping[];
  template: string;
  outputPreview: string;
  profileName: string;
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
  reset: () => void;
}

const initialState = {
  uploadedFile: null,
  sourceColumns: [],
  mappings: [],
  template: '',
  outputPreview: '',
  profileName: '',
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
  reset: () => set(initialState),
}));
