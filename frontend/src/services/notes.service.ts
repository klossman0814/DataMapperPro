import api from './api';
import type { Note } from '../types';

export const notesService = {
  list: (params?: { category?: string; entityType?: string; entityId?: string }) =>
    api.get<Note[]>('/notes', { params }).then(r => r.data),

  get: (id: string) => api.get<Note>(`/notes/${id}`).then(r => r.data),

  create: (dto: { title: string; content: string; category?: string; entityId?: string; entityType?: string }) =>
    api.post<Note>('/notes', dto).then(r => r.data),

  update: (id: string, dto: { title?: string; content?: string; category?: string; entityId?: string; entityType?: string }) =>
    api.put<Note>(`/notes/${id}`, dto).then(r => r.data),

  delete: (id: string) => api.delete(`/notes/${id}`).then(r => r.data),
};
