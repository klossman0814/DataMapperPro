import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Bookmark, GitBranch, FileCode, Settings2, AlertTriangle } from 'lucide-react';
import { profilesService } from '../services/profiles.service';
import type { MappingProfile } from '../types';
import toast from 'react-hot-toast';

export function ProfileReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MappingProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    profilesService.report(id)
      .then(setProfile)
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card flex flex-col items-center gap-4 py-12">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-lg font-medium text-gray-700 dark:text-slate-300">Profile not found</p>
        <button onClick={() => navigate('/profiles')} className="btn-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Profiles
        </button>
      </div>
    );
  }

  const { configurationJson } = profile;
  const mappings = configurationJson?.mappings || [];
  const outputFormat = configurationJson?.outputFormat || 'csv';
  const outputOptions = configurationJson?.outputOptions || {};

  const transformsCount = mappings.filter(m => m.transformation).length;
  const conditionsCount = mappings.filter(m => m.condition).length;
  const formatLabel = outputFormat.toUpperCase();

  return (
    <div className="print-container">
      <div className="no-print mb-6 flex items-center justify-between">
        <button onClick={() => navigate('/profiles')} className="btn-secondary text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to Profiles
        </button>
        <button onClick={() => window.print()} className="btn-primary text-sm">
          <Printer className="h-4 w-4" /> Print / Export PDF
        </button>
      </div>

      <div className="report rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="report-header border-b border-gray-100 pb-6 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
            <Bookmark className="h-3.5 w-3.5" />
            Profile Report
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{profile.name}</h1>
          {profile.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{profile.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
            <span>Version <strong className="text-gray-700 dark:text-slate-300">{profile.version}</strong></span>
            <span>Created: {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>Updated: {new Date(profile.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="report-summary mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/30">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{mappings.length}</div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">Field Mappings</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/30">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{formatLabel}</div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">Output Format</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/30">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{transformsCount}</div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">Transformations</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/30">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{conditionsCount}</div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">Conditions</div>
          </div>
        </div>

        <div className="report-section mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
            <GitBranch className="h-4 w-4" />
            Field Mappings
          </h2>
          {mappings.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No mappings configured</p>
          ) : (
            <div className="overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-3 py-2 font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Destination Field</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Source Field</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Transformation</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Expression / Constant</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {mappings.map((m, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                      <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-mono font-medium text-gray-900 dark:text-slate-200">{m.destinationField}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-600 dark:text-slate-400">{m.sourceField || <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-600 dark:text-slate-400">{m.transformation || <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                      <td className="px-3 py-1.5 font-mono">
                        {(m.expression || m.constant) ? (
                          <span className="text-amber-600 dark:text-amber-400">{m.expression || m.constant}</span>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {m.condition ? (
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                            {m.condition.field} {m.condition.operator}{m.condition.value ? ` ${m.condition.value}` : ''}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {profile.template && (
          <div className="report-section mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
              <FileCode className="h-4 w-4" />
              Output Template
            </h2>
            <pre className="overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs text-gray-800 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-200 whitespace-pre-wrap break-all">{profile.template}</pre>
          </div>
        )}

        <div className="report-section mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
            <Settings2 className="h-4 w-4" />
            Configuration
          </h2>
          <div className="rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="flex items-center border-b border-gray-100 px-4 py-2.5 dark:border-slate-700">
              <span className="w-48 text-xs font-medium text-gray-500 dark:text-slate-400">Output Format</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-slate-200">{formatLabel}</span>
            </div>
            {Object.entries(outputOptions)
              .filter(([, v]) => v !== undefined && v !== null && v !== '')
              .map(([key, val]) => (
                <div key={key} className="flex items-center border-b border-gray-100 px-4 py-2.5 last:border-0 dark:border-slate-700">
                  <span className="w-48 text-xs font-medium text-gray-500 dark:text-slate-400">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  </span>
                  <span className="text-xs text-gray-900 dark:text-slate-200">{String(val)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="report-footer mt-8 border-t border-gray-100 pt-4 text-center text-[10px] text-gray-400 dark:border-slate-700 dark:text-slate-500">
          Report generated on {new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0.5in; size: auto; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { background: white !important; height: auto !important; overflow: visible !important; }
          body > #root > div { display: block !important; height: auto !important; overflow: visible !important; }
          aside, header, nav, .no-print { display: none !important; }
          main { display: block !important; overflow: visible !important; padding: 0 !important; }
          main > div { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .print-container { padding: 0 !important; margin: 0 !important; }
          .report { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; background: white !important; }
          .report-section { break-inside: avoid; }
          table { break-inside: auto; font-size: 9pt !important; }
          th, td { padding: 4pt 6pt !important; }
          .report-header { border-bottom: 1pt solid #ddd !important; }
          .report-footer { position: fixed; bottom: 0; left: 0; right: 0; }
          p, h1, h2, h3, div { color: black !important; }
        }
      `}</style>
    </div>
  );
}
