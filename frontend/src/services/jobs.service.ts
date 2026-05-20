import api from './api';
import type { ProcessingJob } from '../types';

export const jobsService = {
  create: (data: {
    fileId: string;
    profileId?: string;
    template?: string;
    mappings?: Record<string, any>[];
    outputFormat: string;
    outputOptions?: Record<string, any>;
  }) => api.post<ProcessingJob>('/jobs', data).then(r => r.data),

  list: (page = 1, limit = 20) =>
    api.get<{ data: ProcessingJob[]; total: number; page: number; limit: number }>('/jobs', {
      params: { page, limit },
    }).then(r => r.data),

  get: (id: string) => api.get<ProcessingJob>(`/jobs/${id}`).then(r => r.data),

  getProgress: (id: string) =>
    api.get<{ processedRows: number; totalRows: number; failedRows: number; status: string }>(
      `/jobs/${id}/progress`
    ).then(r => r.data),

  cancel: (id: string) => api.post(`/jobs/${id}/cancel`).then(r => r.data),

  download: (id: string) =>
    api.get(`/jobs/${id}/download`, { responseType: 'blob' }).then(r => r.data),
};
