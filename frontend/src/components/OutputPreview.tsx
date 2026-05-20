import { useState } from 'react';
import { Copy, Download, Check, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import type { OutputFormat } from '../types';

interface OutputPreviewProps {
  output: string;
  format: OutputFormat;
  loading?: boolean;
}

export function OutputPreview({ output, format, loading }: OutputPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    const ext = format === 'txt' ? 'txt' : format;
    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      hl7: 'text/plain',
      pipe: 'text/plain',
      tab: 'text/plain',
      fixedwidth: 'text/plain',
    };
    const blob = new Blob([output], { type: mimeTypes[format] || 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output.${ext}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const lineCount = output ? output.split('\n').length : 0;

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400 dark:text-slate-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-slate-200">
            Output Preview
          </span>
          <span className="badge-neutral text-xs">{lineCount} lines</span>
          <span className="badge-info text-xs uppercase">{format}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="btn-secondary text-xs"
            disabled={!output}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="btn-primary text-xs"
            disabled={!output}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
      <div className="relative">
        <pre className="max-h-96 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900">
          <code className="text-gray-800 dark:text-slate-300">
            {output ? (
              output.split('\n').map((line, i) => (
                <div key={i} className="flex">
                  <span className="mr-4 w-8 shrink-0 text-right text-gray-400 dark:text-slate-600 select-none">
                    {i + 1}
                  </span>
                  <span className="whitespace-pre-wrap">{line}</span>
                </div>
              ))
            ) : (
              <span className="text-gray-400 dark:text-slate-500">
                No output to display. Generate a preview to see results here.
              </span>
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
