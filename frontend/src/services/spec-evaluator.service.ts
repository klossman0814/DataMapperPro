import api from './api';
import type { SpecDocument, SpecEvaluation, PaginatedSpecs } from '../types';

export const specEvaluatorService = {
  upload: (file: File, data?: { name?: string; description?: string; tags?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (data?.name) formData.append('name', data.name);
    if (data?.description) formData.append('description', data.description);
    if (data?.tags) formData.append('tags', data.tags);
    return api.post<SpecDocument>('/spec-evaluator/upload', formData, {
      headers: { 'Content-Type': undefined },
    }).then(r => r.data);
  },

  list: (page = 1, limit = 20, tag?: string) =>
    api.get<PaginatedSpecs>('/spec-evaluator', { params: { page, limit, tag } }).then(r => r.data),

  get: (id: string) => api.get<SpecDocument>(`/spec-evaluator/${id}`).then(r => r.data),

  delete: (id: string) => api.delete(`/spec-evaluator/${id}`).then(r => r.data),

  evaluate: (specId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ id: string; status: string }>(`/spec-evaluator/${specId}/evaluate`, formData, {
      headers: { 'Content-Type': undefined },
    }).then(r => r.data);
  },

  listEvaluations: (specId: string) =>
    api.get<SpecEvaluation[]>(`/spec-evaluator/${specId}/evaluations`).then(r => r.data),

  getEvaluation: (evalId: string) =>
    api.get<SpecEvaluation>(`/spec-evaluator/evaluations/${evalId}`).then(r => r.data),

  generateTemplate: (specId: string) =>
    api.post(`/spec-evaluator/${specId}/generate-template`).then(r => r.data),
};
