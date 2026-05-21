import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, BarChart3, FileText, AlertTriangle, Hash } from 'lucide-react';
import { jobsService } from '../services/jobs.service';
import type { ProcessingJob } from '../types';

interface SummaryData {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  processingJobs: number;
  pendingJobs: number;
  totalRows: number;
  failedRows: number;
  successRate: number;
  byFile: { name: string; count: number; rows: number }[];
  byProfile: { name: string; count: number }[];
  failedDetails: { name: string; date: string; errors: string[] }[];
}

interface WeeklySummaryPreviewProps {
  onClose: () => void;
}

function buildSummary(jobs: ProcessingJob[]): SummaryData {
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
  const failedJobs = jobs.filter(j => j.status === 'FAILED').length;
  const processingJobs = jobs.filter(j => j.status === 'PROCESSING').length;
  const pendingJobs = jobs.filter(j => j.status === 'PENDING').length;
  const totalRows = jobs.reduce((s, j) => s + (j.totalRows || 0), 0);
  const failedRows = jobs.reduce((s, j) => s + (j.failedRows || 0), 0);
  const totalProcessed = jobs.reduce((s, j) => s + (j.processedRows || 0), 0);
  const successRate = totalProcessed + failedRows > 0
    ? Math.round((totalProcessed / (totalProcessed + failedRows)) * 100)
    : 0;

  const fileMap = new Map<string, { count: number; rows: number }>();
  jobs.forEach(j => {
    const name = j.uploadedFile?.originalName || 'Unknown';
    const entry = fileMap.get(name) || { count: 0, rows: 0 };
    entry.count++;
    entry.rows += j.totalRows || 0;
    fileMap.set(name, entry);
  });

  const profileMap = new Map<string, number>();
  jobs.forEach(j => {
    const name = j.profile?.name || 'Unknown';
    profileMap.set(name, (profileMap.get(name) || 0) + 1);
  });

  const failedDetails = jobs
    .filter(j => j.status === 'FAILED' && j.errorLog)
    .flatMap(j => {
      const errors = Array.isArray(j.errorLog)
        ? j.errorLog.slice(0, 3).map((e: any) => e.errors?.[0] || e.fieldErrors?.[Object.keys(e.fieldErrors || {})[0]] || 'Unknown error')
        : ['Unknown error'];
      return [{
        name: j.profile?.name || 'Job',
        date: j.completedAt ? new Date(j.completedAt).toLocaleDateString() : '',
        errors,
      }];
    });

  return {
    totalJobs,
    completedJobs,
    failedJobs,
    processingJobs,
    pendingJobs,
    totalRows,
    failedRows,
    successRate,
    byFile: Array.from(fileMap.entries()).map(([name, data]) => ({ name, ...data })),
    byProfile: Array.from(profileMap.entries()).map(([name, count]) => ({ name, count })),
    failedDetails,
  };
}

export function WeeklySummaryPreview({ onClose }: WeeklySummaryPreviewProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await jobsService.list(1, 50);
        setSummary(buildSummary(result.data));
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 86400000);
  const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const maxFileRows = summary ? Math.max(...summary.byFile.map(f => f.rows), 1) : 1;
  const maxProfileCount = summary ? Math.max(...summary.byProfile.map(p => p.count), 1) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-500" />
              Weekly Usage Summary
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{dateRange}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : !summary ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
            <BarChart3 className="mb-3 h-12 w-12" />
            <p className="text-sm font-medium">Unable to load summary data</p>
          </div>
        ) : summary.totalJobs === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
            <BarChart3 className="mb-3 h-12 w-12" />
            <p className="text-sm font-medium">No jobs found for this period</p>
            <p className="mt-1 text-xs">Run some processing jobs to see your weekly summary</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-blue-50 p-4 dark:border-slate-600 dark:bg-blue-500/10">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Hash className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Jobs</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary.totalJobs}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-emerald-50 p-4 dark:border-slate-600 dark:bg-emerald-500/10">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary.completedJobs}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-red-50 p-4 dark:border-slate-600 dark:bg-red-500/10">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Failed</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary.failedJobs}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-purple-50 p-4 dark:border-slate-600 dark:bg-purple-500/10">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Rows Proc.</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary.totalRows.toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-3 dark:border-slate-600 dark:bg-slate-700/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Overall Success Rate</span>
                <span className={`text-lg font-bold ${summary.successRate >= 95 ? 'text-emerald-600 dark:text-emerald-400' : summary.successRate >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {summary.successRate}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
                <div
                  className={`h-full rounded-full transition-all ${summary.successRate >= 95 ? 'bg-emerald-500' : summary.successRate >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${summary.successRate}%` }}
                />
              </div>
            </div>

            {summary.byFile.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Processing By File
                </h3>
                <div className="space-y-2">
                  {summary.byFile.map(f => (
                    <div key={f.name} className="rounded-lg border border-gray-100 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-700/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900 dark:text-white truncate mr-2">{f.name}</span>
                        <span className="whitespace-nowrap text-gray-500 dark:text-slate-400">{f.rows.toLocaleString()} rows</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
                          <div
                            className="h-full rounded-full bg-primary-500"
                            style={{ width: `${(f.rows / maxFileRows) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{f.count} jobs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.byProfile.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Top Profiles
                </h3>
                <div className="space-y-2">
                  {summary.byProfile.map(p => (
                    <div key={p.name} className="rounded-lg border border-gray-100 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-700/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-900 dark:text-white truncate mr-2">{p.name}</span>
                        <span className="whitespace-nowrap text-gray-500 dark:text-slate-400">{p.count} runs</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${(p.count / maxProfileCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.failedDetails.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Failed Jobs
                </h3>
                <div className="space-y-2">
                  {summary.failedDetails.map((f, i) => (
                    <div key={i} className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-red-700 dark:text-red-300">{f.name}</span>
                        <span className="text-xs text-red-500 dark:text-red-400">{f.date}</span>
                      </div>
                      {f.errors.map((err, j) => (
                        <p key={j} className="mt-1 text-xs text-red-600 dark:text-red-400">{err}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.processingJobs > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                <Clock className="h-4 w-4" />
                <span>{summary.processingJobs} job{summary.processingJobs > 1 ? 's' : ''} currently processing</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
