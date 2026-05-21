import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Save, Play, Trash2, FileCode, Eye, BookTemplate, Variable, Braces, List, GripVertical, PanelLeftClose, PanelLeft, ToggleLeft, ToggleRight, FunctionSquare, ChevronDown, ChevronRight, Wand2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FieldBuilder } from '../components/FieldBuilder';
import { templatesService, Template } from '../services/templates.service';
import { filesService } from '../services/files.service';
import { profilesService } from '../services/profiles.service';
import type { UploadedFileInfo, ColumnInfo } from '../types';
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
  const [selectedTemplateId, setSelectedTemplateId] = useState(profileId || localStorage.getItem('templateEditorTemplateId') || '');
  const [templateName, setTemplateName] = useState(localStorage.getItem('templateEditorName') || '');
  const [templateContent, setTemplateContent] = useState(localStorage.getItem('templateEditorContent') || defaultTemplate);
  const [previewOutput, setPreviewOutput] = useState('');
  const [showPreview, setShowPreview] = useState(() => localStorage.getItem('templateEditorShowPreview') !== 'false');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLibraryConfirm, setShowLibraryConfirm] = useState(false);
  const [pendingLibraryContent, setPendingLibraryContent] = useState('');
  const [pendingLibraryName, setPendingLibraryName] = useState('');
  const [showFieldBuilder, setShowFieldBuilder] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [selectedFileId, setSelectedFileId] = useState(localStorage.getItem('templateEditorFileId') || '');
  const [previewColumns, setPreviewColumns] = useState<ColumnInfo[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [showSourcePanel, setShowSourcePanel] = useState(() => localStorage.getItem('templateEditorShowSourcePanel') === 'true');
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(() => localStorage.getItem('templateEditorLivePreview') === 'true');
  const [liveOutput, setLiveOutput] = useState('');
  const [filesLoading, setFilesLoading] = useState(false);
  const editorRef = useRef<any>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [splitRatio, setSplitRatio] = useState(() => {
    const saved = localStorage.getItem('templateEditorSplitRatio');
    return saved ? parseFloat(saved) : 0.5;
  });
  const [isDragging, setIsDragging] = useState(false);
  const splitRatioRef = useRef(splitRatio);
  splitRatioRef.current = splitRatio;

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const container = splitContainerRef.current;
    if (!container) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = Math.max(0.2, Math.min(0.8, y / rect.height));
      setSplitRatio(ratio);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      localStorage.setItem('templateEditorSplitRatio', String(splitRatioRef.current));
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  useEffect(() => {
    Promise.all([
      templatesService.list(1, 50).catch(() => ({ data: [] as Template[] })),
      filesService.list(1, 50).catch(() => ({ data: [] })),
    ])
    .then(([tplRes, fileRes]) => {
      setTemplates(tplRes.data);
      setUploadedFiles(fileRes.data || []);
    })
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

  useEffect(() => {
    if (!selectedFileId) {
      setPreviewColumns([]);
      setPreviewRows([]);
      setShowSourcePanel(false);
      return;
    }
    setFilesLoading(true);
    Promise.all([
      filesService.getFile(selectedFileId),
      filesService.getPreview(selectedFileId, 1, 10),
    ])
      .then(([file, preview]) => {
        setPreviewColumns(file.columns || []);
        setPreviewRows(preview.rows || []);
        setShowSourcePanel(true);
        setLivePreviewEnabled(true);
      })
      .catch(() => toast.error('Failed to load file data'))
      .finally(() => setFilesLoading(false));
  }, [selectedFileId]);

  useEffect(() => {
    localStorage.setItem('templateEditorName', templateName);
  }, [templateName]);

  useEffect(() => {
    localStorage.setItem('templateEditorTemplateId', selectedTemplateId);
  }, [selectedTemplateId]);

  useEffect(() => {
    localStorage.setItem('templateEditorFileId', selectedFileId);
  }, [selectedFileId]);

  useEffect(() => {
    localStorage.setItem('templateEditorShowPreview', String(showPreview));
  }, [showPreview]);

  useEffect(() => {
    localStorage.setItem('templateEditorShowSourcePanel', String(showSourcePanel));
  }, [showSourcePanel]);

  useEffect(() => {
    localStorage.setItem('templateEditorLivePreview', String(livePreviewEnabled));
  }, [livePreviewEnabled]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('templateEditorContent', templateContent);
    }, 500);
    return () => clearTimeout(timer);
  }, [templateContent]);

  const doLiveRender = useCallback(async (template: string) => {
    if (!template.trim() || previewRows.length === 0) return;
    try {
      const res = await templatesService.renderInline(template, { row: previewRows[0], index: 0 });
      setLiveOutput(res.output);
    } catch {
      // silent fail for live preview
    }
  }, [previewRows]);

  useEffect(() => {
    if (!livePreviewEnabled || !templateContent.trim() || previewRows.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doLiveRender(templateContent);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [templateContent, livePreviewEnabled, previewRows, doLiveRender]);

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
    try {
      const row = previewRows.length > 0
        ? previewRows[0]
        : { source_field: 'sample_value', first_name: 'John', last_name: 'Doe' };
      if (selectedTemplateId) {
        const res = await templatesService.render(selectedTemplateId, { row, index: 0 });
        setPreviewOutput(res.output);
      } else {
        const res = await templatesService.renderInline(templateContent, { row, index: 0 });
        setPreviewOutput(res.output);
      }
      setShowPreview(true);
      toast.success('Template rendered');
    } catch {
      toast.error('Failed to render template');
    }
  };

  const loadFromLibrary = (content: string) => {
    setTemplateContent(content);
  };

  const dragColumns = previewColumns.map((c) => ({
    name: c.name,
    type: c.type,
    sampleValue: previewRows.length > 0 ? previewRows[0][c.name] : c.sampleValues?.[0],
  }));

  const [showTransforms, setShowTransforms] = useState(false);

  const transformGroups = [
    { category: 'Text', items: [
      { name: 'trim', syntax: 'trim(field)', description: 'Remove whitespace' },
      { name: 'upper', syntax: 'upper(field)', description: 'Convert to uppercase' },
      { name: 'lower', syntax: 'lower(field)', description: 'Convert to lowercase' },
      { name: 'substring', syntax: 'substring(field, start, end?)', description: 'Extract substring' },
      { name: 'replace', syntax: 'replace(field, search, replace)', description: 'Replace text' },
      { name: 'padStart', syntax: 'padStart(field, len, char?)', description: 'Pad start' },
      { name: 'padEnd', syntax: 'padEnd(field, len, char?)', description: 'Pad end' },
      { name: 'concat', syntax: 'concat(field, ...)', description: 'Concatenate values' },
    ]},
    { category: 'Date', items: [
      { name: 'formatDate', syntax: 'formatDate(field, pattern)', description: 'Format date (yyyyMMdd)' },
      { name: 'parseDate', syntax: 'parseDate(field)', description: 'Parse date string' },
    ]},
    { category: 'Number', items: [
      { name: 'round', syntax: 'round(field, decimals?)', description: 'Round number' },
      { name: 'formatNumber', syntax: 'formatNumber(field, format?)', description: 'Format number (0,0.00)' },
      { name: 'parseInt', syntax: 'parseInt(field)', description: 'Parse as integer' },
      { name: 'parseFloat', syntax: 'parseFloat(field)', description: 'Parse as float' },
    ]},
    { category: 'Logic', items: [
      { name: 'coalesce', syntax: 'coalesce(field, ...)', description: 'First non-null value' },
      { name: 'if', syntax: 'if(condition, val, else)', description: 'Conditional' },
      { name: 'case', syntax: 'case(val, match, out, ...)', description: 'Match cases' },
      { name: 'switch', syntax: 'switch(val, obj, default?)', description: 'Switch map' },
      { name: 'join', syntax: 'join(sep, field, ...)', description: 'Join non-empty values' },
    ]},
  ];

  const applyTransform = (funcName: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!model) return;
    let selectedText = model.getValueInRange(selection);
    if (selectedText) {
      selectedText = selectedText.replace(/^\{\{/, '').replace(/\}\}$/, '');
      const replacement = `{{${funcName}(${selectedText})}}`;
      editor.executeEdits('transform', [{ range: selection, text: replacement }]);
      editor.focus();
    } else {
      const pos = editor.getPosition();
      const text = `{{${funcName}()}}`;
      editor.executeEdits('transform', [{
        range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
        text,
      }]);
      editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column + funcName.length + 3 });
      editor.focus();
    }
  };

  const syntaxHelpers = [
    { icon: Variable, label: '{{field}}', insert: '{{}}' },
    { icon: Braces, label: '{{#if}}', insert: '{{#if }}{{/if}}' },
    { icon: List, label: '{{#each}}', insert: '{{#each }}{{/each}}' },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-112px)] flex flex-col gap-6">
      <div className="shrink-0 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Template Editor</h1>
            <p className="mt-1 text-gray-500 dark:text-slate-400">
              Create and manage output templates with Handlebars-style syntax
            </p>
          </div>
          <div className="flex gap-3">
            {previewRows.length > 0 && (
              <button
                onClick={() => setLivePreviewEnabled(!livePreviewEnabled)}
                className={`btn-secondary ${livePreviewEnabled ? 'ring-2 ring-primary-500' : ''}`}
              >
                {livePreviewEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                {livePreviewEnabled ? 'Live: On' : 'Live: Off'}
              </button>
            )}
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Import Data Source <span className="text-xs text-gray-400">(optional — for live preview and drag-and-drop)</span>
          </label>
          <div className="flex gap-2">
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="input-field flex-1"
            >
              <option value="">Select a file for preview data...</option>
              {uploadedFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.originalName} ({f.rowCount} rows)
                </option>
              ))}
            </select>
            {previewColumns.length > 0 && (
              <button
                onClick={() => setShowSourcePanel(!showSourcePanel)}
                className="btn-secondary shrink-0"
                title="Toggle source columns panel"
              >
                {showSourcePanel ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                Columns
              </button>
            )}
          </div>
          {filesLoading && (
            <p className="mt-1 text-xs text-gray-400">Loading file data...</p>
          )}
        </div>
      </div>

      <div className="max-h-[50vh] shrink-0 flex gap-4 overflow-hidden">
        {showSourcePanel && previewColumns.length > 0 && (
          <div className="w-64 shrink-0 flex flex-col">
            <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 shrink-0">
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                  Columns ({previewColumns.length})
                </span>
                <button
                  onClick={() => setShowSourcePanel(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-white p-2 dark:bg-slate-900">
                {previewColumns.map((col) => {
                  const sampleValue = previewRows.length > 0 ? previewRows[0][col.name] : col.sampleValues?.[0];
                  return (
                    <div
                      key={col.name}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', `{{${col.name}}}`);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onDoubleClick={() => {
                        const editor = editorRef.current;
                        const token = `{{${col.name}}}`;
                        if (editor) {
                          const pos = editor.getPosition();
                          editor.executeEdits('insert-field', [{
                            range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
                            text: token,
                          }]);
                          editor.focus();
                        } else {
                          setTemplateContent((prev) => prev + token);
                        }
                      }}
                      className="group cursor-grab rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-primary-50 active:cursor-grabbing dark:hover:bg-primary-500/10"
                    >
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-3 w-3 shrink-0 text-gray-300 group-hover:text-primary-400 dark:text-slate-600" />
                        <span className="font-mono font-medium text-gray-800 dark:text-slate-200">{col.name}</span>
                        <span className="ml-auto rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500 dark:bg-slate-800 dark:text-slate-400">{col.type}</span>
                      </div>
                      {sampleValue !== undefined && (
                        <p className="ml-4 truncate text-[10px] text-gray-400 dark:text-slate-500" title={String(sampleValue)}>
                          {String(sampleValue)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1 flex flex-col min-h-0">
          <div className="shrink-0 relative">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              {syntaxHelpers.map((helper) => (
                <button
                  key={helper.label}
                  onClick={() => {
                    const editor = editorRef.current;
                    if (editor) {
                      const pos = editor.getPosition();
                      editor.executeEdits('insert', [{
                        range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
                        text: helper.insert,
                      }]);
                      editor.focus();
                    } else {
                      setTemplateContent((prev) => prev + '\n' + helper.insert);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
                >
                  <helper.icon className="h-3 w-3" />
                  {helper.label}
                </button>
              ))}
              <button
                onClick={() => {
                  const editor = editorRef.current;
                  if (editor) {
                    const pos = editor.getPosition();
                    editor.executeEdits('insert-text', [{
                      range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
                      text: 'Type text here',
                    }]);
                    editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column + 14 });
                    editor.focus();
                  } else {
                    setTemplateContent((prev) => prev + 'Type text here');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <span className="font-mono font-bold text-xs">T</span>
                Text
              </button>
              <button
                onClick={() => setShowFieldBuilder(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <Wand2 className="h-3 w-3" />
                Field Builder
              </button>
              <button
                onClick={() => setShowTransforms(!showTransforms)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  showTransforms
                    ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-500/10 dark:text-purple-400'
                    : 'border-gray-200 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <FunctionSquare className="h-3 w-3" />
                Transforms
                {showTransforms ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            </div>

            {showTransforms && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTransforms(false)} />
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 max-h-64 overflow-y-auto">
                    {transformGroups.map((group) => (
                      <div key={group.category}>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                          {group.category}
                        </p>
                        <div className="space-y-1">
                          {group.items.map((fn) => (
                            <button
                              key={fn.name}
                              onClick={() => { applyTransform(fn.name); setShowTransforms(false); }}
                              className="group block w-full rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-purple-50 dark:hover:bg-purple-500/10"
                              title={fn.description}
                            >
                              <span className="font-mono font-medium text-gray-800 group-hover:text-purple-700 dark:text-slate-200 dark:group-hover:text-purple-400">
                                {fn.name}
                              </span>
                              <span className="ml-1 text-[10px] text-gray-400 dark:text-slate-500">{fn.syntax}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 border-t border-gray-100 pt-2 text-[10px] text-gray-400 dark:border-slate-700 dark:text-slate-500">
                    Select text in the editor and click a transform to wrap it. Example: <code className="rounded bg-gray-100 px-1 dark:bg-slate-700">{'{{upper(first_name)}}'}</code>
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden" ref={splitContainerRef}>
            <div className="flex flex-col min-h-0 overflow-hidden" style={{ height: `${splitRatio * 100}%` }}>
              <div
                className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const token = e.dataTransfer.getData('text/plain');
                  if (!token) return;
                  const editor = editorRef.current;
                  if (editor) {
                    const pos = editor.getPosition();
                    editor.executeEdits('drop-field', [
                      { range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, text: token },
                    ]);
                    editor.focus();
                  } else {
                    setTemplateContent((prev) => prev + token);
                  }
                }}
              >
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800 shrink-0">
                  <FileCode className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                  <span className="text-sm text-gray-500 dark:text-slate-400">Template Content</span>
                </div>
                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    defaultLanguage="handlebars"
                    theme="vs-dark"
                    value={templateContent}
                    onChange={handleEditorChange}
                    onMount={(editor) => { editorRef.current = editor; }}
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
            </div>

            <div
              className={`h-3 shrink-0 cursor-row-resize flex items-center justify-center transition-colors ${
                isDragging ? 'bg-primary-400' : 'bg-gray-300 hover:bg-primary-400 dark:bg-slate-600 dark:hover:bg-primary-500'
              }`}
              onMouseDown={handleDividerMouseDown}
            >
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-gray-500 dark:bg-slate-400" />
                <div className="h-1 w-1 rounded-full bg-gray-500 dark:bg-slate-400" />
                <div className="h-1 w-1 rounded-full bg-gray-500 dark:bg-slate-400" />
              </div>
            </div>

            {showPreview && (
              <div className="flex flex-col min-h-0 overflow-hidden" style={{ height: `${(1 - splitRatio) * 100}%` }}>
                <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col">
                  <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800 shrink-0">
                    <Eye className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                    <span className="text-sm text-gray-500 dark:text-slate-400">Output Preview</span>
                    {livePreviewEnabled && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Live
                      </span>
                    )}
                  </div>
                  <pre className="flex-1 overflow-auto bg-white p-4 text-sm text-gray-800 dark:bg-slate-900 dark:text-slate-300 font-mono whitespace-pre-wrap">
                    {livePreviewEnabled
                      ? (liveOutput || (templateContent.trim() ? 'Rendering...' : 'Enter a template to see output'))
                      : (previewOutput || 'Click Render to see output')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 space-y-6">
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <BookTemplate className="h-4 w-4 text-gray-400 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">Template Library</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {libraryTemplates.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => {
                  setPendingLibraryContent(tpl.content);
                  setPendingLibraryName(tpl.name);
                  setShowLibraryConfirm(true);
                }}
                className="rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-primary-500 dark:hover:bg-primary-500/10"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-slate-200">{tpl.name}</p>
                <p className="mt-1 truncate text-xs text-gray-400 dark:text-slate-500">{tpl.content}</p>
              </button>
            ))}
          </div>
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
      <ConfirmDialog
        open={showLibraryConfirm}
        title="Load Template Library Preset"
        message={`Load "${pendingLibraryName}"? This will replace your current template content.`}
        confirmLabel="Load"
        variant="warning"
        onConfirm={() => {
          loadFromLibrary(pendingLibraryContent);
          setShowLibraryConfirm(false);
        }}
        onCancel={() => setShowLibraryConfirm(false)}
      />
      <FieldBuilder
        open={showFieldBuilder}
        sourceColumns={previewColumns}
        onInsert={(expression) => {
          const editor = editorRef.current;
          if (editor) {
            const pos = editor.getPosition();
            editor.executeEdits('field-builder', [{
              range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column },
              text: expression,
            }]);
            editor.focus();
          } else {
            setTemplateContent((prev) => prev + expression);
          }
        }}
        onClose={() => setShowFieldBuilder(false)}
      />
    </div>
  );
}
