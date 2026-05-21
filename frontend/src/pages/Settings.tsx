import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Sun, Moon, User, Shield, Bell, Key, Download, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsService } from '../services/notifications.service';
import { authService } from '../services/auth.service';
import { WeeklySummaryPreview } from '../components/WeeklySummaryPreview';
import type { NotificationPreferences } from '../types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function Settings() {
  const { theme, setTheme, user } = useAppStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [apiKey, setApiKey] = useState('••••••••••••••••');
  const [showApiKey, setShowApiKey] = useState(false);
  const [defaultFormat, setDefaultFormat] = useState('csv');
  const [defaultDelimiter, setDefaultDelimiter] = useState(',');
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    notificationsService.getPreferences()
      .then(setPrefs)
      .catch(() => toast.error('Failed to load notification preferences'));
  }, []);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await notificationsService.updatePreferences({ [key]: value });
    } catch {
      setPrefs(prefs);
      toast.error('Failed to update preference');
    }
  };

  const handleScheduleChange = async (key: 'weeklySummaryDay' | 'weeklySummaryTime', value: string) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await notificationsService.updatePreferences({ [key]: value });
    } catch {
      setPrefs(prefs);
      toast.error('Failed to update schedule');
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await authService.updateProfile({ name });
      useAppStore.getState().setUser({ ...useAppStore.getState().user!, ...updated });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error('Enter your current password');
      return;
    }
    if (!newPasswordVal || newPasswordVal.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPasswordVal !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await authService.updatePassword({ currentPassword, newPassword: newPasswordVal });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPasswordVal('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to update password');
    } finally {
      setSavingPassword(false);
    }
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
              <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingProfile ? 'Saving...' : 'Save Changes'}
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
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
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
                      value={newPasswordVal}
                      onChange={(e) => setNewPasswordVal(e.target.value)}
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <button onClick={handleUpdatePassword} disabled={savingPassword} className="btn-primary">
                  {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
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
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-slate-700/30">
                <span className="text-sm text-gray-700 dark:text-slate-200">Job completion notifications</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={prefs?.jobCompleted ?? true}
                    onChange={(e) => handleToggle('jobCompleted', e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full dark:bg-slate-600" />
                </label>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-slate-700/30">
                <span className="text-sm text-gray-700 dark:text-slate-200">Job failure alerts</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={prefs?.jobFailed ?? true}
                    onChange={(e) => handleToggle('jobFailed', e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full dark:bg-slate-600" />
                </label>
              </div>

              <div className="rounded-lg bg-gray-50 dark:bg-slate-700/30">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700 dark:text-slate-200">Weekly usage summary</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={prefs?.weeklySummary ?? false}
                      onChange={(e) => handleToggle('weeklySummary', e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full dark:bg-slate-600" />
                  </label>
                </div>
                {prefs?.weeklySummary && (
                  <div className="border-t border-gray-200 px-4 py-3 dark:border-slate-600">
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="flex-1 min-w-[140px]">
                        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Day of Week</label>
                        <select
                          value={prefs.weeklySummaryDay || 'monday'}
                          onChange={(e) => handleScheduleChange('weeklySummaryDay', e.target.value)}
                          className="input-field text-sm"
                        >
                          {DAYS.map(d => (
                            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Time</label>
                        <input
                          type="time"
                          value={prefs.weeklySummaryTime || '09:00'}
                          onChange={(e) => handleScheduleChange('weeklySummaryTime', e.target.value)}
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <button
                          onClick={() => setShowPreview(true)}
                          className="btn-secondary flex items-center gap-1.5 text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                      Summary will be sent every {prefs.weeklySummaryDay || 'Monday'} at {prefs.weeklySummaryTime || '09:00'}.
                      Configure SMTP settings to enable email delivery.
                    </p>
                  </div>
                )}
              </div>
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

      {showPreview && <WeeklySummaryPreview onClose={() => setShowPreview(false)} />}
    </div>
  );
}
