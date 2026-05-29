import api from './api';

export interface ScriptStep {
  id?: string;
  name: string;
  sql: string;
  stepOrder: number;
  enabled?: boolean;
}

export interface ScriptSet {
  id: string;
  name: string;
  description?: string;
  connectionId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  steps: ScriptStep[];
  connection?: { id: string; name: string; type: string } | null;
}

export interface ExecutionResult {
  stepId: string;
  stepName: string;
  stepOrder: number;
  success: boolean;
  durationMs: number;
  rowsAffected?: number;
  error?: string;
}

export interface ExecutionResponse {
  scriptSetId: string;
  scriptSetName: string;
  connectionId: string;
  totalSteps: number;
  succeeded: number;
  failed: number;
  results: ExecutionResult[];
}

export const sqlScriptsService = {
  async list(): Promise<ScriptSet[]> {
    const { data } = await api.get('/sql-scripts');
    return data;
  },

  async get(id: string): Promise<ScriptSet> {
    const { data } = await api.get(`/sql-scripts/${id}`);
    return data;
  },

  async create(body: { name: string; description?: string; connectionId?: string; steps: ScriptStep[] }): Promise<ScriptSet> {
    const { data } = await api.post('/sql-scripts', body);
    return data;
  },

  async update(id: string, body: { name?: string; description?: string; connectionId?: string; steps?: ScriptStep[] }): Promise<ScriptSet> {
    const { data } = await api.put(`/sql-scripts/${id}`, body);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/sql-scripts/${id}`);
  },

  async execute(id: string, body: { connectionId: string; stepIds?: string[] }): Promise<ExecutionResponse> {
    const { data } = await api.post(`/sql-scripts/${id}/execute`, body);
    return data;
  },
};
