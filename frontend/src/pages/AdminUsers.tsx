import { useEffect, useState } from 'react';
import { Search, Shield, ShieldOff, UserCog, Trash2, X, Database, Bookmark, FileSpreadsheet, PlayCircle, Calendar } from 'lucide-react';
import { adminService } from '../services/admin.service';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { UserListItem } from '../types';
import toast from 'react-hot-toast';

export function AdminUsers() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    adminService.listUsers({ search: search || undefined, page, limit })
      .then((res) => {
        setUsers(res.data);
        setTotal(res.total);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const openEdit = (user: UserListItem) => {
    setEditTarget(user);
    setEditForm({ name: user.name, email: user.email, role: user.role });
  };

  const handleSave = async () => {
    if (!editTarget || !editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const updated = await adminService.updateUser(editTarget.id, editForm);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      toast.success('User updated');
      setEditTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deactivateUser(deleteTarget.id);
      setUsers((prev) => prev.map((u) => (u.id === deleteTarget.id ? { ...u, isActive: false } : u)));
      toast.success('User deactivated');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to deactivate user');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Manage all registered users — edit profiles, change roles, or deactivate accounts
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="input-field pl-9 text-sm"
            placeholder="Search by name or email..."
          />
        </div>
        <button onClick={handleSearch} className="btn-secondary text-sm">Search</button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>
      ) : users.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-gray-400 dark:text-slate-500">
          <ShieldOff className="h-10 w-10" />
          <p className="text-sm">No users found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Resources</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="bg-white hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-200">
                    {user.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                    {user.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {user.role === 'ADMIN' ? (
                      <span className="badge-info text-xs">ADMIN</span>
                    ) : (
                      <span className="badge text-xs">USER</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {user.isActive ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Files"><FileSpreadsheet className="h-3 w-3" />{user._count.uploadedFiles}</span>
                      <span className="flex items-center gap-1" title="Profiles"><Bookmark className="h-3 w-3" />{user._count.mappingProfiles}</span>
                      <span className="flex items-center gap-1" title="Jobs"><PlayCircle className="h-3 w-3" />{user._count.processingJobs}</span>
                      <span className="flex items-center gap-1" title="DB Connections"><Database className="h-3 w-3" />{user._count.databaseConnections}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(user.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="btn-secondary text-xs px-2 py-1"
                        title="Edit user"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                      </button>
                      {user.isActive && (
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="btn-danger text-xs px-2 py-1"
                          title="Deactivate user"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
          <span>{total} users total</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary text-xs"
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditTarget(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit User</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Email</label>
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                  className="input-field text-sm"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditTarget(null)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Deactivate User"
        message={`Deactivate "${deleteTarget?.name}"? They will lose access to the application. Their data will be preserved.`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
