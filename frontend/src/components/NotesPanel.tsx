import { useState, useEffect } from 'react';
import { Plus, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { notesService } from '../services/notes.service';
import type { Note } from '../types';

interface NotesPanelProps {
  entityType: string;
  entityId: string;
  category?: string;
}

export function NotesPanel({ entityType, entityId, category }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNotes = () => {
    setLoading(true);
    notesService.list({ entityType, entityId })
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadNotes(); }, [entityType, entityId]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    try {
      await notesService.create({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: category || entityType.replace(/([A-Z])/g, ' $1').trim().toLowerCase(),
        entityType,
        entityId,
      });
      setNewTitle('');
      setNewContent('');
      setShowForm(false);
      toast.success('Note added');
      loadNotes();
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notesService.delete(id);
      toast.success('Note deleted');
      loadNotes();
    } catch {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
          Notes{notes.length > 0 && ` (${notes.length})`}
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'Add Note'}
        </button>
      </div>

      {showForm && (
        <div className="border-b border-gray-200 p-3 space-y-2 dark:border-slate-700">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input-field w-full text-sm"
            placeholder="Note title"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="input-field w-full min-h-[60px] text-sm resize-none"
            placeholder="Write your note..."
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary text-xs py-1">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-400 dark:text-slate-500">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-xs text-gray-400 dark:text-slate-500">
            <FileText className="h-5 w-5" />
            <p>No notes for this {entityType.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {notes.map((note) => (
              <div key={note.id} className="group px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 dark:text-slate-200">{note.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                      {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="shrink-0 rounded p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
