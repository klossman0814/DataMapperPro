import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FunctionSquare } from 'lucide-react';
import type { ColumnInfo } from '../types';

interface TransformFunctionSelectorProps {
  value: string;
  onChange: (expr: string) => void;
  sourceColumns: ColumnInfo[];
}

interface TransformGroup {
  category: string;
  functions: {
    name: string;
    label: string;
    template: string;
    description: string;
  }[];
}

const transformGroups: TransformGroup[] = [
  {
    category: 'String',
    functions: [
      { name: 'trim', label: 'Trim', template: 'trim({{source}})', description: 'Remove whitespace' },
      { name: 'upper', label: 'Uppercase', template: 'upper({{source}})', description: 'Convert to uppercase' },
      { name: 'lower', label: 'Lowercase', template: 'lower({{source}})', description: 'Convert to lowercase' },
      { name: 'substring', label: 'Substring', template: 'substring({{source}}, start, length)', description: 'Extract substring' },
      { name: 'replace', label: 'Replace', template: 'replace({{source}}, "old", "new")', description: 'Replace text' },
      { name: 'padStart', label: 'Pad Start', template: 'padStart({{source}}, length, "char")', description: 'Pad string start' },
      { name: 'padEnd', label: 'Pad End', template: 'padEnd({{source}}, length, "char")', description: 'Pad string end' },
      { name: 'concat', label: 'Concat', template: 'concat({{source}}, " ", {{source2}})', description: 'Concatenate values' },
    ],
  },
  {
    category: 'Date',
    functions: [
      { name: 'formatDate', label: 'Format Date', template: 'formatDate({{source}}, "YYYY-MM-DD")', description: 'Format date value' },
      { name: 'parseDate', label: 'Parse Date', template: 'parseDate({{source}}, "MM/DD/YYYY")', description: 'Parse date string' },
    ],
  },
  {
    category: 'Numeric',
    functions: [
      { name: 'round', label: 'Round', template: 'round({{source}}, decimals)', description: 'Round number' },
      { name: 'formatNumber', label: 'Format Number', template: 'formatNumber({{source}}, "#,##0.00")', description: 'Format number' },
      { name: 'parseInt', label: 'Parse Int', template: 'parseInt({{source}})', description: 'Parse integer' },
      { name: 'parseFloat', label: 'Parse Float', template: 'parseFloat({{source}})', description: 'Parse float' },
    ],
  },
  {
    category: 'Logic',
    functions: [
      { name: 'coalesce', label: 'Coalesce', template: 'coalesce({{source}}, "default")', description: 'First non-null value' },
      { name: 'if', label: 'If/Else', template: 'if(condition, trueVal, falseVal)', description: 'Conditional value' },
      { name: 'case', label: 'Case', template: 'case({{source}}, val1: result1, val2: result2)', description: 'Case expression' },
      { name: 'switch', label: 'Switch', template: 'switch(expr, case1: val1, default: val)', description: 'Switch expression' },
    ],
  },
];

export function TransformFunctionSelector({ value, onChange, sourceColumns }: TransformFunctionSelectorProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (template: string) => {
    onChange(template);
    setOpen(false);
  };

  const insertSourceColumn = (colName: string) => {
    onChange(value ? `${value} {{${colName}}}` : `{{${colName}}}`);
  };

  return (
    <div className="space-y-3">
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="input-field flex items-center justify-between text-left"
        >
          <span className={value ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}>
            {value || 'Select transformation...'}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
            <button
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-700/50"
            >
              None (no transformation)
            </button>
            {transformGroups.map((group) => (
              <div key={group.category}>
                <button
                  onClick={() => setOpenGroup(openGroup === group.category ? null : group.category)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-700/50"
                >
                  {group.category}
                  <ChevronDown className={`h-3 w-3 transition-transform ${openGroup === group.category ? 'rotate-180' : ''}`} />
                </button>
                {(openGroup === group.category || openGroup === null) && (
                  <div>
                    {group.functions.map((fn) => (
                      <button
                        key={fn.name}
                        onClick={() => handleSelect(fn.template)}
                        className={`flex w-full items-center gap-2 px-6 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                          value === fn.template
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                            : 'text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        <FunctionSquare className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <div>
                          <span className="font-medium">{fn.label}</span>
                          <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">{fn.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {value && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-600 dark:bg-slate-700/30">
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-slate-400">
            Expression
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input-field font-mono text-xs"
            placeholder="Edit expression..."
          />
          {sourceColumns.length > 0 && (
            <div className="mt-2">
              <label className="mb-1 block text-xs text-gray-400 dark:text-slate-500">
                Insert column:
              </label>
              <div className="flex flex-wrap gap-1">
                {sourceColumns.map((col) => (
                  <button
                    key={col.name}
                    onClick={() => insertSourceColumn(col.name)}
                    className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs font-mono text-primary-600 hover:bg-primary-50 dark:border-slate-600 dark:bg-slate-800 dark:text-primary-400 dark:hover:bg-primary-500/10"
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
