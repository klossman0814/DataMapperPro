import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, GitCompare, AlertTriangle, Download,
  CheckCircle2, XCircle, PlusCircle, MinusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { filesService } from '../services/files.service';
import { diffService } from '../services/diff.service';
import { computeLineDiff } from '../utils/text-diff';
import type {
  UploadedFileInfo, DiffComparison, DiffLine, RowDiff,
} from '../types';

type Tab = 'files' | 'text';

const FILTER_OPTIONS: { key: RowDiff['type'] | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'added', label: 'Added' },
  { key: 'removed', label: 'Removed' },
  { key: 'changed', label: 'Changed' },
];

function FileDropzone({ label, onFile, fileInfo, onClear }: {
  label: string; onFile: (f: UploadedFileInfo) => void;
  fileInfo: UploadedFileInfo | null; onClear: () => void;
}) {
  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    try {
      const result = await filesService.upload(f) as unknown as UploadedFileInfo;
      onFile(result);
      toast.success(`${label}: ${result.originalName} uploaded`);
    } catch {
      toast.error(`Failed to upload ${label}`);
    }
  }, [label, onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xls'] },
    maxFiles: 1, multiple: false,
  });

  if (fileInfo) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-900/20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-200">{fileInfo.originalName}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {fileInfo.rowCount.toLocaleString()} rows &middot; {fileInfo.columns?.length || 0} columns
              </p>
            </div>
          </div>
          <button onClick={onClear} className="text-xs text-gray-400 hover:text-red-500">&times;</button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragActive
          ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-slate-600 dark:bg-slate-800/30 dark:hover:border-slate-500'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-8 w-8 text-gray-400 dark:text-slate-500" />
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
        {isDragActive ? `Drop ${label} here...` : `Drop ${label} or click to browse`}
      </p>
      <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">CSV or XLSX</p>
    </div>
  );
}

function DiffTable({ result, filter, columns }: {
  result: DiffComparison; filter: RowDiff['type'] | 'all'; columns: string[];
}) {
  const rows = filter === 'all' ? result.rowDiffs : result.rowDiffs.filter(r => r.type === filter);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No rows match the current filter</p>;
  }

  return (
    <div className="overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-50 dark:bg-slate-800/50">
          <tr>
            <th className="px-3 py-2 font-medium text-gray-500">Type</th>
            <th className="px-3 py-2 font-medium text-gray-500">Key</th>
            {columns.slice(0, 6).map(col => (
              <th key={col} className="px-3 py-2 font-medium text-gray-500">{col}</th>
            ))}
            {columns.length > 6 && (
              <th className="px-3 py-2 font-medium text-gray-500">+{columns.length - 6} more</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
          {rows.map((r, i) => {
            const rowData = r.row2 || r.row1 || {};
            const isChanged = r.type === 'changed';
            const displayKey = r.key || rowData[result.keyColumn || ''] || '';
            const changedFields = new Set(r.fields?.map(f => f.field) || []);

            const rowBg = r.type === 'added' ? 'bg-emerald-50/60 dark:bg-emerald-900/10' :
              r.type === 'removed' ? 'bg-red-50/60 dark:bg-red-900/10' :
              r.type === 'changed' ? 'bg-amber-50/60 dark:bg-amber-900/10' : '';

            const badge = r.type === 'added' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
              r.type === 'removed' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
              r.type === 'changed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
              'bg-gray-100 text-gray-500 dark:bg-slate-500/10 dark:text-slate-400';

            return (
              <tr key={i} className={`${rowBg} ${isChanged ? 'ring-1 ring-inset ring-amber-200 dark:ring-amber-800/40' : ''}`}>
                <td className="px-3 py-1.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge}`}>
                  {r.type === 'added' ? <PlusCircle className="h-3 w-3" /> :
                   r.type === 'removed' ? <MinusCircle className="h-3 w-3" /> :
                   r.type === 'changed' ? <AlertTriangle className="h-3 w-3" /> :
                   <CheckCircle2 className="h-3 w-3" />}
                  {r.type}
                </span></td>
                <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-slate-300">{displayKey}</td>
                {columns.slice(0, 6).map(col => {
                  const val = isChanged && changedFields.has(col) ? (
                    <span key={col}>
                      <span className="text-red-500 line-through">{String(r.row1?.[col] ?? '')}</span>
                      {' '}
                      <span className="text-emerald-600">{String(r.row2?.[col] ?? '')}</span>
                    </span>
                  ) : (
                    String(rowData[col] ?? '')
                  );
                  return <td key={col} className="px-3 py-1.5 font-mono text-gray-600 dark:text-slate-400">{val}</td>;
                })}
                {columns.length > 6 && (
                  <td className="px-3 py-1.5 text-gray-400">{columns.length - 6} more</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TextDiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="overflow-auto rounded-lg border border-gray-200 font-mono text-xs dark:border-slate-700">
      {lines.map((line, i) => {
        const bg = line.type === 'added' ? 'bg-emerald-50 dark:bg-emerald-900/15' :
          line.type === 'removed' ? 'bg-red-50 dark:bg-red-900/15' : '';
        const textColor = line.type === 'added' ? 'text-emerald-800 dark:text-emerald-300' :
          line.type === 'removed' ? 'text-red-800 dark:text-red-300' : 'text-gray-700 dark:text-slate-300';
        const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
        const lineNum = `${(line.line1 ?? line.line2 ?? '').toString().padStart(4)}`;

        return (
          <div key={i} className={`flex ${bg}`}>
            <span className="w-12 shrink-0 select-none border-r border-gray-200 py-0.5 pr-2 text-right text-gray-400 dark:border-slate-700 dark:text-slate-600">
              {lineNum}
            </span>
            <span className={`flex-1 whitespace-pre-wrap break-all py-0.5 pl-3 ${textColor}`}>
              <span className="select-none text-gray-400 dark:text-slate-600">{prefix} </span>
              {line.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function downloadReportHtml(result: DiffComparison) {
  const rowsHtml = result.rowDiffs.map(r => {
    const rowData = r.row2 || r.row1 || {};
    const changedFields = new Set(r.fields?.map(f => f.field) || []);
    const cells = result.columns.slice(0, 8).map(col => {
      if (r.type === 'changed' && changedFields.has(col)) {
        return `<td style="background:#fef3c7">${String(r.row1?.[col] ?? '')} &rarr; ${String(r.row2?.[col] ?? '')}</td>`;
      }
      return `<td>${String(rowData[col] ?? '')}</td>`;
    }).join('');
    return `<tr style="background:${
      r.type === 'added' ? '#f0fdf4' : r.type === 'removed' ? '#fef2f2' : r.type === 'changed' ? '#fffbeb' : ''
    }"><td style="padding:4px 8px;font-size:11px"><strong>${r.type}</strong></td><td style="padding:4px 8px;font-size:11px;font-family:monospace">${r.key}</td>${cells}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Diff Report</title>
<style>body{font-family:system-ui,sans-serif;background:#f3f4f6;padding:32px;color:#111}.report{max-width:1200px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden}.header{padding:24px 32px;border-bottom:1px solid #e5e7eb}.header h1{margin:0;font-size:20px}.summary{display:flex;gap:12px;padding:20px 32px}.summary-card{text-align:center;padding:12px 24px;border:1px solid #e5e7eb;border-radius:8px;flex:1}.summary-card .val{font-size:24px;font-weight:700}.summary-card .lbl{font-size:11px;color:#6b7280;text-transform:uppercase}.section{padding:0 32px 24px}table{width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e5e7eb}th{padding:6px 8px;background:#f9fafb;text-align:left;font-weight:600;color:#6b7280}td{padding:4px 8px;border-top:1px solid #e5e7eb;font-family:monospace;font-size:11px}.footer{padding:12px 32px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb}
</style></head><body>
<div class="report">
<div class="header"><h1>Diff Report</h1>
<p style="color:#6b7280;font-size:13px">${result.file1.name} vs ${result.file2.name}</p></div>
<div class="summary">
<div class="summary-card"><div class="val" style="color:#059669">+${result.summary.added}</div><div class="lbl">Added</div></div>
<div class="summary-card"><div class="val" style="color:#dc2626">-${result.summary.removed}</div><div class="lbl">Removed</div></div>
<div class="summary-card"><div class="val" style="color:#d97706">~${result.summary.changed}</div><div class="lbl">Changed</div></div>
<div class="summary-card"><div class="val">${result.summary.unchanged}</div><div class="lbl">Unchanged</div></div>
</div>
<div class="section"><table><thead><tr><th>Type</th><th>Key</th>${result.columns.slice(0,8).map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></div>
<div class="footer">Generated by DataMapper Pro Diff Checker</div>
</div></body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diff_report_${result.file1.name.replace(/\.[^.]+$/, '')}_vs_${result.file2.name.replace(/\.[^.]+$/, '')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function DiffChecker() {
  const [tab, setTab] = useState<Tab>('files');

  const [file1, setFile1] = useState<UploadedFileInfo | null>(null);
  const [file2, setFile2] = useState<UploadedFileInfo | null>(null);
  const [keyColumn, setKeyColumn] = useState('');
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<DiffComparison | null>(null);
  const [filter, setFilter] = useState<RowDiff['type'] | 'all'>('all');

  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [diffLines, setDiffLines] = useState<DiffLine[] | null>(null);

  const columns = file1?.columns?.map(c => c.name) || [];

  useEffect(() => {
    if (columns.length > 0 && !keyColumn) {
      setKeyColumn(columns[0]);
    }
  }, [columns, keyColumn]);

  const handleCompare = async () => {
    if (!file1 || !file2) { toast.error('Upload both files first'); return; }
    setComparing(true);
    setResult(null);
    try {
      const res = await diffService.compare(file1.id, file2.id, keyColumn || undefined);
      setResult(res);
      toast.success(`Diff complete: ${res.summary.changed} changed, ${res.summary.added} added, ${res.summary.removed} removed`);
    } catch {
      toast.error('Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  const handleTextCompare = () => {
    if (!text1.trim() && !text2.trim()) { toast.error('Enter text in at least one field'); return; }
    const lines = computeLineDiff(text1, text2);
    setDiffLines(lines);
    const added = lines.filter(l => l.type === 'added').length;
    const removed = lines.filter(l => l.type === 'removed').length;
    toast.success(`${added} additions, ${removed} deletions`);
  };

  const summaryStats = result ? [
    { label: 'Added', value: result.summary.added, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
    { label: 'Removed', value: result.summary.removed, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
    { label: 'Changed', value: result.summary.changed, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    { label: 'Unchanged', value: result.summary.unchanged, color: 'text-gray-600 dark:text-slate-400', bg: 'bg-gray-50 dark:bg-slate-800/30', border: 'border-gray-200 dark:border-slate-700' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Diff Checker</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Compare files and text to find differences</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-slate-700 dark:bg-slate-800/50">
        <button
          onClick={() => setTab('files')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'files'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
              : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" /> Compare Files
        </button>
        <button
          onClick={() => setTab('text')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'text'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
              : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <GitCompare className="h-4 w-4" /> Compare Text
        </button>
      </div>

      {tab === 'files' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FileDropzone label="File A" onFile={setFile1} fileInfo={file1} onClear={() => { setFile1(null); setResult(null); }} />
            <FileDropzone label="File B" onFile={setFile2} fileInfo={file2} onClear={() => { setFile2(null); setResult(null); }} />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Key Column (for row matching)</label>
              <select
                value={keyColumn}
                onChange={e => setKeyColumn(e.target.value)}
                className="input-field text-sm"
                disabled={columns.length === 0}
              >
                {columns.length === 0 && <option value="">No columns available</option>}
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
            <button
              onClick={handleCompare}
              disabled={!file1 || !file2 || comparing}
              className="btn-primary text-sm"
            >
              {comparing ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Comparing...</>
              ) : (
                <><GitCompare className="h-4 w-4" /> Compare Files</>
              )}
            </button>
          </div>

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {summaryStats.map(s => (
                  <div key={s.label} className={`rounded-lg border ${s.border} ${s.bg} p-3 text-center`}>
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>

              {result.columnDiffs.some(c => c.type !== 'both') && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-900/10">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Column differences detected:</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-600 dark:text-amber-300">
                    {result.columnDiffs.filter(c => c.type !== 'both').map(c => (
                      <li key={c.column}>&bull; <span className="font-mono">{c.column}</span> — {c.type === 'file1_only' ? 'only in File A' : 'only in File B'}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-1">
                {FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setFilter(opt.key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      filter === opt.key
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {opt.label}{filter === opt.key ? ` (${opt.key === 'all' ? result.rowDiffs.length : result.rowDiffs.filter(r => r.type === opt.key).length})` : ''}
                  </button>
                ))}
                <div className="flex-1" />
                <button onClick={() => downloadReportHtml(result)} className="btn-secondary text-xs">
                  <Download className="h-3.5 w-3.5" /> Export HTML
                </button>
              </div>

              <DiffTable result={result} filter={filter} columns={result.columns} />
            </div>
          )}
        </div>
      )}

      {tab === 'text' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Text A (original)</label>
              <textarea
                value={text1}
                onChange={e => { setText1(e.target.value); setDiffLines(null); }}
                placeholder="Paste original text here..."
                className="input-field h-60 resize-y font-mono text-sm"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Text B (modified)</label>
              <textarea
                value={text2}
                onChange={e => { setText2(e.target.value); setDiffLines(null); }}
                placeholder="Paste modified text here..."
                className="input-field h-60 resize-y font-mono text-sm"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleTextCompare} className="btn-primary text-sm">
              <GitCompare className="h-4 w-4" /> Compare Text
            </button>
            {diffLines && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {diffLines.filter(l => l.type === 'added').length} additions,{' '}
                {diffLines.filter(l => l.type === 'removed').length} deletions,{' '}
                {diffLines.filter(l => l.type === 'unchanged').length} unchanged
              </span>
            )}
          </div>

          {diffLines && <TextDiffView lines={diffLines} />}
        </div>
      )}
    </div>
  );
}
