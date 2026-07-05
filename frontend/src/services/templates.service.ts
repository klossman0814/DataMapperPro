import api from './api';

export interface Template {
  id: string;
  name: string;
  description?: string;
  content: string;
  version: number;
  configurationJson?: {
    sourceFileId?: string;
    sourceTab?: string;
    dbConnectionId?: string;
    querySql?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export const templatesService = {
  list: (page = 1, limit = 20) =>
    api.get<{ data: Template[]; total: number; page: number; limit: number }>('/templates', {
      params: { page, limit },
    }).then(r => r.data),

  get: (id: string) => api.get<Template>(`/templates/${id}`).then(r => r.data),

  create: (data: { name: string; content: string; description?: string; configuration?: any }) =>
    api.post<Template>('/templates', {
      name: data.name,
      template: data.content,
      description: data.description,
      configuration: data.configuration,
    }).then(r => r.data),

  update: (id: string, data: { name?: string; content?: string; description?: string; configuration?: any }) =>
    api.put<Template>(`/templates/${id}`, {
      name: data.name,
      template: data.content,
      description: data.description,
      configuration: data.configuration,
    }).then(r => r.data),

  delete: (id: string) => api.delete(`/templates/${id}`).then(r => r.data),

  render: (id: string, context: Record<string, any>) =>
    api.post<{ output: string }>(`/templates/${id}/render`, context).then(r => r.data),

  renderInline: (template: string, context: { row: Record<string, any>; index?: number; collapseNewlines?: boolean }, mappings?: Record<string, any>[]) =>
    api.post<{ output: string }>('/templates/render-inline', { template, context, mappings }).then(r => r.data),
};
