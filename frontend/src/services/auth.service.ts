import api from './api';
import type { AuthResponse, LoginDto, RegisterDto, User } from '../types';

export const authService = {
  login: (dto: LoginDto) => api.post<AuthResponse>('/auth/login', dto).then(r => r.data),
  register: (dto: RegisterDto) => api.post<AuthResponse>('/auth/register', dto).then(r => r.data),
  getProfile: () => api.get<User>('/auth/profile').then(r => r.data),
};
