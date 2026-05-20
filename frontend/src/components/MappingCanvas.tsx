import { useState, useCallback, useRef } from 'react';
import { Plus, Trash2, GripVertical, Wand2, Columns } from 'lucide-react';
import type { ColumnInfo, FieldMapping } from '../types';

interface MappingCanvasProps {
  sourceColumns: ColumnInfo[];
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
}

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

const transformOptions = [
  { category: 'String', options: [
    { value: 'trim', label: 'Trim' },
    { value: 'upper', label: 'Uppercase' },
    { value: 'lower', label: 'Lowercase' },
    { value: 'substring', label: 'Substring' },
    { value: 'replace', label: 'Replace' },
    { value: 'padStart', label: 'Pad Start' },
    { value: 'padEnd', label: 'Pad End' },
    { value: 'concat', label: 'Concat' },
  ]},
  { category: 'Date', options: [
    { value: 'formatDate', label: 'Format Date' },
    { value: 'parseDate', label: 'Parse Date' },
  ]},
  { category: 'Numeric', options: [
    { value: 'round', label: 'Round' },
    { value: 'formatNumber', label: 'Format Number' },
    { value: 'parseInt', label: 'Parse Int' },
    { value: 'parseFloat', label: 'Parse Float' },
  ]},
  { category: 'Logic', options: [
    { value: 'coalesce', label: 'Coalesce' },
    { value: 'if', label: 'If/Else' },
    { value: 'case', label: 'Case' },
    { value: 'switch', label: 'Switch' },
  ]},
];

export function MappingCanvas({ sourceColumns, mappings, onMappingsChange }: MappingCanvasProps) {
  const [destinationField, setDestinationField] = useState('');
  const [showAutoMap, setShowAutoMap] = useState(false);
  const [autoFields, setAutoFields] = useState('');
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleAddMapping = () => {
    if (!destinationField.trim()) return;
    const newMapping: FieldMapping = {
      destinationField: destinationField.trim(),
      sourceField: '',
      transformation: undefined,
    };
    onMappingsChange([...mappings, newMapping]);
    setDestinationField('');
  };

  const handleUpdateMapping = (index: number, updates: Partial<FieldMapping>) => {
    const updated = mappings.map((m, i) => (i === index ? { ...m, ...updates } : m));
    onMappingsChange(updated);
  };

  const handleRemoveMapping = (index: number) => {
    onMappingsChange(mappings.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const updated = [...mappings];
    const [removed] = updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, removed);
    onMappingsChange(updated);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleAutoMap = () => {
    const fields = autoFields.split(',').map((f) => f.trim()).filter(Boolean);
    if (fields.length === 0) return;
    const autoMappings: FieldMapping[] = fields.map((field) => {
      const match = findBestMatch(field, sourceColumns);
      return {
        destinationField: field,
        sourceField: match?.name || '',
        transformation: undefined,
      };
    });
    onMappingsChange(autoMappings);
    setShowAutoMap(false);
    setAutoFields('');
  };

  const handleDropOnMapping = (sourceColName: string, targetIndex: number) => {
    const updated = mappings.map((m, i) =>
      i === targetIndex ? { ...m, sourceField: sourceColName } : m
    );
    onMappingsChange(updated);
  };

  return (
    <div className="flex gap-6">
      <div className="w-64 shrink-0">
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <Columns className="h-4 w-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">
              Source Columns ({sourceColumns.length})
            </h3>
          </div>
          <div className="space-y-1">
            {sourceColumns.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400 dark:text-slate-500">
                No columns available
              </p>
            ) : (
              sourceColumns.map((col) => (
                <div
                  key={col.name}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', col.name);
                  }}
                  className="cursor-grab rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:border-primary-300 hover:bg-primary-50 active:cursor-grabbing dark:border-slate-600 dark:bg-slate-700/30 dark:hover:border-primary-500 dark:hover:bg-primary-500/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700 dark:text-slate-200">{col.name}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-400">{col.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">
              Field Mappings ({mappings.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAutoMap(true)}
                className="btn-secondary text-xs"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Auto-Map
              </button>
            </div>
          </div>

          {showAutoMap && (
            <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-500/30 dark:bg-primary-500/10">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Destination fields (comma-separated)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={autoFields}
                  onChange={(e) => setAutoFields(e.target.value)}
                  className="input-field flex-1"
                  placeholder="first_name, last_name, email"
                />
                <button onClick={handleAutoMap} className="btn-primary text-sm">
                  Map
                </button>
                <button onClick={() => setShowAutoMap(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={destinationField}
              onChange={(e) => setDestinationField(e.target.value)}
              className="input-field flex-1"
              placeholder="New destination field name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMapping();
              }}
            />
            <button onClick={handleAddMapping} className="btn-primary whitespace-nowrap">
              <Plus className="h-4 w-4" />
              Add Mapping
            </button>
          </div>

          {mappings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-gray-400 dark:text-slate-500">
              <Columns className="h-10 w-10" />
              <p className="text-sm">No mappings yet. Add a destination field or use Auto-Map.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map((mapping, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <button className="cursor-grab text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Destination</label>
                        <input
                          type="text"
                          value={mapping.destinationField}
                          onChange={(e) => handleUpdateMapping(index, { destinationField: e.target.value })}
                          className="input-field text-sm"
                        />
                      </div>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const colName = e.dataTransfer.getData('text/plain');
                          if (colName) handleDropOnMapping(colName, index);
                        }}
                      >
                        <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Source Field</label>
                        <select
                          value={mapping.sourceField || ''}
                          onChange={(e) => handleUpdateMapping(index, { sourceField: e.target.value })}
                          className="input-field text-sm"
                        >
                          <option value="">Select source...</option>
                          {sourceColumns.map((col) => (
                            <option key={col.name} value={col.name}>
                              {col.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMapping(index)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Transformation</label>
                      <select
                        value={mapping.transformation || ''}
                        onChange={(e) => handleUpdateMapping(index, { transformation: e.target.value || undefined })}
                        className="input-field text-sm"
                      >
                        <option value="">None</option>
                        {transformOptions.map((group) => (
                          <optgroup key={group.category} label={group.category}>
                            {group.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Expression / Constant</label>
                      <input
                        type="text"
                        value={mapping.expression || mapping.constant || ''}
                        onChange={(e) =>
                          handleUpdateMapping(index, {
                            expression: e.target.value,
                            constant: e.target.value,
                          })
                        }
                        className="input-field text-sm"
                        placeholder="e.g., {{row.field_name}}"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
