import { useEffect, useState, useRef } from 'react';
import {
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { jobsService, getDownloadFilename } from '../services/jobs.service';
import type { ProcessingJob } from '../types';
import toast from 'react-hot-toast';

interface JobProgressProps {
  job: ProcessingJob;
}

export function JobProgress({ job }: JobProgressProps) {
  const [localJob, setLocalJob] = useState(job);
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    setLocalJob(job);
  }, [job]);

  useEffect(() => {
    if (localJob.status === 'PROCESSING' || localJob.status === 'PENDING') {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(async () => {
        try {
          const progress = await jobsService.getProgress(localJob.id);
          setLocalJob((prev) => ({
            ...prev,
            status: progress.status as ProcessingJob['status'],
            processedRows: progress.processedRows,
            totalRows: progress.totalRows,
            failedRows: progress.failedRows,
          }));
        } catch {
          // ignore polling errors
        }
      }, 2000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [localJob.id, localJob.status]);

  useEffect(() => {
    if (localJob.status === 'COMPLETED' || localJob.status === 'FAILED') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [localJob.status]);

  const percentage = localJob.totalRows > 0
    ? Math.round((localJob.processedRows / localJob.totalRows) * 100)
    : 0;

  const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
  const rowsPerSecond = elapsedSeconds > 0
    ? (localJob.processedRows / elapsedSeconds).toFixed(1)
    : '0.0';

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await jobsService.cancel(localJob.id);
      setLocalJob((prev) => ({ ...prev, status: 'FAILED' }));
      toast.success('Job cancelled');
    } catch {
      toast.error('Failed to cancel job');
    } finally {
      setCancelling(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await jobsService.download(localJob.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getDownloadFilename(localJob);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const statusConfig = {
    PENDING: { icon: Clock, color: 'text-gray-500 dark:text-slate-400', bg: 'bg-gray-100 dark:bg-slate-500/10', label: 'Pending' },
    PROCESSING: { icon: Loader2, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/10', label: 'Processing' },
    COMPLETED: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-500/10', label: 'Completed' },
    FAILED: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-500/10', label: 'Failed' },
  };

  const config = statusConfig[localJob.status];
  const StatusIcon = config.icon;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`rounded-lg ${config.bg} p-3`}>
            <StatusIcon className={`h-6 w-6 ${config.color} ${localJob.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {localJob.uploadedFile?.originalName || `Job ${localJob.id.slice(0, 12)}`}
              </h3>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
                {config.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
              <span>Format: {localJob.outputFormat}</span>
              <span>Created: {new Date(localJob.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(localJob.status === 'PROCESSING' || localJob.status === 'PENDING') && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-danger text-xs"
            >
              <XCircle className="h-3.5 w-3.5" />
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          {localJob.status === 'COMPLETED' && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-700/30">
          <p className="text-xs text-gray-500 dark:text-slate-400">Total Rows</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {localJob.totalRows.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-700/30">
          <p className="text-xs text-gray-500 dark:text-slate-400">Processed</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            {localJob.processedRows.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-700/30">
          <p className="text-xs text-gray-500 dark:text-slate-400">Failed</p>
          <p className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400">
            {localJob.failedRows.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-700/30">
          <p className="text-xs text-gray-500 dark:text-slate-400">Speed</p>
          <p className="mt-1 text-lg font-semibold text-primary-600 dark:text-primary-400">
            {rowsPerSecond}/s
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-gray-500 dark:text-slate-400">Progress</span>
          <span className="font-medium text-gray-700 dark:text-slate-300">{percentage}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 dark:bg-slate-700">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              localJob.status === 'FAILED'
                ? 'bg-red-500'
                : localJob.status === 'COMPLETED'
                ? 'bg-emerald-500'
                : 'bg-primary-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-400 dark:text-slate-500">
          <span>{localJob.processedRows.toLocaleString()} / {localJob.totalRows.toLocaleString()} rows</span>
          {localJob.status === 'PROCESSING' && (
            <span>{rowsPerSecond} rows/sec</span>
          )}
        </div>
      </div>

      {localJob.status === 'FAILED' && localJob.errorLog && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 dark:bg-red-500/10">
          <p className="text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap">
            {typeof localJob.errorLog === 'string'
              ? localJob.errorLog
              : JSON.stringify(localJob.errorLog, null, 2)}
          </p>
        </div>
      )}
    </div>
  );
}
