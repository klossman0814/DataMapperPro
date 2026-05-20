import { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Eye, FileCode, Braces, Variable, List, FileInput, Wand2, X } from 'lucide-react';
import type { ColumnInfo } from '../types';

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  preview?: string;
  sourceColumns?: ColumnInfo[];
}

const syntaxHelpers = [
  { label: '{{field}}', insert: '{{}}', description: 'Field reference' },
  { label: '{{#if}}', insert: '{{#if }}\n\n{{/if}}', description: 'Conditional' },
  { label: '{{#each}}', insert: '{{#each }}\n\n{{/each}}', description: 'Loop' },
];

export function TemplateEditor({ value, onChange, preview, sourceColumns }: TemplateEditorProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [sampleText, setSampleText] = useState('');
  const [fieldName, setFieldName] = useState('');
  const sampleAreaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <>
      <div className="grid gap-6" style={{ gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr' }}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {syntaxHelpers.map((helper) => (
              <button
                key={helper.label}
                onClick={() => insertAtCursor(helper.insert)}
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
              onClick={() => setShowGenerator(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
            >
              <FileInput className="h-3 w-3" />
              From Sample
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
            >
              <Eye className="h-3 w-3" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
              <FileCode className="h-4 w-4 text-gray-400 dark:text-slate-400" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Template Content</span>
            </div>
            <Editor
              height="400px"
              defaultLanguage="handlebars"
              theme="vs-dark"
              value={value}
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
                <Code className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                <span className="text-sm text-gray-500 dark:text-slate-400">Output Preview</span>
              </div>
              <pre className="max-h-[460px] overflow-auto bg-white p-4 text-sm text-gray-800 dark:bg-slate-900 dark:text-slate-300 font-mono whitespace-pre-wrap">
                {preview || 'No preview available. Render the template to see output.'}
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
                <Wand2 className="h-5 w-5 text-primary-500" />
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
                Paste a sample output from your vendor below, then replace hardcoded values with
                {' '}<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-slate-700">{'{{field}}'}</code>{' '}
                tokens. Select text in the sample, type a field name, and click <strong>Replace</strong>.
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
                  <Wand2 className="h-4 w-4" />
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
                <strong>Tip:</strong> Select any text in the sample above, type a field name, and click
                {' '}<strong>Replace</strong> to turn it into a <code>{'{{field_name}}'}</code> token.
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
