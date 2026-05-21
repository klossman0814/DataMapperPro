import { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Eye, FileCode, Braces, Variable, List, FileInput, X, Sparkles, GripVertical, ToggleLeft, ToggleRight, FunctionSquare, ChevronDown, ChevronRight } from 'lucide-react';
import type { ColumnInfo } from '../types';

interface SavedTemplate {
  id: string;
  name: string;
  content: string;
}

interface DraggableColumn {
  name: string;
  type: string;
  sampleValue?: any;
}

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  preview?: string;
  sourceColumns?: ColumnInfo[];
  templates?: SavedTemplate[];
  draggableColumns?: DraggableColumn[];
  liveOutput?: string;
  livePreviewEnabled?: boolean;
  onToggleLivePreview?: () => void;
}

const syntaxHelpers = [
  { label: '{{field}}', insert: '{{}}', description: 'Field reference' },
  { label: '{{#if}}', insert: '{{#if }}{{/if}}', description: 'Conditional' },
  { label: '{{#each}}', insert: '{{#each }}{{/each}}', description: 'Loop' },
];

export function TemplateEditor({
  value, onChange, preview, sourceColumns, templates,
  draggableColumns, liveOutput, livePreviewEnabled, onToggleLivePreview,
}: TemplateEditorProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [sampleText, setSampleText] = useState('');
  const [fieldName, setFieldName] = useState('');
  const sampleAreaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;
  }, []);

  const handleEditorChange = useCallback(
    (val: string | undefined) => {
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
    },
    [onChange]
  );

  const insertAtCursor = (template: string) => {
    const newValue = value + template;
    onChange(newValue);
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

  const applySample = () => {
    onChange(sampleText);
    setShowGenerator(false);
    setSampleText('');
    setFieldName('');
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

  const handleDragStart = (e: React.DragEvent, columnName: string) => {
    e.dataTransfer.setData('text/plain', `{{${columnName}}}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const token = e.dataTransfer.getData('text/plain');
    if (!token) return;
    const editor = editorRef.current;
    if (!editor) {
      insertAtCursor(token);
      return;
    }
    const position = editor.getPosition();
    editor.executeEdits('drop-field', [
      { range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column }, text: token },
    ]);
    editor.focus();
  };

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

  const hasLivePreview = livePreviewEnabled !== undefined && onToggleLivePreview !== undefined;
  const effectivePreview = (livePreviewEnabled && liveOutput) ? liveOutput : preview;

  const columns = draggableColumns || sourceColumns?.map(c => ({ name: c.name, type: c.type, sampleValue: (c.sampleValues?.[0]) })) || [];

  return (
    <>
      <div className="grid gap-6" style={{ gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr' }}>
        <div className="space-y-4">
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              {templates && templates.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const tpl = templates.find((t) => t.id === e.target.value);
                    if (tpl) onChange(tpl.content);
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
                      insertAtCursor(helper.insert);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
                >
                  {helper.label === '{{field}}' ? (
                    <Variable className="h-3 w-3" />
                  ) : helper.label === '{{#if}}' ? (
                    <Braces className="h-3 w-3" />
                  ) : (
                    <List className="h-3 w-3" />
                  )}
                  {helper.description}
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
                    insertAtCursor('Type text here');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <span className="font-mono font-bold text-xs">T</span>
                Text
              </button>
              <button
                onClick={() => setShowGenerator(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <FileInput className="h-3 w-3" />
                From Sample
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
              {hasLivePreview && (
                <button
                  onClick={onToggleLivePreview}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    livePreviewEnabled
                      ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400'
                      : 'border-gray-200 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {livePreviewEnabled ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                  Live Preview
                </button>
              )}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
              >
                <Eye className="h-3 w-3" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
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
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          {columns.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
                Drag columns into the template:
              </p>
              <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                {columns.map((col) => (
                  <div
                    key={col.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, col.name)}
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
                    className="inline-flex cursor-grab items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-mono text-primary-700 transition-colors hover:bg-primary-100 active:cursor-grabbing dark:bg-primary-500/10 dark:text-primary-400 dark:hover:bg-primary-500/20"
                    title={col.sampleValue !== undefined ? `Sample: ${col.sampleValue}` : col.type}
                  >
                    <GripVertical className="h-2.5 w-2.5 text-primary-400" />
                    {col.name}
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            ref={editorContainerRef}
            className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700"
            onDragOver={handleContainerDragOver}
            onDrop={handleContainerDrop}
          >
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
              <FileCode className="h-4 w-4 text-gray-400 dark:text-slate-400" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Template Content</span>
            </div>
            <Editor
              height="500px"
              defaultLanguage="handlebars"
              theme="vs-dark"
              value={value}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
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
                <Code className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                <span className="text-sm text-gray-500 dark:text-slate-400">Output Preview</span>
                {hasLivePreview && livePreviewEnabled && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Live
                  </span>
                )}
              </div>
              <pre className="overflow-auto bg-white p-4 text-sm text-gray-800 dark:bg-slate-900 dark:text-slate-300 font-mono whitespace-pre-wrap" style={{ minHeight: '400px', maxHeight: '600px' }}>
                {effectivePreview || (hasLivePreview && livePreviewEnabled ? (value ? 'Rendering...' : 'Enter a template to see output') : 'No preview available. Render the template to see output.')}
              </pre>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Available Tokens
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

              {sourceColumns && sourceColumns.length > 0 && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Source Columns <span className="text-xs text-gray-400">(click to insert token at cursor)</span>
                  </label>
                  <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                    {sourceColumns.map((col) => (
                      <button
                        key={col.name}
                        onClick={() => insertTokenAtCursor(col.name)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-mono text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-500/10 dark:text-primary-400 dark:hover:bg-primary-500/20"
                      >
                        {col.name}
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">{col.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <strong>Tip:</strong> Click <strong>Smart Tokenize</strong> to auto-detect field names and wrap them in
                {' '}<code>{'{{}}'}</code>. Then use <strong>Replace</strong> to fix any that should remain static text.
                Or click a source column name to insert a token at the cursor position.
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
    </>
  );
}
