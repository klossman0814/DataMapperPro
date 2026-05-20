import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Sun, Moon, User, Shield, Bell, Key, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export function Settings() {
  const { theme, setTheme, user } = useAppStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [apiKey, setApiKey] = useState('••••••••••••••••');
  const [showApiKey, setShowApiKey] = useState(false);
  const [defaultFormat, setDefaultFormat] = useState('csv');
  const [defaultDelimiter, setDefaultDelimiter] = useState(',');

  const handleSaveProfile = () => {
    toast.success('Profile updated');
  };

  const handleGenerateApiKey = () => {
    const key = `dmp_${Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('')}`;
    setApiKey(key);
    setShowApiKey(true);
    toast.success('New API key generated');
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey).then(() => {
      toast.success('API key copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-gray-500 dark:text-slate-400">Manage your application preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary-100 p-2.5 dark:bg-primary-500/10">
                <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  disabled
                />
              </div>
            </div>
            <div className="mt-4">
              <button onClick={handleSaveProfile} className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-500/10">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Current Password
                </label>
                <input
                  type="password"
                  className="input-field max-w-sm"
                  placeholder="Enter current password"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="New password"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <button className="btn-primary">Update Password</button>
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-500/10">
                <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Access</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    readOnly
                    className="input-field font-mono flex-1"
                  />
                  <button onClick={handleCopyApiKey} className="btn-secondary whitespace-nowrap">
                    Copy
                  </button>
                  <button onClick={handleGenerateApiKey} className="btn-primary whitespace-nowrap">
                    <Key className="h-4 w-4" />
                    Generate New
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Use this key to authenticate API requests. Keep it secret and secure.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-500/10">
                <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export Defaults</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Default Output Format
                </label>
                <select
                  value={defaultFormat}
                  onChange={(e) => setDefaultFormat(e.target.value)}
                  className="input-field"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="xml">XML</option>
                  <option value="txt">Text</option>
                  <option value="hl7">HL7</option>
                  <option value="pipe">Pipe-Delimited</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Default Delimiter
                </label>
                <select
                  value={defaultDelimiter}
                  onChange={(e) => setDefaultDelimiter(e.target.value)}
                  className="input-field"
                >
                  <option value=",">Comma (,)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                  <option value=";">Semicolon (;)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-500/10">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Job completion notifications', enabled: true },
                { label: 'Job failure alerts', enabled: true },
                { label: 'Weekly usage summary', enabled: false },
              ].map(({ label, enabled }) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-slate-700/30">
                  <span className="text-sm text-gray-700 dark:text-slate-200">{label}</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      defaultChecked={enabled}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full dark:bg-slate-600" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-500/10">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Sun className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setTheme('dark')}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                  theme === 'dark'
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-600/10 dark:text-primary-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700/50'
                }`}
              >
                <Moon className="h-4 w-4" />
                Dark Mode
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                  theme === 'light'
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-600/10 dark:text-primary-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700/50'
                }`}
              >
                <Sun className="h-4 w-4" />
                Light Mode
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-300">About</h2>
            <div className="space-y-2 text-sm text-gray-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-gray-900 dark:text-slate-300">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Environment</span>
                <span className="text-gray-900 dark:text-slate-300">{import.meta.env.MODE}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
