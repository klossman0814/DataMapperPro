import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SplitSquareHorizontal, Mail, Lock, Unlock, UserPlus, LogIn, Sparkles } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useAppStore } from '../stores/appStore';
import { setAuthToken } from '../services/api';
import toast from 'react-hot-toast';

type StrengthLevel = { label: string; color: string; bg: string; score: number };

const strengthLevels: StrengthLevel[] = [
  { label: 'Very Weak', color: 'text-red-500', bg: 'bg-red-500', score: 0 },
  { label: 'Weak', color: 'text-orange-500', bg: 'bg-orange-500', score: 1 },
  { label: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-500', score: 2 },
  { label: 'Strong', color: 'text-lime-500', bg: 'bg-lime-500', score: 3 },
  { label: 'Very Strong', color: 'text-emerald-500', bg: 'bg-emerald-500', score: 4 },
];

function getPasswordStrength(pw: string): StrengthLevel {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return strengthLevels[Math.min(score, strengthLevels.length - 1)];
}

function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%&*+-=_';
  const all = upper + lower + digits + special;
  const required = [upper, lower, digits, special];
  const pw: string[] = required.map((chars) => chars[Math.floor(Math.random() * chars.length)]);
  while (pw.length < 24) {
    pw.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pw.sort(() => Math.random() - 0.5).join('');
}

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const res = await authService.register({ email, password, name });
        setAuthToken(res.access_token);
        setUser(res.user);
        toast.success('Account created successfully');
      } else {
        const res = await authService.login({ email, password });
        setAuthToken(res.access_token);
        setUser(res.user);
        toast.success('Welcome back');
      }
      navigate('/');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <SplitSquareHorizontal className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">DataMapper Pro</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">
            {isRegister ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white/50 p-6 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Your name"
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Password</label>
              <div className="relative">
                {showPassword ? (
                  <Unlock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                ) : (
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                )}
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-20"
                  placeholder="••••••••"
                  required
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </button>
                  {isRegister && (
                    <button
                      type="button"
                      onClick={() => setPassword(generatePassword())}
                      className="rounded p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                      tabIndex={-1}
                      title="Generate strong password"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {isRegister && password && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex h-1.5 gap-1">
                    {strengthLevels.map((level) => (
                      <div
                        key={level.label}
                        className={`h-full flex-1 rounded-full transition-colors duration-200 ${
                          level.score <= getPasswordStrength(password).score
                            ? getPasswordStrength(password).bg
                            : 'bg-gray-200 dark:bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${getPasswordStrength(password).color}`}>
                    {getPasswordStrength(password).label}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isRegister ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  {isRegister ? 'Create Account' : 'Sign In'}
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
