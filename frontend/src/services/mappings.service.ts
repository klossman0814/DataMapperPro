import api from './api';
import type { MappingProfile } from '../types';

export const mappingsService = {
  list: (page = 1, limit = 20) =>
    api.get<{ data: MappingProfile[]; total: number; page: number; limit: number }>('/mappings', {
      params: { page, limit },
    }).then(r => r.data),

  get: (id: string) => api.get<MappingProfile>(`/mappings/${id}`).then(r => r.data),

  create: (data: Partial<MappingProfile>) =>
    api.post<MappingProfile>('/mappings', data).then(r => r.data),

  update: (id: string, data: Partial<MappingProfile>) =>
    api.put<MappingProfile>(`/mappings/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/mappings/${id}`).then(r => r.data),

  clone: (id: string) =>
    api.post<MappingProfile>(`/mappings/${id}/clone`).then(r => r.data),

  export_: (id: string) =>
    api.get<MappingProfile>(`/mappings/${id}/export`).then(r => r.data),

  import_: (data: Partial<MappingProfile>) =>
    api.post<MappingProfile>('/mappings/import', data).then(r => r.data),
};
