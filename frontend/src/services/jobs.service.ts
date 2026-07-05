import api from './api';
import type { ProcessingJob } from '../types';

function getOutputExtension(job: ProcessingJob): string {
  if (job.outputFile) {
    const dot = job.outputFile.lastIndexOf('.');
    if (dot !== -1) return job.outputFile.slice(dot + 1);
  }
  if (job.config?.fileExtension) return job.config.fileExtension;
  const map: Record<string, string> = {
    csv: 'csv', json: 'json', xml: 'xml', txt: 'txt', hl7: 'hl7',
    pipe: 'txt', tab: 'tsv', fixedwidth: 'txt', freeform: 'txt',
  };
  return map[job.outputFormat] || 'txt';
}

export function getDownloadFilename(job: ProcessingJob): string {
  const name = job.uploadedFile?.originalName
    ? job.uploadedFile.originalName.replace(/\.\w+$/, '')
    : `job-${job.id.slice(0, 8)}`;
  return `${name}-${job.id.slice(0, 8)}.${getOutputExtension(job)}`;
}

export const jobsService = {
  create: (data: {
    fileId: string;
    profileId?: string;
    template?: string;
    mappings?: Record<string, any>[];
    outputFormat: string;
    collapseNewlines?: boolean;
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

  delete: (id: string) => api.delete(`/jobs/${id}`).then(r => r.data),
};
