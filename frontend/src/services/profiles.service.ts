import api from './api';
import type { MappingProfile } from '../types';

export const profilesService = {
  list: (page = 1, limit = 20) =>
    api.get<{ data: MappingProfile[]; total: number; page: number; limit: number }>('/profiles', {
      params: { page, limit },
    }).then(r => r.data),

  get: (id: string) => api.get<MappingProfile>(`/profiles/${id}`).then(r => r.data),

  save: (data: Partial<MappingProfile>) =>
    api.post<MappingProfile>('/profiles', data).then(r => r.data),

  update: (id: string, data: Partial<MappingProfile>) =>
    api.put<MappingProfile>(`/profiles/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/profiles/${id}`).then(r => r.data),

  clone: (id: string) =>
    api.post<MappingProfile>(`/profiles/${id}/clone`).then(r => r.data),

  export_: (id: string) =>
    api.get<MappingProfile>(`/profiles/${id}/export`).then(r => r.data),

  import_: (data: Partial<MappingProfile>) =>
    api.post<MappingProfile>('/profiles/import', data).then(r => r.data),
};
