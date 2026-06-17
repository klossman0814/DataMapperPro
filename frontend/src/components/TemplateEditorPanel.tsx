import { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  FileCode, Eye, Braces, Variable, List, FileInput, X, Sparkles, GripVertical,
  ToggleLeft, ToggleRight, FunctionSquare, ChevronDown, ChevronRight, Wand2,
  BookTemplate, PanelLeftClose, PanelLeft, FileCode as FileCodeIcon, Database, Play,
} from 'lucide-react';
import type { ColumnInfo, UploadedFileInfo, DatabaseConnection } from '../types';
import { FieldBuilder } from './FieldBuilder';
import { ConfirmDialog } from './ConfirmDialog';

interface SavedTemplate {
  id: string;
  name: string;
  content: string;
}

interface TemplateEditorPanelProps {
  value: string;
  onChange: (value: string) => void;
  sourceColumns: ColumnInfo[];
  previewRows: Record<string, any>[];
  liveOutput: string;
  livePreviewEnabled: boolean;
  onToggleLivePreview: () => void;
  templates: SavedTemplate[];
  selectedTemplateId: string;
  onTemplateSelect: (id: string) => void;
  files: UploadedFileInfo[];
  selectedFileId: string;
  onSelectedFileChange: (id: string) => void;
  dbConnections: DatabaseConnection[];
  dbConnectionId: string;
  onDbConnectionChange: (id: string) => void;
  querySql: string;
  onQuerySqlChange: (sql: string) => void;
  onRunDbQuery: () => void;
  dbQueryLoading: boolean;
  sourceTab: 'file' | 'database';
  onSourceTabChange: (tab: 'file' | 'database') => void;
  onRender?: () => void;
}

const syntaxHelpers = [
  { icon: Variable, label: '{{field}}', insert: '{{}}' },
  { icon: Braces, label: '{{#if}}', insert: '{{#if }}{{/if}}' },
  { icon: List, label: '{{#each}}', insert: '{{#each }}{{/each}}' },
];

const libraryTemplates = [
  { name: 'JSON Output', content: '{\n  "record": {\n    "id": {{index}},\n    "value": "{{row.field}}"\n  }\n}' },
  { name: 'CSV Row', content: '{{row.field1}},{{row.field2}},{{row.field3}}' },
  { name: 'XML Element', content: '<record>\n  <field>{{row.field}}</field>\n  <index>{{index}}</index>\n</record>' },
  { name: 'HL7 Segment', content: 'MSH|^~\\&|{{row.sending_app}}|{{row.sending_facility}}|||{{timestamp}}||ADT^A01|{{id}}|P|2.3' },
];

export function TemplateEditorPanel({
  value, onChange, sourceColumns, previewRows,
  liveOutput, livePreviewEnabled, onToggleLivePreview,
  templates, selectedTemplateId, onTemplateSelect,
  files, selectedFileId, onSelectedFileChange,
  dbConnections, dbConnectionId, onDbConnectionChange,
  querySql, onQuerySqlChange, onRunDbQuery, dbQueryLoading,
  sourceTab, onSourceTabChange, onRender,
}: TemplateEditorPanelProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [showTransforms, setShowTransforms] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showFieldBuilder, setShowFieldBuilder] = useState(false);
  const [showLibraryConfirm, setShowLibraryConfirm] = useState(false);
  const [pendingLibraryContent, setPendingLibraryContent] = useState('');
  const [pendingLibraryName, setPendingLibraryName] = useState('');
  const [sampleText, setSampleText] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const editorRef = useRef<any>(null);
  const sampleAreaRef = useRef<HTMLTextAreaElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [splitRatio, setSplitRatio] = useState(0.6);
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

  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;
  }, []);

  const handleEditorChange = useCallback((val: string | undefined) => {
    if (val !== undefined) {
      onChange(val);
      setError(null);
      try {
        const braceCount = (val.match(/{{/g) || []).length;
        const closeCount = (val.match(/}}/g) || []).length;
        if (braceCount !== closeCount) {
          setError(`Unmatched braces: ${braceCount} opening, ${closeCount} closing`);
        }
      } catch {
        setError('Syntax validation error');
      }
    }
  }, [onChange]);

  const insertAtCursor = (text: string) => {
    onChange(value + text);
  };

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

  const insertTokenAtCursor = (token: string) => {
    const ta = sampleAreaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = sampleText.substring(0, start);
    const after = sampleText.substring(end);
    const inserted = `{{${token}}}`;
    setSampleText(before + inserted + after);
    requestAnimationFrame(() => {
      const pos = start + inserted.length;
      ta.selectionStart = pos;
      ta.selectionEnd = pos;
      ta.focus();
    });
  };

  const replaceSelectedWithToken = () => {
    const ta = sampleAreaRef.current;
    if (!ta || !fieldName.trim()) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      insertTokenAtCursor(fieldName.trim());
      return;
    }
    const before = sampleText.substring(0, start);
    const after = sampleText.substring(end);
    const inserted = `{{${fieldName.trim()}}}`;
    setSampleText(before + inserted + after);
    setFieldName('');
    requestAnimationFrame(() => {
      const pos = start + inserted.length;
      ta.selectionStart = pos;
      ta.selectionEnd = pos;
      ta.focus();
    });
  };

  const smartTokenize = () => {
    const delimiters = /([|,^~&;:\s!@#$%()\/\\-]+)/;
    const parts = sampleText.split(delimiters);
    const tokenized = parts.map((part) => {
      if (delimiters.test(part)) return part;
      if (!part.trim()) return part;
      return `{{${part.trim()}}}`;
    });
    setSampleText(tokenized.join(''));
  };

  const applySample = () => {
    onChange(sampleText);
    setShowGenerator(false);
    setSampleText('');
    setFieldName('');
  };

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

  const effectivePreview = (livePreviewEnabled && liveOutput) ? liveOutput : '';

  return (
    <div className="min-h-0 flex-1 flex flex-col gap-4 overflow-hidden">
      {/* Import Data Source */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
          Import Data Source <span className="text-xs text-gray-400">(optional — for live preview and drag-and-drop)</span>
        </label>
        <div className="flex gap-1 mb-2 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => onSourceTabChange('file')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              sourceTab === 'file'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileCodeIcon className="mr-1 inline h-3.5 w-3.5" />
            File
          </button>
          <button
            onClick={() => onSourceTabChange('database')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              sourceTab === 'database'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Database className="mr-1 inline h-3.5 w-3.5" />
            Database
          </button>
        </div>

        {sourceTab === 'file' ? (
          <div className="flex gap-2">
            <select
              value={selectedFileId}
              onChange={(e) => onSelectedFileChange(e.target.value)}
              className="input-field flex-1"
            >
              <option value="">Select a file for preview data...</option>
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.originalName} ({f.rowCount} rows)
                </option>
              ))}
            </select>
            {sourceColumns.length > 0 && (
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
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={dbConnectionId}
                onChange={(e) => onDbConnectionChange(e.target.value)}
                className="input-field flex-1 text-sm"
              >
                <option value="">Select a database connection...</option>
                {dbConnections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.host})</option>
                ))}
              </select>
              <button
                onClick={onRunDbQuery}
                disabled={dbQueryLoading || !dbConnectionId || !querySql.trim()}
                className="btn-secondary whitespace-nowrap text-xs"
              >
                {dbQueryLoading ? 'Running...' : 'Run Query'}
              </button>
            </div>
            <textarea
              value={querySql}
              onChange={(e) => onQuerySqlChange(e.target.value)}
              className="input-field w-full font-mono text-xs"
              rows={3}
              placeholder="SELECT * FROM my_table LIMIT 10"
            />
            {sourceColumns.length > 0 && (
              <button
                onClick={() => setShowSourcePanel(!showSourcePanel)}
                className="btn-secondary text-xs"
              >
                {showSourcePanel ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
                Columns ({sourceColumns.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editor + Source Columns Panel */}
      <div className="min-h-0 flex-1 flex gap-4 overflow-hidden">
        {showSourcePanel && sourceColumns.length > 0 && (
          <div className="w-64 shrink-0">
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col max-h-[50vh]">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 shrink-0">
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                  Columns ({sourceColumns.length})
                </span>
                <button
                  onClick={() => setShowSourcePanel(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 bg-white p-2 dark:bg-slate-900">
                {sourceColumns.map((col) => {
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
                          onChange(value + token);
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

        {/* Editor + Preview Split Pane */}
        <div className="min-w-0 flex-1 flex flex-col min-h-0">
          <div className="shrink-0 relative">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              {templates.length > 0 && (
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const tpl = templates.find((t) => t.id === e.target.value);
                    if (tpl) {
                      onChange(tpl.content);
                      onTemplateSelect(tpl.id);
                    }
                  }}
                  className="input-field w-48 text-xs"
                >
                  <option value="">Load saved template...</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              )}
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
                      onChange(value + '\n' + helper.insert);
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
                    onChange(value + 'Type text here');
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
              <button
                onClick={() => onChange(value + ',')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <span className="font-mono font-bold text-xs">,</span>
                Comma
              </button>
              <button
                onClick={() => onChange(value + '|')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <span className="font-mono font-bold text-xs">|</span>
                Pipe
              </button>
              {onRender && (
                <button
                  onClick={onRender}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
                >
                  <Play className="h-3 w-3" />
                  Render
                </button>
              )}
              {previewRows.length > 0 && (
                <button
                  onClick={onToggleLivePreview}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    livePreviewEnabled
                      ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400'
                      : 'border-gray-200 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {livePreviewEnabled ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                  {livePreviewEnabled ? 'Live: On' : 'Live: Off'}
                </button>
              )}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
              >
                <Eye className="h-3 w-3" />
                {showPreview ? 'Hide Preview' : 'Preview'}
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

          {error && (
            <div className="mb-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

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
                    onChange(value + token);
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
                    value={value}
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
                    {effectivePreview || (livePreviewEnabled ? (value ? 'Rendering...' : 'Enter a template to see output') : 'No preview available. Render the template to see output.')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Library */}
      <div className="card shrink-0">
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

      {/* Token Reference */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50 shrink-0">
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

      {/* From Sample Modal */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Template from Sample</h2>
              </div>
              <button
                onClick={() => { setShowGenerator(false); setSampleText(''); setFieldName(''); }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
                Paste a sample output from your vendor below. Click <strong>Smart Tokenize</strong> to
                auto-wrap values in <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-slate-700">{'{{field}}'}</code>{' '}
                tokens, or select text and use <strong>Replace</strong> to manually create tokens.
              </p>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Vendor Sample Output
                </label>
                <textarea
                  ref={sampleAreaRef}
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  className="input-field min-h-[200px] w-full font-mono text-sm"
                  placeholder={`Paste vendor sample here, for example:\n\nMSH|^~\\&|App|Facility|||202401010000||ADT^A01|||2.5.1\nPID|||12345||Doe^John||19800101|M`}
                />
              </div>

              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={smartTokenize}
                  disabled={!sampleText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:border-purple-300 hover:bg-purple-50 dark:border-purple-500/30 dark:bg-slate-800 dark:text-purple-400 dark:hover:border-purple-500/50 dark:hover:bg-purple-500/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Smart Tokenize
                </button>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  Auto-detects field names and wraps them in <code className="rounded bg-gray-100 px-1 dark:bg-slate-700">{'{{}}'}</code>
                </span>
              </div>

              <div className="mb-4 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') replaceSelectedWithToken(); }}
                    className="input-field w-full"
                    placeholder="Enter field name"
                  />
                </div>
                <button
                  onClick={replaceSelectedWithToken}
                  disabled={!fieldName.trim()}
                  className="btn-primary mb-0.5"
                >
                  <Sparkles className="h-4 w-4" />
                  Replace
                </button>
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <strong>Tip:</strong> Click <strong>Smart Tokenize</strong> to auto-detect field names and wrap them in
                {' '}<code>{'{{}}'}</code>. Then use <strong>Replace</strong> to fix any that should remain static text.
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700">
              <button
                onClick={() => { setShowGenerator(false); setSampleText(''); setFieldName(''); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={applySample} disabled={!sampleText.trim()} className="btn-primary">
                Use as Template
              </button>
            </div>
          </div>
        </div>
      )}

      <FieldBuilder
        open={showFieldBuilder}
        sourceColumns={sourceColumns}
        previewRow={previewRows[0]}
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
            onChange(value + expression);
          }
        }}
        onClose={() => setShowFieldBuilder(false)}
      />

      <ConfirmDialog
        open={showLibraryConfirm}
        title="Load Template Library Preset"
        message={`Load "${pendingLibraryName}"? This will replace your current template content.`}
        confirmLabel="Load"
        variant="warning"
        onConfirm={() => {
          onChange(pendingLibraryContent);
          setShowLibraryConfirm(false);
        }}
        onCancel={() => setShowLibraryConfirm(false)}
      />
    </div>
  );
}
