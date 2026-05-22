import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Plug, Trash2, ChevronDown, ChevronRight, HardDrive, Server, CheckCircle2, XCircle } from 'lucide-react';
import { databaseConnectionsService } from '../services/database-connections.service';
import type { DatabaseConnection } from '../types';
import toast from 'react-hot-toast';

const defaultPorts: Record<string, number> = { mssql: 1433, postgresql: 5432, mysql: 3306 };

const typeLabels: Record<string, string> = {
  mssql: 'SQL Server', postgresql: 'PostgreSQL', mysql: 'MySQL',
};

export function DatabaseConnections() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', type: 'postgresql', host: '', port: 5432,
    databaseName: '', username: '', password: '', sslEnabled: false,
  });

  const load = () => {
    setLoading(true);
    databaseConnectionsService.list()
      .then(setConnections)
      .catch(() => toast.error('Failed to load connections'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: '', type: 'postgresql', host: '', port: 5432, databaseName: '', username: '', password: '', sslEnabled: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleTypeChange = (type: string) => {
    setForm((prev) => ({ ...prev, type, port: defaultPorts[type] || 5432 }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.host.trim() || !form.databaseName.trim() || !form.username.trim()) {
      toast.error('Fill in all required fields');
      return;
    }
    try {
      if (editingId) {
        const { type, password, ...rest } = form;
        const updateData: any = { ...rest };
        if (password) updateData.password = password;
        await databaseConnectionsService.update(editingId, updateData);
        toast.success('Connection updated');
      } else {
        if (!form.password) { toast.error('Password is required'); return; }
        await databaseConnectionsService.create(form);
        toast.success('Connection created');
      }
      resetForm();
      load();
    } catch { toast.error('Failed to save connection'); }
  };

  const handleEdit = (conn: DatabaseConnection) => {
    setForm({ name: conn.name, type: conn.type, host: conn.host, port: conn.port, databaseName: conn.databaseName, username: conn.username, password: '', sslEnabled: conn.sslEnabled });
    setEditingId(conn.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete connection "${name}"?`)) return;
    try {
      await databaseConnectionsService.delete(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
      toast.success('Connection deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleTest = async (id: string) => {
    console.log('handleTest called for', id);
    if (!id) { toast.error('Invalid connection ID'); return; }
    setTesting(id);
    const timeout = setTimeout(() => { setTesting(null); }, 30000);
    try {
      const res = await databaseConnectionsService.test(id);
      clearTimeout(timeout);
      console.log('Test result:', res);
      if (res?.message) toast.success(res.message);
      else toast.success('Connection successful');
    } catch (err: any) {
      clearTimeout(timeout);
      console.error('Test error:', err);
      if (err?.response) {
        toast.error(err.response.data?.message || `Error ${err.response.status}`);
      } else if (err?.message) {
        toast.error(err.message);
      } else {
        toast.error('Connection test failed');
      }
    } finally { setTesting(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Database Connections</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Manage reusable database connections for SQL Server, PostgreSQL, and MySQL</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus className="h-4 w-4" /> New Connection
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-300">
            {editingId ? 'Edit Connection' : 'New Connection'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input-field text-sm" placeholder="My Production DB" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Type *</label>
              <select value={form.type} onChange={(e) => handleTypeChange(e.target.value)} className="input-field text-sm">
                <option value="mssql">SQL Server</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Host *</label>
              <input value={form.host} onChange={(e) => setForm((p) => ({ ...p, host: e.target.value }))} className="input-field text-sm" placeholder="localhost or host.docker.internal" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Port</label>
              <input type="number" value={form.port} onChange={(e) => setForm((p) => ({ ...p, port: Number(e.target.value) }))} className="input-field text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Database *</label>
              <input value={form.databaseName} onChange={(e) => setForm((p) => ({ ...p, databaseName: e.target.value }))} className="input-field text-sm" placeholder="my_database" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Username *</label>
              <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} className="input-field text-sm" placeholder="db_user" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Password {editingId ? '(leave blank to keep)' : '*'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="input-field text-sm" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input type="checkbox" checked={form.sslEnabled} onChange={(e) => setForm((p) => ({ ...p, sslEnabled: e.target.checked }))} className="text-primary-600" />
                Enable SSL
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSave} className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
            <button onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>
      ) : connections.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-gray-400 dark:text-slate-500">
          <Database className="h-10 w-10" />
          <p className="text-sm">No database connections yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div key={conn.id} className="card flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-500/10">
                  <Database className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-200">{conn.name}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Server className="h-3 w-3" /> {typeLabels[conn.type] || conn.type}</span>
                    <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {conn.host}:{conn.port}/{conn.databaseName}</span>
                    <span className="flex items-center gap-1">as {conn.username}</span>
                    {conn.sslEnabled && <span className="badge-info text-[10px]">SSL</span>}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => handleTest(conn.id)} disabled={testing === conn.id} className="btn-secondary text-xs">
                  {testing === conn.id ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plug className="h-3.5 w-3.5" />}
                  Test
                </button>
                <button onClick={() => handleEdit(conn)} className="btn-secondary text-xs">Edit</button>
                <button onClick={() => handleDelete(conn.id, conn.name)} className="btn-danger text-xs"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
