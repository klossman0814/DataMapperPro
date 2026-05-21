import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Save, Play, Trash2, FileCode, Eye, BookTemplate, Variable, Braces, List } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { templatesService, Template } from '../services/templates.service';
import { profilesService } from '../services/profiles.service';
import toast from 'react-hot-toast';

const defaultTemplate = '{{mrn}}|{{last_name}}|{{first_name}}|{{dob}}|{{gender}}';

const libraryTemplates = [
  { name: 'JSON Output', content: '{\n  "record": {\n    "id": {{index}},\n    "value": "{{row.field}}"\n  }\n}' },
  { name: 'CSV Row', content: '{{row.field1}},{{row.field2}},{{row.field3}}' },
  { name: 'XML Element', content: '<record>\n  <field>{{row.field}}</field>\n  <index>{{index}}</index>\n</record>' },
  { name: 'HL7 Segment', content: 'MSH|^~\\&|{{row.sending_app}}|{{row.sending_facility}}|||{{timestamp}}||ADT^A01|{{id}}|P|2.3' },
];

export function TemplateEditorPage() {
  const { profileId } = useParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(profileId || '');
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState(defaultTemplate);
  const [previewOutput, setPreviewOutput] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    Promise.all([
      templatesService.list(1, 50).catch(() => ({ data: [] as Template[] })),
    ])
    .then(([res]) => setTemplates(res.data))
    .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      setLoading(true);
      templatesService.get(selectedTemplateId)
        .then((tpl) => {
          setTemplateName(tpl.name);
          setTemplateContent(tpl.content);
        })
        .catch(() => toast.error('Failed to load template'))
        .finally(() => setLoading(false));
    }
  }, [selectedTemplateId]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) setTemplateContent(value);
  }, []);

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Enter a template name');
      return;
    }
    setSaving(true);
    try {
      if (selectedTemplateId) {
        await templatesService.update(selectedTemplateId, {
          name: templateName,
          content: templateContent,
        });
        toast.success('Template updated');
      } else {
        const tpl = await templatesService.create({
          name: templateName,
          content: templateContent,
        });
        setSelectedTemplateId(tpl.id);
        setTemplates((prev) => [tpl, ...prev]);
        toast.success('Template created');
      }
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) return;
    setDeleting(true);
    try {
      await templatesService.delete(selectedTemplateId);
      setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplateId));
      setSelectedTemplateId('');
      setTemplateName('');
      setTemplateContent(defaultTemplate);
      setPreviewOutput('');
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  const handleRender = async () => {
    if (!selectedTemplateId) {
      toast.error('Save the template first');
      return;
    }
    try {
      const res = await templatesService.render(selectedTemplateId, {
        row: { source_field: 'sample_value', first_name: 'John', last_name: 'Doe' },
        index: 0,
      });
      setPreviewOutput(res.output);
      setShowPreview(true);
      toast.success('Template rendered');
    } catch {
      toast.error('Failed to render template');
    }
  };

  const loadFromLibrary = (content: string) => {
    setTemplateContent(content);
  };

  const syntaxHelpers = [
    { icon: Variable, label: '{{field}}', insert: '{{}}' },
    { icon: Braces, label: '{{#if}}', insert: '{{#if }}\n\n{{/if}}' },
    { icon: List, label: '{{#each}}', insert: '{{#each }}\n\n{{/each}}' },
  ];

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Template Editor</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">
            Create and manage output templates with Handlebars-style syntax
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button onClick={handleRender} className="btn-secondary">
            <Play className="h-4 w-4" />
            Render
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          {selectedTemplateId && (
            <button onClick={() => setShowDeleteDialog(true)} disabled={deleting} className="btn-danger">
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Template</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="input-field"
          >
            <option value="">Create New Template</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} v{tpl.version}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Template Name</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="input-field"
            placeholder="My Template"
          />
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr' }}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {syntaxHelpers.map((helper) => (
              <button
                key={helper.label}
                onClick={() => setTemplateContent((prev) => prev + '\n' + helper.insert)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <helper.icon className="h-3 w-3" />
                {helper.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
              <FileCode className="h-4 w-4 text-gray-400 dark:text-slate-400" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Template Content</span>
            </div>
            <Editor
              height="500px"
              defaultLanguage="handlebars"
              theme="vs-dark"
              value={templateContent}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>
        </div>

        {showPreview && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
                <Eye className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                <span className="text-sm text-gray-500 dark:text-slate-400">Output Preview</span>
              </div>
              <pre className="max-h-[460px] overflow-auto bg-white p-4 text-sm text-gray-800 dark:bg-slate-900 dark:text-slate-300 font-mono whitespace-pre-wrap">
                {previewOutput || 'Click Render to see output'}
              </pre>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Token Reference
              </h4>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-primary-50 px-2 py-1 text-xs font-mono text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                  {'{{row.field_name}}'}
                </span>
                <span className="rounded-md bg-primary-50 px-2 py-1 text-xs font-mono text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                  {'{{index}}'}
                </span>
                <span className="rounded-md bg-primary-50 px-2 py-1 text-xs font-mono text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                  {'{{#if}}...{{/if}}'}
                </span>
                <span className="rounded-md bg-primary-50 px-2 py-1 text-xs font-mono text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                  {'{{#each}}...{{/each}}'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center gap-2">
          <BookTemplate className="h-4 w-4 text-gray-400 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">Template Library</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {libraryTemplates.map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => loadFromLibrary(tpl.content)}
              className="rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-primary-500 dark:hover:bg-primary-500/10"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-slate-200">{tpl.name}</p>
              <p className="mt-1 truncate text-xs text-gray-400 dark:text-slate-500">{tpl.content}</p>
            </button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Template"
        message={`Delete template "${templateName}"? This action cannot be undone.`}
        loading={deleting}
        onConfirm={() => {
          handleDelete();
          setShowDeleteDialog(false);
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
