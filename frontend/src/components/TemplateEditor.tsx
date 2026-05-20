import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Eye, FileCode, Braces, Variable, List } from 'lucide-react';

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  preview?: string;
}

const syntaxHelpers = [
  { label: '{{field}}', insert: '{{}}', description: 'Field reference' },
  { label: '{{#if}}', insert: '{{#if }}\n\n{{/if}}', description: 'Conditional' },
  { label: '{{#each}}', insert: '{{#each }}\n\n{{/each}}', description: 'Loop' },
];

export function TemplateEditor({ value, onChange, preview }: TemplateEditorProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
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
  );
}
