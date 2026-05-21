import api from './api';
import type { NotificationPreferences } from '../types';

export const notificationsService = {
  getPreferences: () =>
    api.get<NotificationPreferences>('/notifications/preferences').then(r => r.data),

  updatePreferences: (prefs: Partial<NotificationPreferences>) =>
    api.put<NotificationPreferences>('/notifications/preferences', prefs).then(r => r.data),
};
