import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Save, Play, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TemplateEditorPanel } from '../components/TemplateEditorPanel';
import { templatesService, Template } from '../services/templates.service';
import { filesService } from '../services/files.service';
import { profilesService } from '../services/profiles.service';
import type { UploadedFileInfo, ColumnInfo, DatabaseConnection } from '../types';
import { databaseConnectionsService } from '../services/database-connections.service';
import toast from 'react-hot-toast';

const defaultTemplate = '{{mrn}}|{{last_name}}|{{first_name}}|{{dob}}|{{gender}}';

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

  const [sourceTab, setSourceTab] = useState<'file' | 'database'>('file');
  const [dbConnections, setDbConnections] = useState<DatabaseConnection[]>([]);
  const [dbConnectionId, setDbConnectionId] = useState(localStorage.getItem('templateEditorDbConnectionId') || '');
  const [querySql, setQuerySql] = useState(localStorage.getItem('templateEditorQuerySql') || '');
  const [dbQueryLoading, setDbQueryLoading] = useState(false);
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
      databaseConnectionsService.list().catch(() => [] as DatabaseConnection[]),
    ])
    .then(([tplRes, fileRes, dbConns]) => {
      setTemplates(tplRes.data);
      setUploadedFiles(fileRes.data || []);
      setDbConnections(dbConns as DatabaseConnection[]);
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
          const cfg = tpl.configurationJson;
          if (cfg) {
            if (cfg.sourceFileId) setSelectedFileId(cfg.sourceFileId);
            if (cfg.sourceTab) setSourceTab(cfg.sourceTab as 'file' | 'database');
            if (cfg.dbConnectionId) setDbConnectionId(cfg.dbConnectionId);
            if (cfg.querySql) setQuerySql(cfg.querySql);
          }
        })
        .catch(() => toast.error('Failed to load template'))
        .finally(() => setLoading(false));
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    if (sourceTab !== 'file' || !selectedFileId) {
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
  }, [selectedFileId, sourceTab]);

  const handleDbQuery = async () => {
    if (!dbConnectionId || !querySql.trim()) {
      toast.error('Select a connection and enter a SQL query');
      return;
    }
    setDbQueryLoading(true);
    try {
      const result = await databaseConnectionsService.query(dbConnectionId, querySql);
      setPreviewColumns(result.columns.map((c: any) => ({
        name: c.name, type: c.type, nullCount: 0, nullPercentage: 0, sampleValues: [],
      })));
      setPreviewRows(result.rows);
      setShowSourcePanel(true);
      setLivePreviewEnabled(true);
      toast.success(`Query returned ${result.rowCount} rows`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Query failed');
    } finally {
      setDbQueryLoading(false);
    }
  };

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
    localStorage.setItem('templateEditorDbConnectionId', dbConnectionId);
  }, [dbConnectionId]);

  useEffect(() => {
    localStorage.setItem('templateEditorQuerySql', querySql);
  }, [querySql]);

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
    const configuration = {
      sourceFileId: selectedFileId || undefined,
      sourceTab,
      dbConnectionId: dbConnectionId || undefined,
      querySql: querySql || undefined,
    };
    try {
      if (selectedTemplateId) {
        await templatesService.update(selectedTemplateId, {
          name: templateName,
          content: templateContent,
          configuration,
        });
        toast.success('Template updated');
      } else {
        const tpl = await templatesService.create({
          name: templateName,
          content: templateContent,
          configuration,
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-112px)] flex flex-col gap-6">
      <div className="shrink-0">
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

        <div className="grid gap-4 sm:grid-cols-2 mt-6">
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
      </div>

      <TemplateEditorPanel
        value={templateContent}
        onChange={setTemplateContent}
        sourceColumns={previewColumns}
        previewRows={previewRows}
        liveOutput={liveOutput}
        livePreviewEnabled={livePreviewEnabled}
        onToggleLivePreview={() => setLivePreviewEnabled(!livePreviewEnabled)}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onTemplateSelect={setSelectedTemplateId}
        files={uploadedFiles}
        selectedFileId={selectedFileId}
        onSelectedFileChange={setSelectedFileId}
        dbConnections={dbConnections}
        dbConnectionId={dbConnectionId}
        onDbConnectionChange={setDbConnectionId}
        querySql={querySql}
        onQuerySqlChange={setQuerySql}
        onRunDbQuery={handleDbQuery}
        dbQueryLoading={dbQueryLoading}
        sourceTab={sourceTab}
        onSourceTabChange={setSourceTab}
      />

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
