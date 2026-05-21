import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Wand2, Eye } from 'lucide-react';
import type { ColumnInfo } from '../types';
import { templatesService } from '../services/templates.service';

interface FieldBuilderProps {
  open: boolean;
  sourceColumns: ColumnInfo[];
  previewRow?: Record<string, any>;
  onInsert: (expression: string) => void;
  onClose: () => void;
}

interface TransformDef {
  name: string;
  label: string;
  params?: { key: string; label: string; placeholder: string }[];
}

const transformOptions: TransformDef[] = [
  { name: '', label: 'None' },
  { name: 'trim', label: 'Trim' },
  { name: 'upper', label: 'Uppercase' },
  { name: 'lower', label: 'Lowercase' },
  { name: 'substring', label: 'Substring', params: [
    { key: 'start', label: 'Start', placeholder: '0' },
    { key: 'end', label: 'End (optional)', placeholder: 'leave empty' },
  ]},
  { name: 'replace', label: 'Replace', params: [
    { key: 'search', label: 'Search for', placeholder: '-' },
    { key: 'replacement', label: 'Replace with', placeholder: '' },
  ]},
  { name: 'padStart', label: 'Pad Start', params: [
    { key: 'length', label: 'Target length', placeholder: '5' },
    { key: 'char', label: 'Pad char (optional)', placeholder: '0' },
  ]},
  { name: 'padEnd', label: 'Pad End', params: [
    { key: 'length', label: 'Target length', placeholder: '5' },
    { key: 'char', label: 'Pad char (optional)', placeholder: ' ' },
  ]},
  { name: 'concat', label: 'Concat' },
  { name: 'formatDate', label: 'Format Date', params: [
    { key: 'pattern', label: 'Pattern', placeholder: 'yyyyMMdd' },
  ]},
  { name: 'parseDate', label: 'Parse Date' },
  { name: 'round', label: 'Round', params: [
    { key: 'decimals', label: 'Decimals (optional)', placeholder: '0' },
  ]},
  { name: 'formatNumber', label: 'Format Number', params: [
    { key: 'format', label: 'Format', placeholder: '0,0.00' },
  ]},
  { name: 'parseInt', label: 'Parse Int' },
  { name: 'parseFloat', label: 'Parse Float' },
  { name: 'coalesce', label: 'Coalesce' },
  { name: 'if', label: 'If/Else' },
  { name: 'case', label: 'Case' },
  { name: 'switch', label: 'Switch' },
  { name: 'join', label: 'Join', params: [
    { key: 'separator', label: 'Separator', placeholder: '^' },
  ]},
];

export function FieldBuilder({ open, sourceColumns, previewRow, onInsert, onClose }: FieldBuilderProps) {
  const [valueType, setValueType] = useState<'field' | 'literal'>('field');
  const [selectedField, setSelectedField] = useState(sourceColumns[0]?.name || '');
  const [literalText, setLiteralText] = useState('');
  const [wrapType, setWrapType] = useState<'none' | 'if' | 'each'>('none');
  const [conditionField, setConditionField] = useState(selectedField || '');
  const [selectedTransform, setSelectedTransform] = useState('');
  const [transformParams, setTransformParams] = useState<Record<string, string>>({});
  const [renderedValue, setRenderedValue] = useState('');
  const [rendering, setRendering] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const selectedTransformDef = useMemo(
    () => transformOptions.find((t) => t.name === selectedTransform),
    [selectedTransform],
  );

  const builtExpression = useMemo(() => {
    const inner = valueType === 'field' ? selectedField : literalText;
    if (!inner.trim()) return '';

    let token: string;
    if (selectedTransform && selectedTransformDef) {
      const args = [inner];
      if (selectedTransformDef.params) {
        for (const p of selectedTransformDef.params) {
          const val = transformParams[p.key]?.trim();
          if (val) args.push(val);
        }
      }
      token = `{{${selectedTransform}(${args.join(', ')})}}`;
    } else {
      token = `{{${inner}}}`;
    }

    if (wrapType === 'each') {
      const cond = conditionField.trim() || selectedField;
      token = `{{#each ${cond}}}${token}{{/each}}`;
    } else if (wrapType === 'if') {
      const cond = conditionField.trim() || selectedField;
      token = `{{#if ${cond}}}${token}{{/if}}`;
    }

    return token;
  }, [valueType, selectedField, literalText, wrapType, conditionField, selectedTransform, selectedTransformDef, transformParams]);

  useEffect(() => {
    if (!builtExpression || !previewRow || wrapType !== 'none') {
      setRenderedValue('');
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setRendering(true);
      try {
        const res = await templatesService.renderInline(builtExpression, { row: previewRow, index: 0 });
        setRenderedValue(res.output);
      } catch {
        setRenderedValue('');
      } finally {
        setRendering(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [builtExpression, previewRow, wrapType]);

  const handleParamChange = (key: string, value: string) => {
    setTransformParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleFieldChange = (name: string) => {
    setSelectedField(name);
    if (!conditionField || conditionField === selectedField || sourceColumns.some((c) => c.name === conditionField)) {
      setConditionField(name);
    }
  };

  const handleInsert = () => {
    if (!builtExpression) return;
    onInsert(builtExpression);
    onClose();
  };

  const handleClose = () => {
    setValueType('field');
    setSelectedField(sourceColumns[0]?.name || '');
    setLiteralText('');
    setWrapType('none');
    setConditionField('');
    setSelectedTransform('');
    setTransformParams({});
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Field Builder</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Value Source</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="valueType"
                  checked={valueType === 'field'}
                  onChange={() => setValueType('field')}
                  className="text-primary-600"
                />
                Source field
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="valueType"
                  checked={valueType === 'literal'}
                  onChange={() => setValueType('literal')}
                  className="text-primary-600"
                />
                Literal text
              </label>
            </div>
            {valueType === 'field' ? (
              <div>
                <select
                  value={selectedField}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Select a field...</option>
                  {sourceColumns.map((col) => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
                {selectedField && sourceColumns.find((c) => c.name === selectedField) && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                    Type: {sourceColumns.find((c) => c.name === selectedField)?.type}
                    {sourceColumns.find((c) => c.name === selectedField)?.sampleValues?.[0] && (
                      <> — Sample: "{sourceColumns.find((c) => c.name === selectedField)?.sampleValues[0]}"</>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={literalText}
                onChange={(e) => setLiteralText(e.target.value)}
                className="input-field w-full"
                placeholder="Type your literal text..."
              />
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Wrapping</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="wrapType"
                  checked={wrapType === 'none'}
                  onChange={() => setWrapType('none')}
                  className="text-primary-600"
                />
                None
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="wrapType"
                  checked={wrapType === 'if'}
                  onChange={() => setWrapType('if')}
                  className="text-primary-600"
                />
                {'{{#if}}'}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="wrapType"
                  checked={wrapType === 'each'}
                  onChange={() => setWrapType('each')}
                  className="text-primary-600"
                />
                {'{{#each}}'}
              </label>
            </div>
            {wrapType !== 'none' && (
              <select
                value={conditionField}
                onChange={(e) => setConditionField(e.target.value)}
                className="input-field w-full text-sm"
              >
                <option value="">Condition field...</option>
                {sourceColumns.map((col) => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Transformation</label>
            <select
              value={selectedTransform}
              onChange={(e) => {
                setSelectedTransform(e.target.value);
                setTransformParams({});
              }}
              className="input-field w-full"
            >
              {transformOptions.map((t) => (
                <option key={t.name} value={t.name}>{t.label}</option>
              ))}
            </select>
            {selectedTransformDef?.params && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {selectedTransformDef.params.map((p) => (
                  <div key={p.key}>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-slate-400">{p.label}</label>
                    <input
                      type="text"
                      value={transformParams[p.key] || ''}
                      onChange={(e) => handleParamChange(p.key, e.target.value)}
                      className="input-field text-sm"
                      placeholder={p.placeholder}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Preview
              {rendering && <span className="ml-2 text-xs text-gray-400">rendering...</span>}
            </label>
            <div className="space-y-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Expression</p>
                <code className="whitespace-pre-wrap break-all text-sm text-gray-800 dark:text-slate-200">
                  {builtExpression || <span className="text-gray-400">Configure the field above to see a preview...</span>}
                </code>
              </div>
              {previewRow && builtExpression && wrapType === 'none' && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                    <Eye className="h-3 w-3" />
                    Rendered Value
                  </p>
                  <code className="whitespace-pre-wrap break-all text-sm font-medium text-green-800 dark:text-green-200">
                    {renderedValue || (rendering ? '...' : '(empty)')}
                  </code>
                </div>
              )}
              {previewRow && builtExpression && wrapType !== 'none' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Live Preview Not Available
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Conditional and each-wrapped expressions can be previewed in the main Template Editor.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700">
          <button onClick={handleClose} className="btn-secondary">Cancel</button>
          <button onClick={handleInsert} disabled={!builtExpression} className="btn-primary">
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
