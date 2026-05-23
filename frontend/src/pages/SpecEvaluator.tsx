import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Upload, Trash2, ClipboardCheck, Download, ArrowRight,
  Search, Tag, AlertCircle, CheckCircle2, XCircle, Loader2, FileSpreadsheet,
  FileType, Table2, BookOpen, BarChart3,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { specEvaluatorService } from '../services/spec-evaluator.service';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { SpecDocument, SpecEvaluation } from '../types';
import toast from 'react-hot-toast';

const FILE_ACCEPT = {
  'text/plain': ['.txt', '.csv', '.tsv', '.dat', '.hl7'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/pdf': ['.pdf'],
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  'docx': FileText,
  'xlsx': FileSpreadsheet,
  'xls': FileSpreadsheet,
  'pdf': FileType,
  'txt': FileText,
};

function getExt(name: string) { return name.toLowerCase().split('.').pop() || ''; }

export function SpecEvaluator() {
  const navigate = useNavigate();
  const [specs, setSpecs] = useState<SpecDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tagFilter, setTagFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDelimiter, setUploadDelimiter] = useState('');

  const [evalSpecId, setEvalSpecId] = useState<string | null>(null);
  const [evalFile, setEvalFile] = useState<File | null>(null);
  const [evalResult, setEvalResult] = useState<SpecEvaluation | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const loadSpecs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await specEvaluatorService.list(page, 20, tagFilter || undefined);
      setSpecs(res.data);
      setTotalPages(res.totalPages);
    } catch { toast.error('Failed to load specs'); }
    finally { setLoading(false); }
  }, [page, tagFilter]);

  useEffect(() => { loadSpecs(); }, [loadSpecs]);

  const handleUpload = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setUploading(true);
    try {
      await specEvaluatorService.upload(file, {
        name: uploadName || undefined,
        description: uploadDesc || undefined,
        tags: uploadTags || undefined,
        delimiter: uploadDelimiter || undefined,
      });
      toast.success('Spec uploaded and parsed');
      setUploadName('');
      setUploadDesc('');
      setUploadTags('');
      setUploadDelimiter('');
      loadSpecs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: FILE_ACCEPT,
    maxFiles: 1,
    onDrop: handleUpload,
    disabled: uploading,
  });

  const handleDelete = async (id: string) => {
    try {
      await specEvaluatorService.delete(id);
      setSpecs(prev => prev.filter(s => s.id !== id));
      toast.success('Spec deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleEvaluate = async (specId: string) => {
    if (!evalFile) { toast.error('Select a data file'); return; }
    setEvalLoading(true);
    setEvalResult(null);
    try {
      const res = await specEvaluatorService.evaluate(specId, evalFile);
      setEvalResult({ id: res.id, status: res.status } as SpecEvaluation);
      setPolling(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Evaluation failed');
    } finally { setEvalLoading(false); }
  };

  useEffect(() => {
    if (!polling || !evalResult) return;
    const interval = setInterval(async () => {
      try {
        const result = await specEvaluatorService.getEvaluation(evalResult.id);
        setEvalResult(result);
        if (result.status === 'COMPLETED' || result.status === 'FAILED') {
          setPolling(false);
          clearInterval(interval);
          if (result.status === 'COMPLETED') toast.success('Evaluation complete');
        }
      } catch { setPolling(false); clearInterval(interval); }
    }, 1500);
    return () => clearInterval(interval);
  }, [polling, evalResult?.id]);

  const handleGenerateTemplate = async (specId: string) => {
    try {
      const profile = await specEvaluatorService.generateTemplate(specId);
      toast.success('Template generated');
      navigate(`/template/${profile.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate template');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      UPLOADED: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
      PARSED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
      FAILED: 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    };
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.UPLOADED}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spec Evaluator</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Upload specification documents, extract field definitions, and evaluate data extracts against them
          </p>
        </div>
      </div>

      <div {...getRootProps()} className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
        isDragActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-slate-600 dark:bg-slate-800/30 dark:hover:border-slate-500'
      } ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <><Loader2 className="h-8 w-8 animate-spin text-primary-500" /><p className="text-sm text-gray-500">Uploading and parsing...</p></>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {isDragActive ? 'Drop spec document here' : 'Upload a spec document'}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">.docx, .xlsx, .xls, .pdf, .txt — max 50 MB</p>
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                <input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Spec name" className="input-field w-44 text-xs" onClick={e => e.stopPropagation()} />
                <select value={uploadDelimiter} onChange={e => setUploadDelimiter(e.target.value)} className="input-field w-28 text-xs" onClick={e => e.stopPropagation()}>
                  <option value="">Auto-detect</option>
                  <option value=",">Comma (,)</option>
                  <option value="|">Pipe (|)</option>
                  <option value="\t">Tab (\t)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="^">Caret (^)</option>
                </select>
                <input value={uploadTags} onChange={e => setUploadTags(e.target.value)} placeholder="Tags" className="input-field w-36 text-xs" onClick={e => e.stopPropagation()} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={tagFilter || ''} onChange={e => { setTagFilter(e.target.value); setPage(1); }}
            className="input-field pl-9 text-sm" placeholder="Filter by tag..." />
        </div>
        <span className="text-xs text-gray-400">{specs.length} specs</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      ) : specs.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-gray-400 dark:text-slate-500">
          <ClipboardCheck className="h-10 w-10" />
          <p className="text-sm">No spec documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {specs.map(spec => {
            const ext = getExt(spec.originalName);
            const Icon = TYPE_ICONS[ext] || FileText;
            const isExpanded = expandedId === spec.id;
            const specEvalId = evalSpecId === spec.id;

            return (
              <div key={spec.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-500/10">
                      <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-200">{spec.name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-slate-400">
                        <span>{spec.originalName}</span>
                        <span>{(spec.size / 1024).toFixed(1)} KB</span>
                        <span>{spec.fieldCount} fields</span>
                        {spec.provider && <span className="text-primary-500">{spec.provider}</span>}
                      </div>

                    </div>
                      {spec.tags && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {spec.tags.split(',').map(t => (
                            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                              <Tag className="h-2.5 w-2.5" />{t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                    {statusBadge(spec.status)}
                    <button onClick={() => setExpandedId(isExpanded ? null : spec.id)} className="btn-secondary text-xs">Details</button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-slate-700">
                    {spec.description && <p className="text-xs text-gray-500">{spec.description}</p>}

                    {spec.fields.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-gray-700 dark:text-slate-300">Extracted Fields ({spec.fields.length})</h4>
                        <div className="max-h-60 overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-slate-800/50">
                              <tr><th className="px-3 py-2 font-medium text-gray-500">Name</th><th className="px-3 py-2 font-medium text-gray-500">Type</th><th className="px-3 py-2 font-medium text-gray-500">Req</th><th className="px-3 py-2 font-medium text-gray-500">Length</th><th className="px-3 py-2 font-medium text-gray-500">Description</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                              {spec.fields.map((f, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                  <td className="px-3 py-1.5 font-mono text-gray-900 dark:text-slate-200">{f.name}</td>
                                  <td className="px-3 py-1.5 text-gray-500">{f.dataType || '-'}</td>
                                  <td className="px-3 py-1.5">{f.required ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-gray-300" />}</td>
                                  <td className="px-3 py-1.5 text-gray-500">{f.length ?? '-'}</td>
                                  <td className="px-3 py-1.5 text-gray-500 max-w-xs truncate">{f.description || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {spec.formats.length > 0 && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-slate-300">Output Format{spec.formats.length > 1 ? 's' : ''}</h4>
                        <div className="flex flex-wrap gap-2">
                          {spec.formats.map((fmt, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                              {fmt.type}{fmt.delimiter ? ` (${fmt.delimiter})` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {spec.rules.length > 0 && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-slate-300">Rules ({spec.rules.length})</h4>
                        <ul className="space-y-0.5">
                          {spec.rules.slice(0, 5).map((r, i) => <li key={i} className="text-xs text-gray-500">• {r}</li>)}
                          {spec.rules.length > 5 && <li className="text-xs text-gray-400">...{spec.rules.length - 5} more</li>}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { setEvalSpecId(spec.id); setEvalFile(null); setEvalResult(null); }} className="btn-primary text-xs">
                        <BarChart3 className="h-3.5 w-3.5" /> Evaluate Data
                      </button>
                      <button onClick={() => handleGenerateTemplate(spec.id)} className="btn-secondary text-xs">
                        <ArrowRight className="h-3.5 w-3.5" /> Generate Template
                      </button>
                      <button onClick={() => setDeleteTarget({ id: spec.id, name: spec.name })} className="btn-danger text-xs">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>

                    {specEvalId && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
                        <h4 className="mb-3 text-xs font-semibold text-gray-700 dark:text-slate-300">Evaluate Data Against Spec</h4>
                        <div className="flex items-center gap-3">
                          <input type="file" accept=".csv,.txt,.tsv,.dat" onChange={e => setEvalFile(e.target.files?.[0] || null)}
                            className="text-xs file:mr-3 file:rounded file:border-0 file:bg-primary-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-700 dark:file:bg-primary-500/10 dark:file:text-primary-400" />
                          <button onClick={() => handleEvaluate(spec.id)} disabled={!evalFile || evalLoading} className="btn-primary text-xs">
                            {evalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
                            {evalLoading ? 'Running...' : 'Evaluate'}
                          </button>
                        </div>

                        {evalResult && (
                          <div className="mt-3 space-y-2">
                            {evalResult.status === 'PENDING' || evalResult.status === 'PROCESSING' ? (
                              <div className="flex items-center gap-2 text-xs text-amber-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Evaluating...</div>
                            ) : evalResult.status === 'COMPLETED' ? (
                              <>
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                                    (evalResult.score ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                    (evalResult.score ?? 0) >= 50 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                                    'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                                  }`}>{evalResult.score}</div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Compliance Score</p>
                                    <p className="text-xs text-gray-500">{evalResult.summary}</p>
                                    <p className="text-xs text-gray-400">{evalResult.inputRowCount} rows evaluated</p>
                                  </div>
                                </div>
                                {evalResult.fieldCoverage && (
                                  <div className="flex flex-wrap gap-3 text-xs">
                                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> {evalResult.fieldCoverage.matched.length} matched</span>
                                    <span className="flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" /> {evalResult.fieldCoverage.missing.length} missing</span>
                                    <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="h-3 w-3" /> {evalResult.fieldCoverage.extra.length} extra</span>
                                    {evalResult.fieldCoverage.typeMismatches.length > 0 && (
                                      <span className="text-orange-600">{evalResult.fieldCoverage.typeMismatches.length} type mismatches</span>
                                    )}
                                  </div>
                                )}
                                {evalResult.issues && evalResult.issues.length > 0 && (
                                  <div className="max-h-32 overflow-auto rounded border border-gray-200 p-2 text-xs dark:border-slate-700">
                                    {evalResult.issues.map((iss, i) => (
                                      <div key={i} className={`flex items-start gap-1.5 py-0.5 ${
                                        iss.severity === 'error' ? 'text-red-600' : iss.severity === 'warning' ? 'text-amber-600' : 'text-gray-500'
                                      }`}>
                                        {iss.severity === 'error' ? <XCircle className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />}
                                        <span>{iss.field ? `[${iss.field}] ` : ''}{iss.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-red-600">Evaluation failed: {evalResult.issues?.[0]?.message}</p>
                            )}
                            <button onClick={() => { setEvalSpecId(null); setEvalResult(null); setEvalFile(null); }} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
                          </div>
                        )}
                      </div>
                    )}

                    {spec.evaluations && spec.evaluations.length > 0 && !specEvalId && (
                      <div>
                        <h4 className="mb-1 text-xs font-semibold text-gray-700 dark:text-slate-300">Recent Evaluations</h4>
                        <div className="space-y-1">
                          {spec.evaluations.slice(0, 3).map(ev => (
                            <div key={ev.id} className="flex items-center gap-3 text-xs text-gray-500">
                              <span className={`h-2 w-2 rounded-full ${ev.status === 'COMPLETED' ? 'bg-emerald-500' : ev.status === 'FAILED' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              <span>{ev.score !== null && ev.score !== undefined ? `${ev.score}%` : ev.status}</span>
                              <span>{ev.inputFilename}</span>
                              <span>{new Date(ev.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`rounded-lg px-3 py-1.5 text-xs ${page === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Spec"
        message={`Delete "${deleteTarget?.name}" and all its evaluations?`}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
