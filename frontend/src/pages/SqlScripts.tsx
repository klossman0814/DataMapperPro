import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal, Plus, Play, Save, Trash2, ChevronUp, ChevronDown,
  CheckCircle, XCircle, Clock, Database, FileText, AlertCircle,
  ChevronRight, ChevronLeft, Copy, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sqlScriptsService, type ScriptSet, type ScriptStep, type ExecutionResponse } from '../services/sql-scripts.service';
import { databaseConnectionsService } from '../services/database-connections.service';
import type { DatabaseConnection } from '../types';

const EMPTY_STEP = (order: number): ScriptStep => ({
  name: `Step ${order}`,
  sql: '',
  stepOrder: order,
  enabled: true,
});

export function SqlScripts() {
  const [scriptSets, setScriptSets] = useState<ScriptSet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScriptSet | null>(null);
  const [steps, setSteps] = useState<ScriptStep[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

  const loadSets = useCallback(async () => {
    try {
      const sets = await sqlScriptsService.list();
      setScriptSets(sets);
    } catch {
      toast.error('Failed to load script sets');
    }
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      const conns = await databaseConnectionsService.list();
      setConnections(conns);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadSets();
    loadConnections();
  }, [loadSets, loadConnections]);

  const selectSet = useCallback(async (id: string) => {
    try {
      const set = await sqlScriptsService.get(id);
      setSelectedId(id);
      setEditing(set);
      setName(set.name);
      setDescription(set.description || '');
      setSteps(set.steps.map(s => ({ ...s })).sort((a, b) => a.stepOrder - b.stepOrder));
      setSelectedConnectionId(set.connectionId || '');
      setExecResult(null);
      setShowNewForm(false);
    } catch {
      toast.error('Failed to load script set');
    }
  }, []);

  const newSet = () => {
    setSelectedId(null);
    setEditing(null);
    setName('');
    setDescription('');
    setSteps([EMPTY_STEP(1)]);
    setSelectedConnectionId('');
    setExecResult(null);
    setShowNewForm(true);
  };

  const addStep = () => {
    const maxOrder = steps.reduce((max, s) => Math.max(max, s.stepOrder), 0);
    setSteps([...steps, EMPTY_STEP(maxOrder + 1)]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      toast.error('Must have at least one step');
      return;
    }
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setSteps(updated);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSteps(updated.map((s, i) => ({ ...s, stepOrder: i + 1 })));
  };

  const updateStep = (index: number, field: keyof ScriptStep, value: any) => {
    const updated = [...steps];
    (updated[index] as any)[field] = value;
    setSteps(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (steps.some(s => !s.sql.trim())) {
      toast.error('All steps must have SQL content');
      return;
    }
    setSaving(true);
    try {
      if (selectedId) {
        const updated = await sqlScriptsService.update(selectedId, {
          name: name.trim(),
          description: description.trim() || undefined,
          connectionId: selectedConnectionId || undefined,
          steps: steps.map((s, i) => ({
            ...(s.id ? { id: s.id } : {}),
            name: s.name,
            sql: s.sql,
            stepOrder: i + 1,
            enabled: s.enabled ?? true,
          })),
        });
        setEditing(updated);
        setName(updated.name);
        setDescription(updated.description || '');
        setSteps(updated.steps.map(s => ({ ...s })).sort((a, b) => a.stepOrder - b.stepOrder));
        toast.success('Script set saved');
        await loadSets();
      } else {
        const created = await sqlScriptsService.create({
          name: name.trim(),
          description: description.trim() || undefined,
          connectionId: selectedConnectionId || undefined,
          steps: steps.map((s, i) => ({
            name: s.name,
            sql: s.sql,
            stepOrder: i + 1,
            enabled: s.enabled ?? true,
          })),
        });
        setSelectedId(created.id);
        setEditing(created);
        setName(created.name);
        setSteps(created.steps.map(s => ({ ...s })).sort((a, b) => a.stepOrder - b.stepOrder));
        toast.success('Script set created');
        await loadSets();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedConnectionId) {
      toast.error('Select a database connection');
      return;
    }
    if (!selectedId) {
      toast.error('Save the script set first');
      return;
    }
    const enabledSteps = steps.filter(s => s.enabled);
    if (enabledSteps.length === 0) {
      toast.error('No enabled steps to execute');
      return;
    }
    setExecuting(true);
    setExecResult(null);
    try {
      const result = await sqlScriptsService.execute(selectedId, {
        connectionId: selectedConnectionId,
      });
      setExecResult(result);
      if (result.failed > 0) {
        toast.error(`Execution failed at step ${result.results.find(r => !r.success)?.stepName || 'unknown'}`);
      } else {
        toast.success(`All ${result.succeeded} steps completed successfully`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !editing) return;
    if (!window.confirm(`Delete "${editing.name}"? This cannot be undone.`)) return;
    try {
      await sqlScriptsService.remove(selectedId);
      toast.success('Script set deleted');
      setSelectedId(null);
      setEditing(null);
      setShowNewForm(false);
      await loadSets();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleClone = async () => {
    if (!selectedId || !editing) return;
    try {
      await sqlScriptsService.create({
        name: `${editing.name} (copy)`,
        description: editing.description,
        connectionId: editing.connectionId,
        steps: editing.steps.map((s, i) => ({
          name: s.name,
          sql: s.sql,
          stepOrder: i + 1,
          enabled: s.enabled,
        })),
      });
      toast.success('Script set cloned');
      await loadSets();
    } catch {
      toast.error('Failed to clone');
    }
  };

  const toggleResultExpand = (stepId: string) => {
    setExpandedResults(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-indigo-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Execute SQL Script Sets</h1>
        </div>
        <button onClick={newSet} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Script Set
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Script Set List */}
        <div className="w-72 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
          {scriptSets.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              No script sets yet. Click "New Script Set" to create one.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {scriptSets.map(set => (
                <button
                  key={set.id}
                  onClick={() => selectSet(set.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedId === set.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="font-medium truncate">{set.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {set.steps?.length || 0} step{(set.steps?.length || 0) !== 1 ? 's' : ''}
                    {set.connection && ` · ${set.connection.name}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {!editing && !showNewForm ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <Terminal className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a script set or create a new one</p>
              <p className="text-sm mt-1">Define ordered SQL steps to run against a database</p>
            </div>
          ) : (
            <div className="p-6 space-y-6 max-w-4xl">
              {/* Name and Description */}
              <div className="card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedId ? 'Edit Script Set' : 'New Script Set'}
                  </h2>
                  {selectedId && (
                    <div className="flex items-center gap-2">
                      <button onClick={handleClone} className="btn-secondary text-sm flex items-center gap-1.5" title="Clone">
                        <Copy className="w-3.5 h-3.5" /> Clone
                      </button>
                      <button onClick={handleDelete} className="btn-danger text-sm flex items-center gap-1.5" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="input-field w-full"
                      placeholder="My Script Set"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Connection <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <select
                      value={selectedConnectionId}
                      onChange={e => setSelectedConnectionId(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="">-- Select connection --</option>
                      {connections.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="input-field w-full"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* Steps Editor */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold text-gray-900 dark:text-white">
            Steps ({steps.filter(s => s.enabled).length}/{steps.length} enabled)
                  </h3>
                  <button onClick={addStep} className="btn-secondary text-sm flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Step
                  </button>
                </div>

                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 transition-colors ${
                        !step.enabled
                          ? 'border-gray-200 dark:border-gray-700 opacity-60'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                            {step.stepOrder}
                          </span>
                          <input
                            type="text"
                            value={step.name}
                            onChange={e => updateStep(index, 'name', e.target.value)}
                            className="input-field text-sm font-medium px-2 py-1 w-48"
                            placeholder="Step name"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mr-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.enabled ?? true}
                              onChange={e => updateStep(index, 'enabled', e.target.checked)}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            Enabled
                          </label>
                          <button
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === steps.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeStep(index)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={step.sql}
                        onChange={e => updateStep(index, 'sql', e.target.value)}
                        className="input-field w-full font-mono text-sm"
                        rows={4}
                        placeholder="Enter SQL statement..."
                        spellCheck={false}
                      />
                    </div>
                  ))}
                </div>

                {steps.length === 0 && (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No steps yet. Click "Add Step" to create one.</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedConnectionId}
                    onChange={e => setSelectedConnectionId(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">-- Select connection --</option>
                    {connections.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleExecute}
                    disabled={executing || !selectedConnectionId || !selectedId}
                    className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  >
                    <Play className="w-4 h-4" /> {executing ? 'Running...' : 'Execute'}
                  </button>
                </div>
              </div>

              {/* Execution Results */}
              {execResult && (
                <div className="card p-4 border-2 border-indigo-200 dark:border-indigo-800">
                  <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-500" />
                    Execution Results
                  </h3>
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Connection: <strong>{connections.find(c => c.id === selectedConnectionId)?.name || 'Unknown'}</strong>
                    </span>
                    <span className={`flex items-center gap-1 ${execResult.failed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {execResult.failed > 0 ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {execResult.succeeded}/{execResult.totalSteps} steps passed
                    </span>
                  </div>

                  <div className="space-y-2">
                    {execResult.results.map((r) => (
                      <div
                        key={r.stepId}
                        className={`border rounded-lg overflow-hidden ${
                          r.success
                            ? 'border-green-200 dark:border-green-800'
                            : 'border-red-200 dark:border-red-800'
                        }`}
                      >
                        <button
                          onClick={() => toggleResultExpand(r.stepId)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            {r.success ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">{r.stepName}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {r.durationMs}ms
                            </span>
                            {r.success && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {r.rowsAffected ?? 0} rows affected
                              </span>
                            )}
                          </div>
                          {expandedResults[r.stepId] ? (
                            <ChevronLeft className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        {expandedResults[r.stepId] && !r.success && r.error && (
                          <div className="px-4 pb-3">
                            <pre className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto">
                              {r.error}
                            </pre>
                          </div>
                        )}
                        {expandedResults[r.stepId] && r.success && (
                          <div className="px-4 pb-3 text-xs text-green-600 dark:text-green-400">
                            Completed successfully in {r.durationMs}ms
                            {r.rowsAffected !== undefined && ` · ${r.rowsAffected} rows affected`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
