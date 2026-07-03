import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { filesService } from '../services/files.service';
import type { UploadedFileInfo } from '../types';

interface FileDropzoneProps {
  onUploadComplete: (file: UploadedFileInfo) => void;
}

export function FileDropzone({ onUploadComplete }: FileDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await filesService.upload(file);
      onUploadComplete(result);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Upload failed';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt', '.tsv'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0]);
      }
    },
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-slate-600 dark:bg-slate-800/30 dark:hover:border-slate-500'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">Uploading...</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Please wait while we process your file</p>
              </div>
            </>
          ) : isDragActive ? (
            <>
              <div className="rounded-xl bg-primary-100 p-4 dark:bg-primary-500/20">
                <Upload className="h-8 w-8 text-primary-500" />
              </div>
              <div>
                <p className="text-lg font-medium text-primary-600 dark:text-primary-400">Drop your file here</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">CSV, Excel, or text files supported</p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-gray-100 p-4 dark:bg-slate-700/50">
                <FileSpreadsheet className={`h-8 w-8 ${isDragActive ? 'text-primary-400' : 'text-gray-400 dark:text-slate-400'}`} />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Drag & drop your file here, or click to browse
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Supports .csv, .xlsx, .xls, .txt, .tsv up to 500MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
