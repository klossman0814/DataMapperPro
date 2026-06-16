import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  SplitSquareHorizontal,
  PlayCircle,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { jobsService } from '../services/jobs.service';
import { filesService } from '../services/files.service';
import { profilesService } from '../services/profiles.service';
import type { ProcessingJob } from '../types';
import toast from 'react-hot-toast';

interface ChartPoint {
  name: string;
  jobs: number;
}

function computeChartData(jobs: ProcessingJob[]): ChartPoint[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();
  return last7.map((date) => {
    const count = jobs.filter((j) => {
      const created = new Date(j.createdAt);
      return created.toDateString() === date.toDateString();
    }).length;
    return { name: days[date.getDay()], jobs: count };
  });
}

export function Dashboard() {
  const navigate = useNavigate();
  const [recentJobs, setRecentJobs] = useState<ProcessingJob[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [fileCount, setFileCount] = useState(0);
  const [profileCount, setProfileCount] = useState(0);
  const [allJobsCount, setAllJobsCount] = useState(0);

  const loadData = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      jobsService.list(1, 5),
      jobsService.list(1, 200),
      filesService.list(1, 1).catch(() => ({ total: 0, data: [] })),
      profilesService.list(1, 1).catch(() => ({ total: 0, data: [] })),
    ])
      .then(([recent, all, filesRes, profilesRes]) => {
        setRecentJobs(recent.data);
        setChartData(computeChartData(all.data));
        setFileCount(filesRes.total ?? filesRes.data.length);
        setProfileCount(profilesRes.total ?? profilesRes.data.length);
        setAllJobsCount(all.total ?? all.data.length);
      })
      .catch(() => {
        setError(true);
        toast.error('Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const completedJobs = recentJobs.filter((j) => j.status === 'COMPLETED').length;
  const totalJobs = recentJobs.length;
  const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
  const processingJobs = recentJobs.filter((j) => j.status === 'PROCESSING').length;
  const failedJobs = recentJobs.filter((j) => j.status === 'FAILED').length;

  const stats = [
    {
      label: 'Total Files',
      value: fileCount,
      icon: HardDrive,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-500/10',
    },
    {
      label: 'Total Mappings',
      value: profileCount,
      icon: SplitSquareHorizontal,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-500/10',
    },
    {
      label: 'Total Jobs',
      value: allJobsCount,
      icon: Activity,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-500/10',
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-500/10',
    },
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />;
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400 dark:text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-28 animate-pulse">
              <div className="h-4 w-20 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
        <div className="card h-80 animate-pulse">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-medium text-gray-900 dark:text-white">Failed to load dashboard</p>
        <button onClick={loadData} className="btn-primary">
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-gray-500 dark:text-slate-400">Overview of your data mapping activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card transition-all duration-150 hover:shadow-md hover:border-gray-300 dark:hover:border-slate-600">
            <div className="flex items-center justify-between">
              <div className={`rounded-lg ${bg} p-2.5`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Jobs Over Time</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                  }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Area
                  type="monotone"
                  dataKey="jobs"
                  stroke="#3b82f6"
                  fill="url(#colorJobs)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/upload')}
              className="btn-primary flex-1"
            >
              <Upload className="h-4 w-4" />
              Upload File
            </button>
            <button
              onClick={() => navigate('/mapping?new=true')}
              className="btn-secondary flex-1"
            >
              <SplitSquareHorizontal className="h-4 w-4" />
              Create Mapping
            </button>
            <button
              onClick={() => navigate('/jobs')}
              className="btn-secondary flex-1"
            >
              <PlayCircle className="h-4 w-4" />
              New Job
            </button>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Jobs</h2>
              <button
                onClick={() => navigate('/jobs')}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {recentJobs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-gray-400 dark:text-slate-500">
                <PlayCircle className="h-10 w-10" />
                <p className="text-sm">No jobs yet</p>
                <button onClick={() => navigate('/upload')} className="btn-primary text-sm">
                  Start a new job
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-slate-800/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {statusIcon(job.status)}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-200">
                          {job.uploadedFile?.originalName || `Job ${job.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {job.outputFormat} • {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 badge badge-${job.status === 'COMPLETED' ? 'success' : job.status === 'FAILED' ? 'error' : job.status === 'PROCESSING' ? 'warning' : 'neutral'}`}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
