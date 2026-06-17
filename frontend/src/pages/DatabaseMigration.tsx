import { useEffect, useState } from 'react';
import {
  Database, ArrowRight, Play, Eye, CheckCircle2, XCircle, Loader2,
  Table2, Settings2, AlertCircle,
} from 'lucide-react';
import { databaseConnectionsService } from '../services/database-connections.service';
import { databaseMigrationService, type ColumnMapping, type ColumnInfo, type MigrationResult } from '../services/database-migration.service';
import type { DatabaseConnection } from '../types';
import toast from 'react-hot-toast';

export function DatabaseMigration() {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loadingConns, setLoadingConns] = useState(true);

  const [sourceConnId, setSourceConnId] = useState('');
  const [sourceTable, setSourceTable] = useState('');
  const [sourceTables, setSourceTables] = useState<string[]>([]);
  const [loadingSourceTables, setLoadingSourceTables] = useState(false);

  const [destConnId, setDestConnId] = useState('');
  const [destTable, setDestTable] = useState('');
  const [destTableMode, setDestTableMode] = useState<'select' | 'new'>('select');
  const [destTables, setDestTables] = useState<string[]>([]);

  const [sourceColumns, setSourceColumns] = useState<ColumnInfo[]>([]);
  const [destColumns, setDestColumns] = useState<ColumnInfo[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [previewing, setPreviewing] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    databaseConnectionsService.list()
      .then(setConnections)
      .catch(() => toast.error('Failed to load connections'))
      .finally(() => setLoadingConns(false));
  }, []);

  useEffect(() => {
    if (!sourceConnId) { setSourceTables([]); setSourceTable(''); return; }
    setLoadingSourceTables(true);
    databaseMigrationService.discoverTables(sourceConnId)
      .then(setSourceTables)
      .catch(() => toast.error('Failed to discover tables'))
      .finally(() => setLoadingSourceTables(false));
  }, [sourceConnId]);

  useEffect(() => {
    if (!destConnId) { setDestTables([]); return; }
    databaseMigrationService.discoverTables(destConnId)
      .then(setDestTables)
      .catch(() => {});
  }, [destConnId]);

  useEffect(() => {
    if (!sourceConnId || !sourceTable) { setSourceColumns([]); setColumnMappings([]); return; }
    setLoadingColumns(true);
    databaseMigrationService.discoverColumns(sourceConnId, sourceTable)
      .then((cols) => {
        setSourceColumns(cols);
        setColumnMappings(cols.map(c => ({ sourceColumn: c.name, destColumn: c.name, sourceType: c.type })));
      })
      .catch(() => toast.error('Failed to discover columns'))
      .finally(() => setLoadingColumns(false));
  }, [sourceConnId, sourceTable]);

  useEffect(() => {
    if (!destConnId || !destTable || destTableMode !== 'select') { setDestColumns([]); return; }
    databaseMigrationService.discoverColumns(destConnId, destTable)
      .then(setDestColumns)
      .catch(() => setDestColumns([]));
  }, [destConnId, destTable, destTableMode]);

  const updateMapping = (index: number, destColumn: string) => {
    setColumnMappings(prev => prev.map((m, i) => i === index ? { ...m, destColumn } : m));
  };

  const removeMapping = (index: number) => {
    setColumnMappings(prev => prev.filter((_, i) => i !== index));
  };

  const handleAutoMap = () => {
    if (!destConnId || !destTable) { toast.error('Select destination first'); return; }
    if (destTableMode === 'select') {
      databaseMigrationService.discoverColumns(destConnId, destTable)
        .then((destCols) => {
          const destNames = new Set(destCols.map(c => c.name));
          const mapped = columnMappings.map(m => ({
            ...m,
            destColumn: destNames.has(m.sourceColumn) ? m.sourceColumn : m.destColumn,
          }));
          setColumnMappings(mapped);
          toast.success('Auto-mapped by name');
        })
        .catch(() => toast.error('Failed to discover destination columns'));
    } else {
      toast('Destination table not yet created — mapping uses source column names', { icon: 'ℹ️' });
    }
  };

  const handlePreview = async () => {
    if (!sourceConnId || !sourceTable || columnMappings.length === 0) {
      toast.error('Select source and add column mappings first');
      return;
    }
    setPreviewing(true);
    try {
      const rows = await databaseMigrationService.preview(sourceConnId, sourceTable, columnMappings, 10);
      setPreviewRows(rows);
      toast.success(`Preview returned ${rows.length} rows`);
    } catch {
      toast.error('Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleRun = async () => {
    if (!sourceConnId || !sourceTable || !destConnId || !destTable || columnMappings.length === 0) {
      toast.error('Fill in all fields and add column mappings');
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const res = await databaseMigrationService.run({
        sourceConnectionId: sourceConnId,
        destConnectionId: destConnId,
        sourceTable,
        destTable: destTable.trim(),
        columnMappings,
        dropExisting: false,
        batchSize: 500,
        createTable: destTableMode === 'new',
      });
      setResult(res);
      if (res.failedRows > 0) {
        toast.error(`${res.failedRows} rows failed`);
      } else {
        toast.success(`Copied ${res.rowsCopied} rows in ${(res.durationMs / 1000).toFixed(1)}s`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Migration failed');
    } finally {
      setRunning(false);
    }
  };

  const canRun = sourceConnId && sourceTable && destConnId && destTable && columnMappings.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Database to Database Migration</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Copy records from a source database table to a destination database table</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Source */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-300 flex items-center gap-2">
            <Database className="h-4 w-4 text-primary-500" />
            Source
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">Connection</label>
              <select
                value={sourceConnId}
                onChange={e => { setSourceConnId(e.target.value); setSourceTable(''); setPreviewRows([]); setResult(null); }}
                className="input-field"
              >
                <option value="">Select source connection...</option>
                {connections.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">Table</label>
              <select
                value={sourceTable}
                onChange={e => { setSourceTable(e.target.value); setPreviewRows([]); setResult(null); }}
                className="input-field"
                disabled={!sourceConnId || loadingSourceTables}
              >
                <option value="">{loadingSourceTables ? 'Loading...' : 'Select source table...'}</option>
                {sourceTables.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Destination */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-300 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-emerald-500" />
            Destination
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">Connection</label>
              <select
                value={destConnId}
                onChange={e => { setDestConnId(e.target.value); setDestTable(''); setResult(null); }}
                className="input-field"
              >
                <option value="">Select destination connection...</option>
                {connections.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex gap-1 mb-2 border-b border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setDestTableMode('select')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${destTableMode === 'select' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
                >
                  <Table2 className="mr-1 inline h-3.5 w-3.5" />
                  Existing Table
                </button>
                <button
                  onClick={() => setDestTableMode('new')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${destTableMode === 'new' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
                >
                  <Settings2 className="mr-1 inline h-3.5 w-3.5" />
                  New Table
                </button>
              </div>
              {destTableMode === 'select' ? (
                <select
                  value={destTable}
                  onChange={e => setDestTable(e.target.value)}
                  className="input-field"
                  disabled={!destConnId}
                >
                  <option value="">Select destination table...</option>
                  {destTables.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={destTable}
                  onChange={e => setDestTable(e.target.value)}
                  className="input-field"
                  placeholder="Enter new table name..."
                />
              )}
              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                {destTableMode === 'new' ? 'Table will be auto-created with mapped column types' : 'Data will be inserted into the existing table'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Column Mapping */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300 flex items-center gap-2">
            <Table2 className="h-4 w-4 text-primary-500" />
            Column Mapping ({columnMappings.length})
          </h3>
          <button onClick={handleAutoMap} className="btn-secondary text-xs">
            Auto-Map by Name
          </button>
        </div>

        {loadingColumns ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading columns...
          </div>
        ) : columnMappings.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-slate-500">Select a source table to see columns</p>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Source Column</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Destination Column</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {columnMappings.map((m, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-slate-700/50">
                    <td className="px-3 py-2 font-medium text-gray-700 dark:text-slate-300">{m.sourceColumn}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-slate-700 dark:text-slate-400">{m.sourceType}</span>
                    </td>
                    <td className="px-3 py-2">
                      {destColumns.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={m.destColumn}
                            onChange={e => updateMapping(i, e.target.value)}
                            className="input-field py-1 text-xs w-44"
                          >
                            <option value="">-- map to column --</option>
                            {destColumns.map(dc => (
                              <option key={dc.name} value={dc.name}>{dc.name} ({dc.type})</option>
                            ))}
                          </select>
                          <span className="text-xs text-gray-400">or</span>
                          <input
                            type="text"
                            value={m.destColumn}
                            onChange={e => updateMapping(i, e.target.value)}
                            className="input-field py-1 text-xs w-28"
                            placeholder="type name"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={m.destColumn}
                          onChange={e => updateMapping(i, e.target.value)}
                          className="input-field py-1 text-xs w-48"
                          placeholder="Destination column name"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeMapping(i)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={handlePreview} disabled={previewing || !canRun} className="btn-secondary">
          {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {previewing ? 'Loading...' : 'Preview 10 Rows'}
        </button>
        <button onClick={handleRun} disabled={running || !canRun} className="btn-primary">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Running...' : 'Run Migration'}
        </button>
      </div>

      {/* Preview Rows */}
      {previewRows.length > 0 && (
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-300">Preview ({previewRows.length} rows)</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  {columnMappings.map((m, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">{m.destColumn}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-100 dark:border-slate-700/50">
                    {columnMappings.map((m, ci) => (
                      <td key={ci} className="px-3 py-2 text-gray-700 dark:text-slate-300">
                        {String(row[m.destColumn] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={`card border-2 ${result.failedRows > 0 ? 'border-amber-200 dark:border-amber-800' : 'border-emerald-200 dark:border-emerald-800'}`}>
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            {result.failedRows > 0 ? (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            )}
            Migration Results
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-700/30">
              <p className="text-xs text-gray-500 dark:text-slate-400">Total Rows</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{result.totalRows.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-700/30">
              <p className="text-xs text-gray-500 dark:text-slate-400">Copied</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{result.rowsCopied.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-700/30">
              <p className="text-xs text-gray-500 dark:text-slate-400">Failed</p>
              <p className="mt-1 text-lg font-semibold text-red-600">{result.failedRows.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-slate-700/30">
              <p className="text-xs text-gray-500 dark:text-slate-400">Duration</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{(result.durationMs / 1000).toFixed(1)}s</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-500/10">
              <p className="text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">
                {result.errors.map(e => `Row ${e.row}: ${e.message}`).join('\n')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
