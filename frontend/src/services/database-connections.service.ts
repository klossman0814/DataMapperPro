import api from './api';
import type { DatabaseConnection } from '../types';

export const databaseConnectionsService = {
  list: () => api.get<DatabaseConnection[]>('/database-connections').then(r => r.data),

  get: (id: string) => api.get<DatabaseConnection>(`/database-connections/${id}`).then(r => r.data),

  create: (data: {
    name: string; type: string; host: string; port: number;
    databaseName: string; username: string; password: string; sslEnabled?: boolean;
  }) => api.post<DatabaseConnection>('/database-connections', data).then(r => r.data),

  update: (id: string, data: Partial<{
    name: string; host: string; port: number; databaseName: string;
    username: string; password: string; sslEnabled: boolean;
  }>) => api.put<DatabaseConnection>(`/database-connections/${id}`, data).then(r => r.data),

  delete: (id: string) => api.delete(`/database-connections/${id}`).then(r => r.data),

  test: (id: string) => api.post<{ success: boolean; message: string }>(`/database-connections/${id}/test`).then(r => r.data),

  query: (id: string, sql: string) =>
    api.post<{ columns: { name: string; type: string }[]; rows: Record<string, any>[]; rowCount: number }>(
      `/database-connections/${id}/query`, { sql }
    ).then(r => r.data),
};
