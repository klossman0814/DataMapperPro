import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet, CheckCircle2, ArrowRight, Trash2, Settings2, Layers,
  HardDrive, Calendar, Rows3, Columns3,
} from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { DataPreviewGrid } from '../components/DataPreviewGrid';
import { filesService } from '../services/files.service';
import type { UploadedFileInfo } from '../types';
import toast from 'react-hot-toast';

export function Upload() {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [previewData, setPreviewData] = useState<{ columns: any[]; rows: any[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [prevFiles, setPrevFiles] = useState<UploadedFileInfo[]>([]);
  const [prevLoading, setPrevLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [hasHeader, setHasHeader] = useState(true);

  const loadPrevFiles = useCallback(async () => {
    setPrevLoading(true);
    try {
      const res = await filesService.list(1, 50);
      setPrevFiles(res.data);
    } catch {
      // silently fail
    } finally {
      setPrevLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrevFiles();
  }, [loadPrevFiles]);

  const handleUploadComplete = async (file: UploadedFileInfo) => {
    setUploadedFile(file);
    await loadPreview(file.id);
  };

  const handleDelete = async (fileId: string) => {
    setDeleting(fileId);
    try {
      await filesService.delete(fileId);
      setPrevFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success('File deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };

  const loadPreview = async (fileId: string) => {
    setPreviewLoading(true);
    try {
      const data = await filesService.getPreview(fileId);
      setPreviewData(data);
    } catch {
      toast.error('Failed to load file preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Data File</h1>
        <p className="mt-1 text-gray-500 dark:text-slate-400">
          Upload CSV, Excel, or text files to begin mapping
        </p>
      </div>

      {!uploadedFile && (
        <FileDropzone onUploadComplete={handleUploadComplete} />
      )}

      {uploadedFile && (
        <>
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-500/10">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{uploadedFile.originalName}</h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-slate-400">
                    <span>{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                    <span>{uploadedFile.rowCount.toLocaleString()} rows</span>
                    <span>{uploadedFile.columns.length} columns</span>
                    <span>{uploadedFile.mimeType}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setUploadedFile(null);
                  setPreviewData(null);
                }}
                className="btn-secondary text-xs"
              >
                Upload Another
              </button>
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-gray-400 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">File Options</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {uploadedFile.sheetNames && uploadedFile.sheetNames.length > 0 && (
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                  <label className="text-sm text-gray-700 dark:text-slate-300">Sheet:</label>
                  <select
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="input-field w-40 text-sm"
                  >
                    {uploadedFile.sheetNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-slate-300">Delimiter:</label>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="input-field w-28 text-sm"
                >
                  <option value=",">Comma (,)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                  <option value=";">Semicolon (;)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-slate-300">Has Header:</label>
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
                />
              </div>
            </div>
          </div>

          <DataPreviewGrid
            columns={uploadedFile.columns}
            rows={previewData?.rows || []}
            loading={previewLoading}
          />

          <div className="flex justify-end">
            <button
              onClick={() => navigate(`/mapping/${uploadedFile.id}`)}
              className="btn-primary"
            >
              <ArrowRight className="h-4 w-4" />
              Continue to Mapping
            </button>
          </div>
        </>
      )}

      {!uploadedFile && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="card">
              <FileSpreadsheet className="mb-3 h-8 w-8 text-primary-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">CSV Files</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Comma-separated, tab-separated, or custom delimiter
              </p>
            </div>
            <div className="card">
              <FileSpreadsheet className="mb-3 h-8 w-8 text-emerald-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Excel Files</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                .xlsx and .xls with multi-sheet support
              </p>
            </div>
            <div className="card">
              <FileSpreadsheet className="mb-3 h-8 w-8 text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Text Files</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Fixed-width, pipe-delimited, and more
              </p>
            </div>
          </div>

          {prevFiles.length > 0 && (
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Previously Uploaded Files</h2>
                {prevLoading && <p className="text-xs text-gray-400 dark:text-slate-500">Loading...</p>}
              </div>
              <div className="space-y-2">
                {prevFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-slate-800/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary-500" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-200">
                          {f.originalName}
                        </p>
                        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" /> {(f.size / 1024).toFixed(1)} KB
                          </span>
                          <span className="flex items-center gap-1">
                            <Rows3 className="h-3 w-3" /> {f.rowCount?.toLocaleString() || 0} rows
                          </span>
                          <span className="flex items-center gap-1">
                            <Columns3 className="h-3 w-3" /> {f.columns?.length || 0} cols
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(f.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => navigate(`/mapping/${f.id}`)}
                        className="btn-secondary text-xs"
                      >
                        Map
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${f.originalName}"? This action cannot be undone.`)) {
                            handleDelete(f.id);
                          }
                        }}
                        disabled={deleting === f.id}
                        className="btn-danger text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deleting === f.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
