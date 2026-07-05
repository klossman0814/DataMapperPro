import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Copy, Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { templatesService } from '../services/templates.service';
import toast from 'react-hot-toast';

export function TemplateGenerator() {
  const navigate = useNavigate();
  const [sampleOutput, setSampleOutput] = useState('');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!sampleOutput.trim()) {
      toast.error('Paste a sample output first');
      return;
    }
    setLoading(true);
    setError('');
    setGeneratedTemplate('');
    try {
      const result = await templatesService.generateTemplate(sampleOutput);
      setGeneratedTemplate(result.template);
      toast.success('Template generated');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Generation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSendToEditor = () => {
    try {
      localStorage.setItem('templateEditorContent', generatedTemplate);
      navigate('/template');
    } catch {
      toast.error('Failed to save template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Template Generator</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Paste a sample of your desired extract output and let AI generate a DataMapper Pro template for it.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Sample Output
          </label>
          <textarea
            value={sampleOutput}
            onChange={(e) => setSampleOutput(e.target.value)}
            className="input-field w-full resize-y font-mono text-sm"
            rows={18}
            placeholder={`Paste your desired output extract here, for example:\n\n001,John|Doe|19800101|M\n002,Jane|Smith|19850215|F`}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading || !sampleOutput.trim()}
              className="btn-primary"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Lightbulb className="h-4 w-4" /> Generate Template</>
              )}
            </button>
            {sampleOutput && (
              <button
                onClick={() => setSampleOutput('')}
                className="btn-secondary text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Generated Template
            </label>
            {generatedTemplate && (
              <div className="flex gap-2">
                <button onClick={handleCopy} className="btn-secondary text-xs">
                  {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                </button>
                <button onClick={handleSendToEditor} className="btn-primary text-xs">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Template Editor
                </button>
              </div>
            )}
          </div>
          {error ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Generation failed</p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
                {error.includes('API key') && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                    Set the <code className="rounded bg-red-100 px-1 dark:bg-red-800">OPENAI_API_KEY</code> environment variable in your backend configuration.
                  </p>
                )}
              </div>
            </div>
          ) : generatedTemplate ? (
            <textarea
              readOnly
              value={generatedTemplate}
              className="input-field w-full resize-y font-mono text-sm"
              rows={18}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
              <Lightbulb className="mb-3 h-10 w-10" />
              {loading ? (
                <p className="text-sm">Analyzing sample output...</p>
              ) : (
                <>
                  <p className="text-sm font-medium">No template generated yet</p>
                  <p className="mt-1 text-xs">Paste sample output on the left and click Generate Template</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-200">Tips for best results</h3>
        <ul className="space-y-1.5 text-sm text-gray-600 dark:text-slate-400">
          <li>• Include 3-5 rows of sample data so the AI can infer patterns</li>
          <li>• Show variations: rows with different field values help identify conditional sections</li>
          <li>• If some fields are optional, include rows both with and without them</li>
          <li>• The generated template uses placeholder field names — you can rename them in the Template Editor</li>
          <li>• Complex transforms may need manual adjustments — review the output</li>
        </ul>
      </div>
    </div>
  );
}