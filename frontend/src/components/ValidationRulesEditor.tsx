import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { ColumnInfo, ValidationRule } from '../types';

interface ValidationRulesEditorProps {
  rules: ValidationRule[];
  onChange: (rules: ValidationRule[]) => void;
  columns?: ColumnInfo[];
}

const ruleTypes = [
  { value: 'required', label: 'Required' },
  { value: 'maxLength', label: 'Max Length' },
  { value: 'regex', label: 'Regex Pattern' },
  { value: 'date', label: 'Date Format' },
  { value: 'lookup', label: 'Lookup Values' },
] as const;

export function ValidationRulesEditor({ rules, onChange, columns }: ValidationRulesEditorProps) {
  const handleAdd = () => {
    const newRule: ValidationRule = {
      field: columns?.[0]?.name || '',
      type: 'required',
      value: '',
      message: '',
    };
    onChange([...rules, newRule]);
  };

  const handleUpdate = (index: number, updates: Partial<ValidationRule>) => {
    const updated = rules.map((r, i) => (i === index ? { ...r, ...updates } : r));
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const renderValueInput = (rule: ValidationRule, index: number) => {
    switch (rule.type) {
      case 'regex':
        return (
          <input
            type="text"
            value={rule.value || ''}
            onChange={(e) => handleUpdate(index, { value: e.target.value })}
            className="input-field font-mono text-xs"
            placeholder="/^[A-Z]+$/i"
          />
        );
      case 'maxLength':
        return (
          <input
            type="number"
            min={1}
            value={rule.value || ''}
            onChange={(e) => handleUpdate(index, { value: e.target.value })}
            className="input-field"
            placeholder="100"
          />
        );
      case 'lookup':
        return (
          <input
            type="text"
            value={rule.value || ''}
            onChange={(e) => handleUpdate(index, { value: e.target.value })}
            className="input-field"
            placeholder="val1, val2, val3"
          />
        );
      case 'date':
        return (
          <input
            type="text"
            value={rule.value || ''}
            onChange={(e) => handleUpdate(index, { value: e.target.value })}
            className="input-field"
            placeholder="YYYY-MM-DD"
          />
        );
      default:
        return null;
    }
  };

  const renderValueHint = (type: ValidationRule['type']) => {
    switch (type) {
      case 'regex': return 'Regex pattern';
      case 'maxLength': return 'Maximum characters';
      case 'lookup': return 'Comma-separated values';
      case 'date': return 'Expected date format';
      default: return '';
    }
  };

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">
            Validation Rules ({rules.length})
          </h3>
        </div>
        <button onClick={handleAdd} className="btn-secondary text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-gray-400 dark:text-slate-500">
          <AlertTriangle className="h-6 w-6" />
          <p className="text-sm">No validation rules defined</p>
          <p className="text-xs">Add rules to validate output data before processing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Field</label>
                  {columns ? (
                    <select
                      value={rule.field}
                      onChange={(e) => handleUpdate(index, { field: e.target.value })}
                      className="input-field text-sm"
                    >
                      {columns.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={rule.field}
                      onChange={(e) => handleUpdate(index, { field: e.target.value })}
                      className="input-field text-sm"
                      placeholder="field_name"
                    />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Type</label>
                  <select
                    value={rule.type}
                    onChange={(e) => handleUpdate(index, { type: e.target.value as ValidationRule['type'], value: '' })}
                    className="input-field text-sm"
                  >
                    {ruleTypes.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">
                    {renderValueHint(rule.type) || 'Value'}
                  </label>
                  {renderValueInput(rule, index)}
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">Error Message</label>
                    <input
                      type="text"
                      value={rule.message || ''}
                      onChange={(e) => handleUpdate(index, { message: e.target.value })}
                      className="input-field text-sm"
                      placeholder="Field is invalid"
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(index)}
                    className="mb-0.5 rounded-lg p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
