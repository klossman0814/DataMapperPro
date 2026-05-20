import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { filesService } from '../services/files.service';
import type { UploadedFileInfo } from '../types';

export function useFileUpload() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File, options?: {
    sheetName?: string;
    delimiter?: string;
    hasHeader?: boolean;
  }) => {
    setUploading(true);
    setError(null);
    try {
      const result = await filesService.upload(file, options);
      setUploadedFile(result);
      return result;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

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
  });

  const reset = useCallback(() => {
    setUploadedFile(null);
    setError(null);
  }, []);

  return {
    getRootProps,
    getInputProps,
    isDragActive,
    uploadedFile,
    uploading,
    error,
    handleUpload,
    reset,
  };
}
