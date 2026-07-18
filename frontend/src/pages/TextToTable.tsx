import { useState, useCallback, useEffect } from 'react';
import {
  Database, Table2, Upload, FileText, Settings2, ArrowRight,
  CheckCircle2, XCircle, AlertCircle, Loader2, ChevronDown,
  Braces, SplitSquareHorizontal, Replace, RotateCcw,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { DataPreviewGrid } from '../components/DataPreviewGrid';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { textToTableService } from '../services/text-to-table.service';
import { databaseConnectionsService } from '../services/database-connections.service';
import type { DatabaseConnection, ParseTextResult, ColumnInfo } from '../types';
import toast from 'react-hot-toast';

const DEFAULT_SEPARATORS = [',', '|', '^', '&', '~', '\t', ';'];
const SEPARATOR_LABELS: Record<string, string> = {
  ',': 'Comma ,',
  '|': 'Pipe |',
  '^': 'Caret ^',
  '&': 'Ampersand &',
  '~': 'Tilde ~',
  '\t': 'Tab \\t',
  ';': 'Semicolon ;',
};

const defaultPorts: Record<string, number> = { mssql: 1433, postgresql: 5432, mysql: 3306 };
const typeLabels: Record<string, string> = {
  mssql: 'SQL Server', postgresql: 'PostgreSQL', mysql: 'MySQL',
};

// SQL type mapping — mirrors backend table-creator.service.ts
const DB_TYPE_OPTIONS: Record<string, string[]> = {
  postgresql: [
    'TEXT', 'VARCHAR(255)', 'VARCHAR(500)', 'VARCHAR(1000)', 'BIGINT', 'INTEGER',
    'DOUBLE PRECISION', 'DECIMAL(18,2)', 'DECIMAL(10,4)', 'TIMESTAMP', 'DATE',
    'BOOLEAN', 'JSONB', 'UUID', 'REAL', 'FLOAT',
  ],
  mysql: [
    'TEXT', 'VARCHAR(255)', 'VARCHAR(500)', 'VARCHAR(1000)', 'BIGINT', 'INT',
    'DOUBLE', 'DECIMAL(18,2)', 'DECIMAL(10,4)', 'DATETIME', 'DATE',
    'TINYINT(1)', 'JSON', 'FLOAT', 'CHAR(36)',
  ],
  mssql: [
    'TEXT', 'VARCHAR(255)', 'VARCHAR(500)', 'VARCHAR(1000)', 'NVARCHAR(255)',
    'BIGINT', 'INT', 'FLOAT(53)', 'DECIMAL(18,2)', 'DATETIME2', 'DATE',
    'BIT', 'UNIQUEIDENTIFIER',
  ],
};

function defaultSqlType(detectedType: string, dbType: string, sampleValues?: any[]): string {
  // Mirror of backend postgresTypeMap + char(255) heuristic for strings
  const pgMap: Record<string, string> = {
    string: 'TEXT',
    number: 'DOUBLE PRECISION',
    integer: 'BIGINT',
    date: 'TIMESTAMP',
    boolean: 'BOOLEAN',
    email: 'VARCHAR(255)',
    json: 'JSONB',
    phone: 'VARCHAR(20)',
    zip: 'VARCHAR(10)',
    url: 'VARCHAR(2048)',
    ip: 'VARCHAR(45)',
    currency: 'DECIMAL(18,2)',
    percentage: 'DECIMAL(5,2)',
    uuid: 'UUID',
  };
  const mysqlMap: Record<string, string> = {
    string: 'TEXT', number: 'DOUBLE', integer: 'BIGINT', date: 'DATETIME',
    boolean: 'TINYINT(1)', email: 'VARCHAR(255)', json: 'JSON', phone: 'VARCHAR(20)',
    zip: 'VARCHAR(10)', url: 'VARCHAR(2048)', ip: 'VARCHAR(45)',
    currency: 'DECIMAL(18,2)', percentage: 'DECIMAL(5,2)', uuid: 'CHAR(36)',
  };
  const mssqlMap: Record<string, string> = {
    string: 'VARCHAR(MAX)', number: 'FLOAT(53)', integer: 'BIGINT', date: 'DATETIME2',
    boolean: 'BIT', email: 'VARCHAR(255)', json: 'NVARCHAR(MAX)', phone: 'VARCHAR(20)',
    zip: 'VARCHAR(10)', url: 'VARCHAR(2048)', ip: 'VARCHAR(45)',
    currency: 'DECIMAL(18,2)', percentage: 'DECIMAL(5,2)', uuid: 'UNIQUEIDENTIFIER',
  };
  const map = dbType === 'mysql' ? mysqlMap : dbType === 'mssql' ? mssqlMap : pgMap;
  return map[detectedType] || 'TEXT';
}

type Step = 'input' | 'config' | 'preview' | 'import';

export function TextToTable() {
  const [step, setStep] = useState<Step>('input');

  const [rawText, setRawText] = useState('');
  const [inputTab, setInputTab] = useState<'paste' | 'file'>('paste');
  const [fileName, setFileName] = useState('');

  const [selectedSeps, setSelectedSeps] = useState<Set<string>>(new Set([',', '|']));
  const [parseMode, setParseMode] = useState<'flat' | 'hierarchical' | 'hl7-flat'>('flat');
  const [hasHeader, setHasHeader] = useState(true);
  const [primarySep, setPrimarySep] = useState('|');

  const [hl7FieldSep, setHl7FieldSep] = useState('|');
  const [hl7CompSep, setHl7CompSep] = useState('^');
  const [hl7RepSep, setHl7RepSep] = useState('~');
  const [hl7EscapeChar, setHl7EscapeChar] = useState('\\');
  const [hl7SubCompSep, setHl7SubCompSep] = useState('&');
  const [hl7AutoDetect, setHl7AutoDetect] = useState(true);
  const [hl7ExpandComponents, setHl7ExpandComponents] = useState(true);

  const [parseResult, setParseResult] = useState<ParseTextResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [schemaOverrides, setSchemaOverrides] = useState<Record<string, string>>({});
  const [columnNameOverrides, setColumnNameOverrides] = useState<Record<string, string>>({});

  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnId, setSelectedConnId] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [tableName, setTableName] = useState('');
  const [dropExisting, setDropExisting] = useState(true);
  const [batchSize, setBatchSize] = useState(500);

  const [newConnForm, setNewConnForm] = useState({
    name: '', type: 'postgresql', host: '', port: 5432,
    databaseName: '', username: '', password: '', sslEnabled: false,
  });

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ tableName: string; rowsInserted: number; ddlStatements: string[] } | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      const list = await databaseConnectionsService.list();
      setConnections(list);
      if (list.length > 0 && !selectedConnId) {
        setSelectedConnId(list[0].id);
      }
    } catch {
      toast.error('Failed to load database connections');
    }
  }, [selectedConnId]);

  useEffect(() => { loadConnections(); }, []);

  const handleFileDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setFileName(file.name);
    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    if (!tableName) setTableName(baseName);

    const isXlsx = file.name.match(/\.xlsx?$/i);
    if (isXlsx) {
      setParsing(true);
      try {
        const result = await textToTableService.parseFile(file);
        if (!result.columns || result.columns.length === 0) {
          toast.error('No data found in spreadsheet');
          setParsing(false);
          return;
        }
        setParseResult(result);
        setStep('preview');
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to parse spreadsheet';
        setParseError(msg);
      } finally {
        setParsing(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setRawText(e.target?.result as string || '');
      setStep('config');
    };
    reader.readAsText(file);
  }, [tableName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/plain': ['.txt', '.csv', '.tsv', '.dat', '.hl7', '.log'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDrop: handleFileDrop,
  });

  const toggleSep = (sep: string) => {
    const next = new Set(selectedSeps);
    if (next.has(sep)) {
      if (next.size > 1) next.delete(sep);
    } else {
      next.add(sep);
    }
    setSelectedSeps(next);
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error('No text to parse');
      return;
    }
    if (selectedSeps.size === 0) {
      toast.error('Select at least one separator');
      return;
    }
    setParsing(true);
    setParseError(null);
    setParseResult(null);
    try {
      const seps = Array.from(selectedSeps);
      console.log('[DEBUG] Sending separators:', JSON.stringify(seps), 'parseMode:', parseMode);
      const result = await textToTableService.parse({
        text: rawText,
        separators: seps,
        parseMode: parseMode,
        hasHeader,
        ...(parseMode === 'hl7-flat' ? {
          hl7FieldSep,
          hl7CompSep,
          hl7RepSep,
          hl7EscapeChar,
          hl7SubCompSep,
          hl7AutoDetect,
          hl7ExpandComponents,
        } : {}),
      });
      if (!result.selectedSeparator) {
        setParseError('Could not detect a working separator. Try different ones.');
        setParsing(false);
        return;
      }
      setParseResult(result);
      setSchemaOverrides({});
      setColumnNameOverrides({});
      setStep('preview');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Parse failed';
      setParseError(msg);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;
    if (!selectedConnId) { toast.error('Select a database connection'); return; }
    if (!tableName.trim()) { toast.error('Enter a table name'); return; }

    setImporting(true);
    setImportResult(null);
    try {
      const result = await textToTableService.importToTable({
        connectionId: selectedConnId,
        tableName: tableName.trim(),
        columns: (() => {
          const selectedConn = connections.find(c => c.id === selectedConnId);
          const dbType = selectedConn?.type || 'postgresql';
          return parseResult.columns.map(col => ({
            name: columnNameOverrides[col.name] || col.name,
            type: col.type,
            sampleValues: col.sampleValues,
            dbTypeOverride: schemaOverrides[col.name] || defaultSqlType(col.type, dbType, col.sampleValues),
          }));
        })(),
        rows: parseResult.rows,
        dropExisting,
        batchSize,
      });
      setImportResult(result);
      toast.success(`Inserted ${result.rowsInserted} rows into "${result.tableName}"`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Import failed';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleCreateConnection = async () => {
    if (!newConnForm.name.trim() || !newConnForm.host.trim() || !newConnForm.databaseName.trim() || !newConnForm.username.trim()) {
      toast.error('Fill in all required fields');
      return;
    }
    if (!newConnForm.password) { toast.error('Password is required'); return; }
    try {
      const created = await databaseConnectionsService.create(newConnForm);
      setConnections(prev => [...prev, created]);
      setSelectedConnId(created.id);
      setShowNewForm(false);
      toast.success('Connection created');
    } catch {
      toast.error('Failed to create connection');
    }
  };

  const handleTypeChange = (type: string) => {
    setNewConnForm(prev => ({ ...prev, type, port: defaultPorts[type] || 5432 }));
  };

  const renderTextInput = () => (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setInputTab('paste')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            inputTab === 'paste'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="mr-1.5 inline h-4 w-4" />
          Paste Text
        </button>
        <button
          onClick={() => setInputTab('file')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            inputTab === 'file'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Upload className="mr-1.5 inline h-4 w-4" />
          Upload File
        </button>
      </div>

      {inputTab === 'paste' ? (
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="input-field w-full font-mono text-sm"
          rows={12}
          placeholder={`Paste your text here...\n\nExample:\nid|name|email\n1|John|john@example.com\n2|Jane|jane@example.com`}
        />
      ) : (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-slate-600 dark:bg-slate-800/30 dark:hover:border-slate-500'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-4 dark:bg-slate-700/50">
              <Upload className="h-8 w-8 text-gray-400 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {isDragActive ? 'Drop your file here' : 'Drag & drop a text file, or click to browse'}
              </p>
               <p className="text-sm text-gray-500 dark:text-slate-400">.txt, .csv, .tsv, .dat, .hl7, .xlsx, .xls — max 500 MB</p>
            </div>
          </div>
        </div>
      )}

      {rawText && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2 dark:bg-emerald-500/10">
          <span className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            {rawText.split(/\r?\n/).filter(l => l.trim()).length} lines loaded
            {fileName && <>from <span className="font-medium">{fileName}</span></>}
          </span>
          <button onClick={() => { setRawText(''); setFileName(''); setParseResult(null); }} className="text-xs text-gray-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400">
            Clear
          </button>
        </div>
      )}
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-6">
      {/* File info & sample preview */}
      {rawText && (
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">
              {fileName || 'Imported Text'}
            </h3>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              — {rawText.split(/\r?\n/).filter(l => l.trim()).length} lines
            </span>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-800/50">
            {rawText.split(/\r?\n/).slice(0, 2).map((line, i) => (
              <div key={i} className="flex">
                <span className="mr-3 min-w-[1.5rem] text-right text-gray-400 dark:text-slate-500 select-none">{i + 1}</span>
                <span className="whitespace-pre-wrap break-all text-gray-800 dark:text-slate-200">{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">Parse Configuration</h3>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-slate-400">
              Parse Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setParseMode('flat')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                  parseMode === 'flat'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-slate-600 dark:text-slate-400'
                }`}
              >
                <SplitSquareHorizontal className="h-4 w-4" />
                Flat
              </button>
              <button
                onClick={() => setParseMode('hierarchical')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                  parseMode === 'hierarchical'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-slate-600 dark:text-slate-400'
                }`}
              >
                <Braces className="h-4 w-4" />
                Hierarchical (HL7)
              </button>
              <button
                onClick={() => { setParseMode('hl7-flat'); setSelectedSeps(new Set(['|', '^', '~', '&'])); }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                  parseMode === 'hl7-flat'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-slate-600 dark:text-slate-400'
                }`}
              >
                <Replace className="h-4 w-4" />
                HL7 Flat File
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
              {parseMode === 'flat' && 'All selected separators split at the same level.'}
              {parseMode === 'hierarchical' && 'HL7 standard: one row per OBX observation. Columns named using HL7 field definitions (e.g. pid_patient_name_given_name).'}
              {parseMode === 'hl7-flat' && 'HL7 delimiters with role-aware splitting (field, component, subcomponent, repetition). Escape sequences decoded. Optionally expand components into sub-columns.'}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-slate-400">
              {parseMode === 'hierarchical' && 'HL7 Encoding Characters'}
              {parseMode === 'hl7-flat' && 'HL7 Delimiters'}
              {parseMode === 'flat' && 'Delimiters'}
            </label>
            {parseMode === 'hierarchical' ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="mb-1 font-mono text-amber-700 dark:text-amber-300">| ^ ~ \ &</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  HL7 encoding auto-detected from MSH-2. Field separator <code className="font-mono">|</code>, component <code className="font-mono">^</code>, repetition <code className="font-mono">~</code>, escape <code className="font-mono">\</code>, subcomponent <code className="font-mono">&amp;</code>.
                </p>
              </div>
            ) : parseMode === 'hl7-flat' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400 dark:text-slate-500">Field</label>
                    <input
                      value={hl7FieldSep}
                      onChange={e => setHl7FieldSep(e.target.value.slice(0, 1) || '|')}
                      className="input-field w-full text-center font-mono text-sm"
                      maxLength={1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400 dark:text-slate-500">Component</label>
                    <input
                      value={hl7CompSep}
                      onChange={e => setHl7CompSep(e.target.value.slice(0, 1) || '^')}
                      className="input-field w-full text-center font-mono text-sm"
                      maxLength={1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400 dark:text-slate-500">Repetition</label>
                    <input
                      value={hl7RepSep}
                      onChange={e => setHl7RepSep(e.target.value.slice(0, 1) || '~')}
                      className="input-field w-full text-center font-mono text-sm"
                      maxLength={1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400 dark:text-slate-500">Escape</label>
                    <input
                      value={hl7EscapeChar}
                      onChange={e => setHl7EscapeChar(e.target.value.slice(0, 1) || '\\')}
                      className="input-field w-full text-center font-mono text-sm"
                      maxLength={1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400 dark:text-slate-500">Subcomponent</label>
                    <input
                      value={hl7SubCompSep}
                      onChange={e => setHl7SubCompSep(e.target.value.slice(0, 1) || '&')}
                      className="input-field w-full text-center font-mono text-sm"
                      maxLength={1}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={hl7AutoDetect}
                      onChange={e => setHl7AutoDetect(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
                    />
                    Auto-detect from MSH-2
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={hl7ExpandComponents}
                      onChange={e => setHl7ExpandComponents(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
                    />
                    Expand components
                  </label>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  {hl7ExpandComponents
                    ? 'Fields split by component/repetition/subcomponent separators into sub-columns.'
                    : 'Only field-separator split with escape sequence decoding.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {DEFAULT_SEPARATORS.map(sep => (
                  <button
                    key={sep}
                    onClick={() => toggleSep(sep)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-mono transition-colors ${
                      selectedSeps.has(sep)
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {SEPARATOR_LABELS[sep]}
                  </button>
                ))}
              </div>
            )}
            {parseMode === 'flat' && (
              <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">{selectedSeps.size} selected</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          {parseMode !== 'hierarchical' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
            />
              First row is header
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep('input')} className="btn-secondary">Back</button>
        <button onClick={handleParse} disabled={parsing} className="btn-primary">
          {parsing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Parsing...</>
          ) : (
            <><ArrowRight className="h-4 w-4" /> Parse & Preview</>
          )}
        </button>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!parseResult) return null;

    const mappedColumns: ColumnInfo[] = parseResult.columns.map(col => ({
      name: columnNameOverrides[col.name] || col.name,
      type: col.type,
      nullCount: col.nullCount,
      nullPercentage: parseResult.rowCount > 0 ? Math.round((col.nullCount / parseResult.rowCount) * 100) : 0,
      sampleValues: col.sampleValues.map(v => String(v)),
    }));

    const remappedRows = parseResult.rows.map(row => {
      const mapped: Record<string, any> = {};
      for (const col of parseResult.columns) {
        mapped[columnNameOverrides[col.name] || col.name] = row[col.name];
      }
      return mapped;
    });

    return (
      <div className="space-y-6">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">Parse Result</h3>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
                <span>{parseResult.rowCount} rows</span>
                <span>{parseResult.columns.length} columns</span>
                <span>Detected separator: <span className="font-mono font-medium text-primary-600 dark:text-primary-400">"{parseResult.selectedSeparator}"</span></span>
              </div>
            </div>
            <button onClick={() => setStep('config')} className="btn-secondary text-xs">Change Settings</button>
          </div>

          {parseResult.stats.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {parseResult.stats.filter(s => s.consistencyScore > 0).map(s => (
                <div
                  key={s.separator}
                  className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs ${
                    s.separator === parseResult.selectedSeparator
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-slate-700/50 dark:text-slate-400'
                  }`}
                >
                  <span className="font-medium font-mono">"{s.separator}"</span>
                  <span>{s.columns} cols</span>
                  <span>score: {s.consistencyScore.toFixed(1)}</span>
                  {s.separator === parseResult.selectedSeparator && <CheckCircle2 className="h-3 w-3" />}
                </div>
              ))}
            </div>
          )}

          {parseResult.columns.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {mappedColumns.map(col => (
                <div key={col.name} className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-2.5 py-1 text-xs dark:bg-slate-700/50">
                  <span className="font-medium text-gray-700 dark:text-slate-300">{col.name}</span>
                  <span className="text-gray-400 dark:text-slate-500">{col.type}</span>
                  <span className={`rounded px-1 py-0.5 ${col.nullPercentage > 10 ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-gray-200 text-gray-500 dark:bg-slate-600 dark:text-slate-400'}`}>
                    {col.nullPercentage}% null
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DataPreviewGrid columns={mappedColumns} rows={remappedRows} loading={false} />

        {/* Schema Configuration — view and override SQL types before import */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-gray-500 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">Schema Configuration</h3>
            <span className="text-xs text-gray-400 dark:text-slate-500">— override detected column types if needed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Column</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Detected Type</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">SQL Type</th>
                </tr>
              </thead>
              <tbody>
                {parseResult.columns.map(col => {
                  const selectedConn = connections.find(c => c.id === selectedConnId);
                  const dbType = selectedConn?.type || 'postgresql';
                  const defaultType = defaultSqlType(col.type, dbType, col.sampleValues);
                  const currentOverride = schemaOverrides[col.name];
                  const currentSqlType = currentOverride || defaultType;
                  const typeOptions = DB_TYPE_OPTIONS[dbType] || DB_TYPE_OPTIONS.postgresql;
                  const displayName = columnNameOverrides[col.name] ?? col.name;
                  return (
                    <tr key={col.name} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={displayName}
                          onChange={e => setColumnNameOverrides(prev => ({ ...prev, [col.name]: e.target.value }))}
                          className="input-field w-40 text-xs"
                          placeholder={col.name}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                          {col.type}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={currentSqlType}
                          onChange={e => {
                            const val = e.target.value;
                            setSchemaOverrides(prev => {
                              const next = { ...prev };
                              if (val === defaultType) {
                                delete next[col.name];
                              } else {
                                next[col.name] = val;
                              }
                              return next;
                            });
                          }}
                          className="input-field py-1 text-xs w-48"
                        >
                          <option value={defaultType}>{defaultType} (auto)</option>
                          {typeOptions.filter(t => t !== defaultType).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        {currentOverride && (
                          <button
                            onClick={() => setSchemaOverrides(prev => {
                              const next = { ...prev };
                              delete next[col.name];
                              return next;
                            })}
                            className="ml-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                            title="Reset to auto-detected type"
                          >
                            <RotateCcw className="h-3 w-3 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">Database Target</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Database Connection</label>
              {connections.length > 0 ? (
                <select
                  value={selectedConnId}
                  onChange={(e) => setSelectedConnId(e.target.value)}
                  className="input-field w-full text-sm"
                >
                  <option value="">Select a connection...</option>
                  {connections.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.host}/{c.databaseName})</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-400">No connections yet. Create one below.</p>
              )}
              <button
                onClick={() => setShowNewForm(!showNewForm)}
                className="mt-1 text-xs text-primary-600 hover:text-primary-500 dark:text-primary-400"
              >
                {showNewForm ? 'Cancel' : '+ New Connection'}
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Target Table Name</label>
              <input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="input-field w-full text-sm font-mono"
                placeholder="my_table"
              />
            </div>
          </div>

          {showNewForm && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-300">New Connection</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Name *</label>
                  <input value={newConnForm.name} onChange={(e) => setNewConnForm(p => ({ ...p, name: e.target.value }))} className="input-field text-sm" placeholder="My PG Database" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Type *</label>
                  <select value={newConnForm.type} onChange={(e) => handleTypeChange(e.target.value)} className="input-field text-sm">
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mssql">SQL Server</option>
                    <option value="mysql">MySQL</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Host *</label>
                  <input value={newConnForm.host} onChange={(e) => setNewConnForm(p => ({ ...p, host: e.target.value }))} className="input-field text-sm" placeholder="localhost or host.docker.internal" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Port</label>
                  <input type="number" value={newConnForm.port} onChange={(e) => setNewConnForm(p => ({ ...p, port: Number(e.target.value) }))} className="input-field text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Database *</label>
                  <input value={newConnForm.databaseName} onChange={(e) => setNewConnForm(p => ({ ...p, databaseName: e.target.value }))} className="input-field text-sm" placeholder="my_database" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Username *</label>
                  <input value={newConnForm.username} onChange={(e) => setNewConnForm(p => ({ ...p, username: e.target.value }))} className="input-field text-sm" placeholder="db_user" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Password *</label>
                  <input type="password" value={newConnForm.password} onChange={(e) => setNewConnForm(p => ({ ...p, password: e.target.value }))} className="input-field text-sm" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <input type="checkbox" checked={newConnForm.sslEnabled} onChange={(e) => setNewConnForm(p => ({ ...p, sslEnabled: e.target.checked }))} className="text-primary-600" />
                    Enable SSL
                  </label>
                </div>
              </div>
              <button onClick={handleCreateConnection} className="btn-primary mt-3 text-xs">Create Connection</button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={dropExisting}
                onChange={(e) => setDropExisting(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
              />
              Drop table if exists
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <span className="text-xs text-gray-500">Batch size:</span>
              <input
                type="number"
                min={50}
                max={10000}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(50, Number(e.target.value)))}
                className="input-field w-20 text-sm text-center"
              />
            </label>
          </div>
        </div>

        {importResult ? (
          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Import Complete</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {importResult.rowsInserted} rows inserted into "{importResult.tableName}"
                </p>
              </div>
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200">
                View DDL Statements
              </summary>
              <div className="mt-2 max-h-60 overflow-auto rounded-lg bg-gray-900 p-4">
                {importResult.ddlStatements.map((ddl, i) => (
                  <pre key={i} className="text-xs text-green-400 font-mono whitespace-pre-wrap">{ddl}{i < importResult.ddlStatements.length - 1 ? '\n' : ''}</pre>
                ))}
              </div>
            </details>
            <button
              onClick={() => { setImportResult(null); setParseResult(null); setRawText(''); setFileName(''); setTableName(''); setStep('input'); }}
              className="btn-secondary text-xs"
            >
              Import Another
            </button>
          </div>
        ) : (
          <div className="flex justify-between">
            <button onClick={() => setStep('config')} className="btn-secondary">Back to Config</button>
            <button
              onClick={handleImport}
              disabled={importing || !selectedConnId || !tableName.trim()}
              className="btn-primary"
            >
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Database className="h-4 w-4" /> Create Table & Import</>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Text to Table</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Upload or paste delimited text, parse with multiple separators, and import into a PostgreSQL table
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(['input', 'config', 'preview'] as Step[]).map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              step === s
                ? 'bg-primary-600 text-white'
                : ['preview', 'import'].includes(step) && ['input', 'config'].includes(s)
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              {['preview', 'import'].includes(step) && ['input', 'config'].includes(s) ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`${step === s ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
              {s === 'input' ? 'Input' : s === 'config' ? 'Configure' : 'Preview & Import'}
            </span>
            {s !== 'preview' && <ChevronDown className="h-3 w-3 -rotate-90 text-gray-300 dark:text-slate-600" />}
          </span>
        ))}
      </div>

      {parseError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{parseError}</p>
          <button onClick={() => setParseError(null)} className="ml-auto text-sm text-red-600 hover:text-red-500 dark:text-red-400">Dismiss</button>
        </div>
      )}

      {step === 'input' && (
        <>
          {renderTextInput()}
          {rawText && (
            <div className="flex justify-end">
              <button onClick={() => setStep('config')} className="btn-primary">
                <ArrowRight className="h-4 w-4" /> Configure Parsing
              </button>
            </div>
          )}
        </>
      )}

      {step === 'config' && renderConfig()}

      {step === 'preview' && renderPreview()}
    </div>
  );
}
