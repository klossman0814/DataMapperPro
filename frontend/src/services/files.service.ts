import api from './api';
import type { UploadedFileInfo } from '../types';

export const filesService = {
  upload: (file: File, options?: { sheetName?: string; delimiter?: string; hasHeader?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.sheetName) formData.append('sheetName', options.sheetName);
    if (options?.delimiter) formData.append('delimiter', options.delimiter);
    if (options?.hasHeader !== undefined) formData.append('hasHeader', String(options.hasHeader));
    return api.post<UploadedFileInfo>('/files/upload', formData, {
      headers: { 'Content-Type': undefined },
    }).then(r => r.data);
  },

  getFile: (id: string) => api.get<UploadedFileInfo>(`/files/${id}`).then(r => r.data),

  getPreview: (id: string, page = 1, limit = 100) =>
    api.get<{ columns: any[]; rows: any[]; totalRows: number }>(`/files/${id}/preview`, {
      params: { page, limit },
    }).then(r => r.data),

  list: (page = 1, limit = 20) =>
    api.get<{ data: UploadedFileInfo[]; total: number; page: number; limit: number }>('/files', {
      params: { page, limit },
    }).then(r => r.data),

  delete: (id: string) => api.delete(`/files/${id}`).then(r => r.data),
};
