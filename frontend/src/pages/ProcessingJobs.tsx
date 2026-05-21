import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Download,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { jobsService } from '../services/jobs.service';
import { useJobStore } from '../stores/jobStore';
import { JobProgress } from '../components/JobProgress';
import type { ProcessingJob } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const statusConfig = {
  PENDING: { icon: Clock, label: 'Pending', className: 'badge-neutral' },
  PROCESSING: { icon: RefreshCw, label: 'Processing', className: 'badge-warning' },
  COMPLETED: { icon: CheckCircle2, label: 'Completed', className: 'badge-success' },
  FAILED: { icon: AlertCircle, label: 'Failed', className: 'badge-error' },
};

export function ProcessingJobs() {
  const location = useLocation();
  const { jobs, setJobs, updateJob } = useJobStore();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await jobsService.list(1, 50);
        setJobs(res.data);
      } catch {
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setJobs]);

  const pollingRefs = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    pollingRefs.current.forEach(clearInterval);
    pollingRefs.current = [];

    const processing = jobs.filter((j) => j.status === 'PROCESSING' || j.status === 'PENDING');
    if (processing.length === 0) return;

    pollingRefs.current = processing.map((job) =>
      setInterval(async () => {
        try {
          const progress = await jobsService.getProgress(job.id);
          updateJob(job.id, {
            status: progress.status as ProcessingJob['status'],
            processedRows: progress.processedRows,
            totalRows: progress.totalRows,
            failedRows: progress.failedRows,
          });
        } catch {
          // ignore
        }
      }, 3000)
    );

    return () => {
      pollingRefs.current.forEach(clearInterval);
      pollingRefs.current = [];
    };
  }, [jobs, updateJob]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await jobsService.list(1, 50);
      setJobs(res.data);
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (job: ProcessingJob) => {
    if (job.status !== 'COMPLETED') {
      toast.error('Job not yet completed');
      return;
    }
    setDownloading(job.id);
    try {
      const blob = await jobsService.download(job.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `output-${job.id.slice(0, 8)}.${job.outputFormat}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      await jobsService.cancel(jobId);
      updateJob(jobId, { status: 'FAILED' });
      toast.success('Job cancelled');
    } catch {
      toast.error('Failed to cancel job');
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await jobsService.delete(id);
      setJobs(jobs.filter((j) => j.id !== id));
      toast.success('Job deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete job');
    } finally {
      setDeleting(null);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = job.uploadedFile?.originalName?.toLowerCase() || '';
      const id = job.id.toLowerCase();
      if (!name.includes(query) && !id.includes(query)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processing Jobs</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Monitor and manage data processing jobs</p>
        </div>
        <button onClick={handleRefresh} className="btn-secondary">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
            placeholder="Search jobs..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 dark:text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-36 text-sm"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-12">
          <PlayCircle className="h-12 w-12 text-gray-400 dark:text-slate-500" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700 dark:text-slate-300">No processing jobs</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {searchQuery || statusFilter !== 'all'
                ? 'No jobs match your filters'
                : 'Upload a file and create a mapping to start a job'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden lg:grid lg:grid-cols-7 gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
            <span className="col-span-2">Name</span>
            <span>Status</span>
            <span>Format</span>
            <span>Progress</span>
            <span>Created</span>
            <span>Actions</span>
          </div>
          {filteredJobs.map((job) => {
            const StatusIcon = statusConfig[job.status].icon;
            const isExpanded = expandedId === job.id;
            return (
              <div key={job.id} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : job.id)}
                  className="w-full lg:grid lg:grid-cols-7 gap-4 items-center px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 min-w-0"
                >
                    <div className="flex items-center gap-3 col-span-2 min-w-0">
                    <div className={clsx(
                      'rounded-lg p-2',
                      job.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-500/10' :
                      job.status === 'FAILED' ? 'bg-red-100 dark:bg-red-500/10' :
                      job.status === 'PROCESSING' ? 'bg-amber-100 dark:bg-amber-500/10' :
                      'bg-gray-100 dark:bg-slate-500/10'
                    )}>
                      <StatusIcon className={clsx(
                        'h-4 w-4',
                        job.status === 'COMPLETED' ? 'text-emerald-600 dark:text-emerald-400' :
                        job.status === 'FAILED' ? 'text-red-600 dark:text-red-400' :
                        job.status === 'PROCESSING' ? 'text-amber-600 dark:text-amber-400' :
                        'text-gray-500 dark:text-slate-400'
                      )} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-200">
                        {job.uploadedFile?.originalName || job.id.slice(0, 12)}
                      </p>
                    </div>
                    <div className="lg:hidden">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  <span className={statusConfig[job.status].className}>{statusConfig[job.status].label}</span>
                  <span className="text-sm text-gray-500 dark:text-slate-400 uppercase">{job.outputFormat}</span>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                    <span>{job.processedRows}/{job.totalRows}</span>
                    {job.totalRows > 0 && (
                      <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-slate-700">
                        <div
                          className={clsx(
                            'h-1.5 rounded-full',
                            job.status === 'FAILED' ? 'bg-red-500' :
                            job.status === 'COMPLETED' ? 'bg-emerald-500' :
                            'bg-primary-500'
                          )}
                          style={{ width: `${Math.round((job.processedRows / job.totalRows) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-slate-400">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {job.status === 'COMPLETED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(job); }}
                        disabled={downloading === job.id}
                        className="btn-secondary text-xs px-2 py-1"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    )}
                    {(job.status === 'PROCESSING' || job.status === 'PENDING') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancel(job.id); }}
                        className="btn-danger text-xs px-2 py-1"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    )}
                    {(job.status === 'COMPLETED' || job.status === 'FAILED') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: job.id, name: job.uploadedFile?.originalName || job.id.slice(0, 12) }); }}
                        disabled={deleting === job.id}
                        className="btn-danger text-xs px-2 py-1"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-slate-700 p-4">
                    <JobProgress job={job} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Job"
        message={`Delete job "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={deleting === deleteTarget?.id}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
