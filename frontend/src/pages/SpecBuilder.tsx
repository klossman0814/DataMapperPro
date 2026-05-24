import { useState, useRef } from 'react';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface SpecFieldRow {
  id: number;
  fieldNumber: number;
  subFieldNumber: string;
  fieldName: string;
  required: boolean;
  repeating: boolean;
  delimiter: string;
  include: boolean;
}

let nextId = 1;

function emptyRow(): SpecFieldRow {
  return { id: nextId++, fieldNumber: 1, subFieldNumber: '', fieldName: '', required: true, repeating: false, delimiter: ',', include: true };
}

export function SpecBuilder() {
  const [specName, setSpecName] = useState('');
  const [rows, setRows] = useState<SpecFieldRow[]>([emptyRow()]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/spec-builder/parse', formData);
      const { name, fields } = res.data;
      setSpecName(name || '');
      nextId = 1;
      setRows(fields.map((f: any) => ({ ...f, id: nextId++ })));
      if (!rows.length) addRow();
      toast.success('Spec imported');
    } catch {
      toast.error('Import failed');
    }
    e.target.value = '';
  };

  const addRow = () => {
    setRows(prev => [...prev, { ...emptyRow(), fieldNumber: prev.length + 1 }]);
  };

  const deleteRow = (id: number) => {
    setRows(prev => {
      const filtered = prev.filter(r => r.id !== id);
      return filtered.map((r, i) => ({ ...r, fieldNumber: i + 1 }));
    });
  };

  const updateRow = (id: number, partial: Partial<SpecFieldRow>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...partial } : r)));
  };

  const handleExport = async () => {
    if (!specName.trim()) { toast.error('Enter a spec name'); return; }
    if (!rows.some(r => r.fieldName.trim())) { toast.error('Add at least one field with a name'); return; }
    try {
      const res = await api.post('/spec-builder/export', {
        name: specName,
        fields: rows.map(({ id, ...f }) => f),
      }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${specName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Spec exported');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spec Builder</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Create a specification spreadsheet for use in Spec Evaluator
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Spec Name</label>
            <input value={specName} onChange={e => setSpecName(e.target.value)} placeholder="e.g. HL7 Admission Spec" className="input-field text-sm" />
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm mt-5">
            <Upload className="h-4 w-4" /> Import
          </button>
          <button onClick={handleExport} className="btn-primary text-sm mt-5">
            <Download className="h-4 w-4" /> Export to Excel
          </button>
        </div>

        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-3 py-2 font-medium text-gray-500 text-xs">Field #</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-xs">Sub-Field #</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-xs">Field Name</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-xs">Required</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-xs">Repeating</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-xs">Delimiter</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-xs">Include</th>
                <th className="px-3 py-2 font-medium text-gray-500 text-xs w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-1.5">
                    <input type="number" min="1" value={row.fieldNumber} onChange={e => updateRow(row.id, { fieldNumber: parseInt(e.target.value) || 1 })}
                      className="w-16 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input value={row.subFieldNumber} onChange={e => updateRow(row.id, { subFieldNumber: e.target.value })}
                      className="w-16 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input value={row.fieldName} onChange={e => updateRow(row.id, { fieldName: e.target.value })}
                      placeholder="field_name" className="w-40 rounded border border-gray-200 px-2 py-1 text-xs font-mono dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  </td>
                  <td className="px-3 py-1.5">
                    <button onClick={() => updateRow(row.id, { required: !row.required })}
                      className={`rounded px-2 py-1 text-xs font-medium ${row.required ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      {row.required ? 'Y' : 'N'}
                    </button>
                  </td>
                  <td className="px-3 py-1.5">
                    <button onClick={() => updateRow(row.id, { repeating: !row.repeating })}
                      className={`rounded px-2 py-1 text-xs font-medium ${row.repeating ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      {row.repeating ? 'Y' : 'N'}
                    </button>
                  </td>
                  <td className="px-3 py-1.5">
                    <input value={row.delimiter} onChange={e => updateRow(row.id, { delimiter: e.target.value })}
                      className="w-12 rounded border border-gray-200 px-2 py-1 text-xs font-mono text-center dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  </td>
                  <td className="px-3 py-1.5">
                    <button onClick={() => updateRow(row.id, { include: !row.include })}
                      className={`rounded px-2 py-1 text-xs font-medium ${row.include ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      {row.include ? 'Y' : 'N'}
                    </button>
                  </td>
                  <td className="px-3 py-1.5">
                    <button onClick={() => deleteRow(row.id)} className="rounded p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={addRow} className="btn-secondary text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Field
        </button>
      </div>
    </div>
  );
}
