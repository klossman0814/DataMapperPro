import api from './api';
import type { AuthResponse, LoginDto, RegisterDto, User, ForgotPasswordDto, ResetPasswordDto } from '../types';

export const authService = {
  login: (dto: LoginDto) => api.post<AuthResponse>('/auth/login', dto).then(r => r.data),
  register: (dto: RegisterDto) => api.post<AuthResponse>('/auth/register', dto).then(r => r.data),
  getProfile: () => api.get<User>('/auth/profile').then(r => r.data),
  updateProfile: (dto: { name?: string }) => api.put<User>('/auth/profile', dto).then(r => r.data),
  updatePassword: (dto: { currentPassword: string; newPassword: string }) => api.put('/auth/password', dto).then(r => r.data),
  forgotPassword: (dto: ForgotPasswordDto) => api.post('/auth/forgot-password', dto).then(r => r.data),
  resetPassword: (dto: ResetPasswordDto) => api.post('/auth/reset-password', dto).then(r => r.data),
};
