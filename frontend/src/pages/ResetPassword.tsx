import { useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { SplitSquareHorizontal, Lock, Unlock, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../services/auth.service';
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

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-900">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10">
            <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid reset link</h1>
          <p className="mt-2 text-gray-500 dark:text-slate-400">This link is missing the reset token. Please request a new one.</p>
          <Link to="/forgot-password" className="mt-6 inline-block text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword });
      setDone(true);
      toast.success('Password reset successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-900">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/10">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password reset complete</h1>
          <p className="mt-2 text-gray-500 dark:text-slate-400">You can now sign in with your new password.</p>
          <Link to="/login" className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-500 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <SplitSquareHorizontal className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset your password</h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Enter a new password for your account</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white/50 p-6 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">New Password</label>
              <div className="relative">
                {showPassword ? (
                  <Unlock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                ) : (
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                )}
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex h-1.5 gap-1">
                    {strengthLevels.map((level) => (
                      <div
                        key={level.label}
                        className={`h-full flex-1 rounded-full transition-colors duration-200 ${
                          level.score <= strength.score ? strength.bg : 'bg-gray-200 dark:bg-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${strength.color}`}>{strength.label}</p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              className="btn-primary w-full py-2.5"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
