import { useState, useRef } from 'react';
import { Plus, Trash2, GripVertical, Wand2, Columns, XCircle, ChevronDown, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import type { ColumnInfo, FieldMapping } from '../types';

interface MappingCanvasProps {
  sourceColumns: ColumnInfo[];
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
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
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set(mappings.map((_, i) => i)));
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const allExpanded = mappings.length > 0 && expandedRows.size === mappings.length;
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(mappings.map((_, i) => i)));
    }
  };

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
    const autoMappings: FieldMapping[] = sourceColumns.map((col) => ({
      destinationField: col.name,
      sourceField: col.name,
      transformation: undefined,
    }));
    onMappingsChange(autoMappings);
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
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">
                Field Mappings ({mappings.length})
              </h3>
              <div className="flex gap-2">
                {mappings.length > 1 && (
                  <button
                    onClick={toggleAll}
                    className="btn-secondary text-xs"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    {allExpanded ? 'Collapse All' : 'Expand All'}
                  </button>
                )}
                <button
                  onClick={handleAutoMap}
                  className="btn-secondary text-xs"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Auto-Map
                </button>
                {mappings.length > 0 && (
                  <button
                    onClick={() => setShowClearDialog(true)}
                    className="btn-danger text-xs"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

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
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {mappings.map((mapping, index) => {
                const isExpanded = expandedRows.has(index);
                const sourceName = mapping.sourceField || '(not set)';
                const hasTransform = !!mapping.transformation;
                return (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/50 ${isExpanded ? 'p-4' : 'p-2.5'}`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRow(index)}
                        className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <button className="cursor-grab text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
                        <GripVertical className="h-4 w-4" />
                      </button>

                      {isExpanded ? (
                        <>
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
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-1 items-center gap-2 min-w-0">
                            <span className="truncate text-sm font-medium text-gray-800 dark:text-slate-200">
                              {mapping.destinationField}
                            </span>
                            <span className="text-gray-300 dark:text-slate-600 shrink-0">&larr;</span>
                            <span className="truncate text-sm text-gray-500 dark:text-slate-400">
                              {sourceName}
                            </span>
                            {hasTransform && (
                              <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                                {mapping.transformation}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveMapping(index)}
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                    {isExpanded && (
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showClearDialog}
        title="Clear All Mappings"
        message="Are you sure you want to remove all field mappings? This action cannot be undone."
        confirmLabel="Clear All"
        variant="warning"
        onConfirm={() => {
          onMappingsChange([]);
          setShowClearDialog(false);
        }}
        onCancel={() => setShowClearDialog(false)}
      />
    </div>
  );
}
