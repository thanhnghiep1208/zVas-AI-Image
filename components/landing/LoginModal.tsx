import React, { useState, useCallback } from 'react';
import { LogIn, X, Sparkles } from 'lucide-react';
import { resolveLoginEmail } from '../../utils/authCredentials';

export interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  loginError?: string | null;
  isLoggingIn?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  onLogin,
  loginError,
  isLoggingIn,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void onLogin(resolveLoginEmail(username), password);
    },
    [username, password, onLogin],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm animate-in fade-in zoom-in-95">
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--lp-surface)] p-6 shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)]">
              <Sparkles className="h-[18px] w-[18px] text-[var(--lp-accent)]" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Image ZVAS</h2>
              <p className="text-xs text-gray-500">Đăng nhập để tiếp tục</p>
            </div>
          </div>

          {loginError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-500/35 bg-red-500/[0.08] px-3.5 py-2.5 text-sm text-red-50/95"
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                required
                disabled={isLoggingIn}
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1.5">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                disabled={isLoggingIn}
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--lp-void)] transition hover:bg-slate-100 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {isLoggingIn ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
