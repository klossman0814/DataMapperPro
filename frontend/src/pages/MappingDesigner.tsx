import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Save, Play, Eye, SplitSquareHorizontal, Upload } from 'lucide-react';
import { filesService } from '../services/files.service';
import { jobsService } from '../services/jobs.service';
import { profilesService } from '../services/profiles.service';
import { templatesService } from '../services/templates.service';
import type { Template } from '../services/templates.service';
import { useMappingStore } from '../stores/mappingStore';
import { MappingCanvas } from '../components/MappingCanvas';
import { OutputPreview } from '../components/OutputPreview';
import { TemplateEditor } from '../components/TemplateEditor';
import type { UploadedFileInfo, FieldMapping, OutputFormat } from '../types';
import toast from 'react-hot-toast';

const outputFormats: { value: OutputFormat; label: string }[] = [
  { value: 'txt', label: 'Text' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'hl7', label: 'HL7' },
  { value: 'pipe', label: 'Pipe-Delimited' },
  { value: 'tab', label: 'Tab-Delimited' },
  { value: 'fixedwidth', label: 'Fixed-Width' },
  { value: 'freeform', label: 'Free Form' },
];

export function MappingDesigner() {
  const { fileId } = useParams();
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get('profileId');
  const navigate = useNavigate();
  const store = useMappingStore();

  const [files, setFiles] = useState<UploadedFileInfo[]>([]);
  const [selectedFileId, setSelectedFileId] = useState(fileId || store.uploadedFile?.id || '');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);

  useEffect(() => {
    filesService.list(1, 50).then((res) => setFiles(res.data)).catch(() => {});
    templatesService.list(1, 50).then((res) => setSavedTemplates(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!profileId) return;
    setLoadingProfile(true);
    profilesService.get(profileId)
      .then((profile) => {
        store.setMappings(profile.configurationJson.mappings || []);
        store.setTemplate(profile.template || '');
        store.setProfileName(profile.name);
        store.setProfileDescription(profile.description || '');
        store.setSavedProfileId(profile.id);
        store.setSavedProfileVersion(profile.version);
        if (profile.configurationJson.outputFormat) {
          store.setOutputFormat(profile.configurationJson.outputFormat);
        }
        if (profile.configurationJson.outputOptions?.fileExtension) {
          store.setOutputExtension(profile.configurationJson.outputOptions.fileExtension);
        }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoadingProfile(false));
  }, [profileId]);

  useEffect(() => {
    if (selectedFileId && selectedFileId !== store.uploadedFile?.id) {
      setLoading(true);
      filesService.getFile(selectedFileId)
        .then((file) => {
          store.setUploadedFile(file);
          store.setSourceColumns(file.columns);
        })
        .catch(() => toast.error('Failed to load file'))
        .finally(() => setLoading(false));
    }
  }, [selectedFileId, store]);

  const handleSaveProfile = async () => {
    if (!store.profileName.trim()) {
      toast.error('Enter a profile name');
      return;
    }
    setSaving(true);
    try {
      const opts: Record<string, any> = {};
      if (store.outputExtension.trim()) {
        opts.fileExtension = store.outputExtension.trim();
      }
      const payload: any = {
        name: store.profileName,
        description: store.profileDescription || undefined,
        configurationJson: {
          mappings: store.mappings,
          outputFormat: store.outputFormat,
          outputOptions: Object.keys(opts).length ? opts : undefined,
        },
        template: store.template,
      };
      if (store.savedProfileId) {
        payload.id = store.savedProfileId;
      }
      const saved = await profilesService.save(payload);
      store.setSavedProfileId(saved.id);
      store.setSavedProfileVersion(saved.version);
      toast.success('Profile saved successfully');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRunJob = async () => {
    if (!selectedFileId) {
      toast.error('Select a file first');
      return;
    }
    if (store.mappings.length === 0) {
      toast.error('Add at least one mapping');
      return;
    }
    setRunning(true);
      const opts: Record<string, any> = {};
    if (store.outputExtension.trim()) {
      opts.fileExtension = store.outputExtension.trim();
    }
    try {
      const job = await jobsService.create({
        fileId: selectedFileId,
        template: store.template,
        mappings: store.mappings,
        outputFormat: store.outputFormat,
        outputOptions: Object.keys(opts).length ? opts : undefined,
      });
      toast.success('Job started');
      navigate('/jobs');
    } catch {
      toast.error('Failed to start job');
    } finally {
      setRunning(false);
    }
  };

  const handleGeneratePreview = async () => {
    setGeneratingPreview(true);
    try {
      const fields = store.mappings.map((m) => m.destinationField);
      const hasTemplate = !!store.template;
      let preview = '';

      switch (store.outputFormat) {
        case 'csv': {
          const header = fields.join(',');
          const sampleRow = fields.map((f) => `{{${f}}}`).join(',');
          preview = `${header}\n${sampleRow}\n${sampleRow}`;
          break;
        }
        case 'json': {
          const obj = fields.reduce((acc, f) => ({ ...acc, [f]: `{{${f}}}` }), {});
          preview = hasTemplate
            ? `[ ${store.template} ]`
            : JSON.stringify(obj, null, 2);
          break;
        }
        case 'xml': {
          const elements = fields.map((f) => `  <${f}>{{${f}}}</${f}>`).join('\n');
          preview = `<record>\n${elements}\n</record>`;
          break;
        }
        case 'pipe': {
          const header = fields.join(' | ');
          const sampleRow = fields.map((f) => `{{${f}}}`).join(' | ');
          preview = `${header}\n${sampleRow}\n${sampleRow}`;
          break;
        }
        case 'tab': {
          const header = fields.join('\t');
          const sampleRow = fields.map((f) => `{{${f}}}`).join('\t');
          preview = `${header}\n${sampleRow}\n${sampleRow}`;
          break;
        }
        case 'fixedwidth': {
          const widths = fields.map((f) => Math.max(f.length, 10));
          const header = fields.map((f, i) => f.padEnd(widths[i])).join('');
          const sampleRow = fields.map((f, i) => `{{${f}}}`.padEnd(widths[i])).join('');
          preview = `${header}\n${sampleRow}\n${sampleRow}`;
          break;
        }
        case 'hl7': {
          const segFields = fields.map((f, i) => `${f}|{{${f}}}`).join('|');
          const firstField = fields[0] || 'name';
          preview = `MSH|^~\\&|DataMapperPro|||||RSP^K22|||2.5.1\nPID|||{{id}}||{{${firstField}}}^^^^^^||${segFields}`;
          break;
        }
        case 'freeform': {
          preview = hasTemplate
            ? store.template
            : fields.map((f) => `{{${f}}}`).join('|');
          break;
        }
        default: {
          preview = fields.map((f) => `${f}: {{${f}}}`).join('\n');
        }
      }

      if (hasTemplate && store.outputFormat !== 'json') {
        preview += `\n\n# Template\n${store.template}`;
      }

      store.setOutputPreview(preview);
      toast.success('Preview generated');
    } catch {
      toast.error('Failed to generate preview');
    } finally {
      setGeneratingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mapping Designer</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Map source fields to destination fields</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleGeneratePreview} disabled={generatingPreview} className="btn-secondary">
            {generatingPreview ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : <Eye className="h-4 w-4" />}
            {generatingPreview ? 'Generating...' : 'Preview'}
          </button>
          <button onClick={handleSaveProfile} disabled={saving} className="btn-secondary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button onClick={handleRunJob} disabled={running} className="btn-primary">
            <Play className="h-4 w-4" />
            {running ? 'Starting...' : 'Run Job'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <SplitSquareHorizontal className="h-4 w-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-300">Mappings</h3>
            </div>
            <MappingCanvas
              sourceColumns={store.sourceColumns}
              mappings={store.mappings}
              onMappingsChange={store.setMappings}
            />
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-300">Template</h3>
            <TemplateEditor
              value={store.template}
              onChange={store.setTemplate}
              sourceColumns={store.sourceColumns}
              templates={savedTemplates}
            />
          </div>

          <OutputPreview
            output={store.outputPreview}
            format={store.outputFormat}
            loading={false}
          />
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-300">Source File</h3>
            {files.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-gray-400 dark:text-slate-500">
                <Upload className="h-6 w-6" />
                <p className="text-sm">No files uploaded</p>
                <button onClick={() => navigate('/upload')} className="btn-primary text-xs">
                  Upload File
                </button>
              </div>
            ) : (
              <select
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                className="input-field"
              >
                <option value="">Select a file...</option>
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.originalName} ({f.rowCount} rows)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-300">Output Format</h3>
            <select
              value={store.outputFormat}
              onChange={(e) => store.setOutputFormat(e.target.value as OutputFormat)}
              className="input-field"
            >
              {outputFormats.map((fmt) => (
                <option key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <label className="text-xs text-gray-500 dark:text-slate-400">Extension (optional)</label>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-sm text-gray-400">.</span>
                <input
                  type="text"
                  value={store.outputExtension}
                  onChange={(e) => store.setOutputExtension(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  className="input-field flex-1"
                  placeholder={store.outputFormat === 'freeform' ? 'txt' : store.outputFormat}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-300">Profile Name</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={store.profileName}
                onChange={(e) => store.setProfileName(e.target.value)}
                className="input-field flex-1"
                placeholder="My Mapping Profile"
              />
              {store.savedProfileVersion > 0 && (
                <span className="badge badge-neutral shrink-0">v{store.savedProfileVersion}</span>
              )}
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-500 dark:text-slate-400">Description (optional)</label>
              <textarea
                value={store.profileDescription}
                onChange={(e) => store.setProfileDescription(e.target.value)}
                className="input-field mt-1 resize-none"
                rows={2}
                placeholder="Brief description of this profile..."
              />
            </div>
          </div>

          {store.sourceColumns.length > 0 && (
            <div className="card">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-300">
                Source Columns ({store.sourceColumns.length})
              </h3>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {store.sourceColumns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-slate-700/30"
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-200">{col.name}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-400">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
