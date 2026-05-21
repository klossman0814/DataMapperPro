import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, CheckCircle2, ArrowRight, Settings2, Layers } from 'lucide-react';
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
  const [sheetName, setSheetName] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [hasHeader, setHasHeader] = useState(true);

  const handleUploadComplete = async (file: UploadedFileInfo) => {
    setUploadedFile(file);
    await loadPreview(file.id);
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
      )}
    </div>
  );
}
