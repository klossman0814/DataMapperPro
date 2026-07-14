import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, FileText, Briefcase, Database, Tag, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { notesService } from '../services/notes.service';
import { jobsService } from '../services/jobs.service';
import { profilesService } from '../services/profiles.service';
import { filesService } from '../services/files.service';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Note, ProcessingJob, MappingProfile, UploadedFileInfo } from '../types';

const categoryIcons: Record<string, typeof FileText> = {
  general: FileText,
  job: Briefcase,
  profile: Tag,
  file: Database,
};

const categoryColors: Record<string, string> = {
  general: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  job: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  profile: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  file: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
};

const entityTypeLabels: Record<string, string> = {
  ProcessingJob: 'Job',
  MappingProfile: 'Profile',
  UploadedFile: 'File',
};

interface EntityOption {
  id: string;
  label: string;
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formEntityType, setFormEntityType] = useState('');
  const [formEntityId, setFormEntityId] = useState('');

  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const loadNotes = () => {
    setLoading(true);
    notesService.list(filterCategory ? { category: filterCategory } : undefined)
      .then(setNotes)
      .catch(() => toast.error('Failed to load notes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadNotes(); }, [filterCategory]);

  useEffect(() => {
    if (!formEntityType) { setEntityOptions([]); setFormEntityId(''); return; }
    setLoadingEntities(true);
    setFormEntityId('');
    const loader = formEntityType === 'ProcessingJob'
      ? jobsService.list(1, 100).then(r => r.data)
      : formEntityType === 'MappingProfile'
        ? profilesService.list(1, 100).then(r => r.data)
        : filesService.list(1, 100).then(r => r.data);

    loader
      .then((items: any[]) => setEntityOptions(
        items.map((item: any) => ({ id: item.id, label: item.originalName || item.name }))
      ))
      .catch(() => { setEntityOptions([]); toast.error('Failed to load entities'); })
      .finally(() => setLoadingEntities(false));
  }, [formEntityType]);

  const openCreate = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('general');
    setFormEntityType('');
    setFormEntityId('');
    setShowEditor(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormEntityType(note.entityType || '');
    setFormEntityId(note.entityId || '');
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        entityType: formEntityType || undefined,
        entityId: formEntityId || undefined,
      };
      if (editingNote) {
        await notesService.update(editingNote.id, payload);
        toast.success('Note updated');
      } else {
        await notesService.create(payload);
        toast.success('Note created');
      }
      setShowEditor(false);
      loadNotes();
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await notesService.delete(deleteId);
      toast.success('Note deleted');
      setDeleteId(null);
      loadNotes();
    } catch {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Manage notes for jobs, profiles, and files</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          New Note
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field pl-9"
          >
            <option value="">All Categories</option>
            <option value="general">General</option>
            <option value="job">Job</option>
            <option value="profile">Profile</option>
            <option value="file">File</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400 dark:text-slate-500">
          <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400 dark:text-slate-500">
          <FileText className="h-12 w-12" />
          <p className="text-lg font-medium">No notes yet</p>
          <p className="text-sm">Create a note to track important information.</p>
          <button onClick={openCreate} className="btn-primary mt-2">
            <Plus className="h-4 w-4" />
            Create Note
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => {
            const Icon = categoryIcons[note.category] || FileText;
            return (
              <div key={note.id} className="card group relative flex flex-col">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`rounded-lg p-1.5 ${categoryColors[note.category] || categoryColors.general}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-slate-200">
                      {note.title}
                    </h3>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(note)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(note.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mb-3 line-clamp-3 text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                  {note.content}
                </p>
                <div className="mt-auto flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColors[note.category] || categoryColors.general}`}>
                    <Icon className="h-3 w-3" />
                    {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                  </span>
                  {note.entityType && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                      {entityTypeLabels[note.entityType] || note.entityType}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-gray-400 dark:text-slate-500">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingNote ? 'Edit Note' : 'New Note'}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="input-field w-full"
                  placeholder="Note title"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Content</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="input-field w-full min-h-[120px] resize-y"
                  placeholder="Write your note here..."
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="general">General</option>
                    <option value="job">Job</option>
                    <option value="profile">Profile</option>
                    <option value="file">File</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Linked To</label>
                  <select
                    value={formEntityType}
                    onChange={(e) => setFormEntityType(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">None</option>
                    <option value="ProcessingJob">Job</option>
                    <option value="MappingProfile">Profile</option>
                    <option value="UploadedFile">File</option>
                  </select>
                </div>
              </div>
              {formEntityType && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Select {entityTypeLabels[formEntityType] || formEntityType}
                  </label>
                  <select
                    value={formEntityId}
                    onChange={(e) => setFormEntityId(e.target.value)}
                    className="input-field w-full"
                    disabled={loadingEntities}
                  >
                    <option value="">
                      {loadingEntities ? 'Loading...' : `Select a ${entityTypeLabels[formEntityType] || formEntityType}...`}
                    </option>
                    {entityOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700">
              <button onClick={() => setShowEditor(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editingNote ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
