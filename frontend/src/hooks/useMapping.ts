import { useState, useCallback } from 'react';
import type { FieldMapping, ColumnInfo } from '../types';

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(id|_id|Id)$/i, '');
}

function findBestMatch(field: string, columns: ColumnInfo[]): ColumnInfo | null {
  const normalized = normalizeName(field);
  let best: ColumnInfo | null = null;
  let bestScore = Infinity;
  for (const col of columns) {
    const colNormalized = normalizeName(col.name);
    const dist = levenshteinDistance(normalized, colNormalized);
    const score = dist / Math.max(normalized.length, colNormalized.length);
    if (score < bestScore) {
      bestScore = score;
      best = col;
    }
  }
  return bestScore <= 0.4 ? best : null;
}

export function useMapping() {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  const handleAddMapping = useCallback((mapping: FieldMapping) => {
    setMappings((prev) => [...prev, mapping]);
  }, []);

  const handleRemoveMapping = useCallback((index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateMapping = useCallback((index: number, updates: Partial<FieldMapping>) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    );
  }, []);

  const handleReorderMappings = useCallback((from: number, to: number) => {
    setMappings((prev) => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
  }, []);

  const handleAutoMap = useCallback(
    (destinationFields: string[], sourceColumns: ColumnInfo[]) => {
      const autoMappings: FieldMapping[] = destinationFields.map((field) => {
        const match = findBestMatch(field, sourceColumns);
        return {
          destinationField: field,
          sourceField: match?.name || '',
          transformation: undefined,
        };
      });
      setMappings(autoMappings);
      return autoMappings;
    },
    []
  );

  const resetMappings = useCallback(() => {
    setMappings([]);
  }, []);

  return {
    mappings,
    handleAddMapping,
    handleRemoveMapping,
    handleUpdateMapping,
    handleReorderMappings,
    handleAutoMap,
    resetMappings,
    setMappings,
  };
}
