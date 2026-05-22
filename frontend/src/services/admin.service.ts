import api from './api';
import type { UserListItem, PaginatedResponse } from '../types';

export const adminService = {
  listUsers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<UserListItem>>('/admin/users', { params }).then(r => r.data),

  getUser: (id: string) =>
    api.get<UserListItem>(`/admin/users/${id}`).then(r => r.data),

  updateUser: (id: string, dto: { name?: string; email?: string; role?: string }) =>
    api.put<UserListItem>(`/admin/users/${id}`, dto).then(r => r.data),

  deactivateUser: (id: string) =>
    api.delete<UserListItem>(`/admin/users/${id}`).then(r => r.data),
};
