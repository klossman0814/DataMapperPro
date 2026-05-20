import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  GitBranch,
  Plus,
  Trash2,
  Download,
  Upload,
  Copy,
  Search,
} from 'lucide-react';
import { profilesService } from '../services/profiles.service';
import type { MappingProfile } from '../types';
import toast from 'react-hot-toast';

export function SavedProfiles() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<MappingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    profilesService.list(1, 50)
      .then((res) => setProfiles(res.data))
      .catch(() => toast.error('Failed to load profiles'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this profile?')) return;
    try {
      await profilesService.delete(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast.success('Profile deleted');
    } catch {
      toast.error('Failed to delete profile');
    }
  };

  const handleClone = async (id: string) => {
    setCloningId(id);
    try {
      const cloned = await profilesService.clone(id);
      setProfiles((prev) => [cloned, ...prev]);
      toast.success('Profile cloned');
    } catch {
      toast.error('Failed to clone profile');
    } finally {
      setCloningId(null);
    }
  };

  const handleExport = async (id: string) => {
    try {
      const profile = await profilesService.export_(id);
      const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile.name.replace(/\s+/g, '_')}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Profile exported');
    } catch {
      toast.error('Failed to export profile');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const imported = await profilesService.import_(data);
        setProfiles((prev) => [imported, ...prev]);
        toast.success('Profile imported');
      } catch {
        toast.error('Failed to import profile');
      }
    };
    input.click();
  };

  const filteredProfiles = searchQuery
    ? profiles.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : profiles;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saved Profiles</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Manage your mapping profiles and templates</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleImport} className="btn-secondary">
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button onClick={() => navigate('/mapping')} className="btn-primary">
            <Plus className="h-4 w-4" />
            Create New Profile
          </button>
        </div>
      </div>

      {profiles.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
            placeholder="Search profiles..."
          />
        </div>
      )}

      {filteredProfiles.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-12">
          <Bookmark className="h-12 w-12 text-gray-400 dark:text-slate-500" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700 dark:text-slate-300">
              {searchQuery ? 'No profiles match your search' : 'No saved profiles'}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {searchQuery ? 'Try a different search term' : 'Create a mapping and save it as a reusable profile'}
            </p>
          </div>
          {!searchQuery && (
            <button onClick={() => navigate('/mapping')} className="btn-primary">
              <GitBranch className="h-4 w-4" />
              Create Mapping
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <div key={profile.id} className="card group relative">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-500/10">
                  <Bookmark className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{profile.name}</h3>
              {profile.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 line-clamp-2">{profile.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-slate-400">
                <span>v{profile.version}</span>
                <span>{profile.configurationJson?.mappings?.length ?? 0} mappings</span>
                <span>Updated {new Date(profile.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => navigate(`/mapping/${profile.id}`)}
                  className="btn-primary text-xs flex-1"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  Load
                </button>
                <button
                  onClick={() => handleClone(profile.id)}
                  disabled={cloningId === profile.id}
                  className="btn-secondary text-xs px-2"
                  title="Clone"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleExport(profile.id)}
                  className="btn-secondary text-xs px-2"
                  title="Export"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(profile.id)}
                  className="btn-danger text-xs px-2"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
