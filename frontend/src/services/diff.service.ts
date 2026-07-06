import api from './api';
import type { DiffComparison } from '../types';

export const diffService = {
  compare: (fileId1: string, fileId2: string, keyColumn?: string) =>
    api.post<DiffComparison>('/diff/compare', { fileId1, fileId2, keyColumn }).then(r => r.data),
};
