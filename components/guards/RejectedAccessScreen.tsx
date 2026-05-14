import React from 'react';
import { Ban, LogOut } from 'lucide-react';

export interface RejectedAccessScreenProps {
  onLogout: () => void;
}

export const RejectedAccessScreen: React.FC<RejectedAccessScreenProps> = ({ onLogout }) => (
  <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[var(--lp-void)] p-6 text-center text-[var(--lp-text)]">
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_45%_at_50%_-10%,var(--lp-accent-dim),transparent_55%)]"
      aria-hidden
    />
    <div className="lp-grain pointer-events-none absolute inset-0 opacity-[0.3] mix-blend-overlay" aria-hidden />
    <div className="relative z-10 max-w-md space-y-6">
      <div className="mb-4 inline-block rounded-full bg-red-500/20 p-6">
        <Ban className="h-16 w-16 text-red-400" />
      </div>
      <h1 className="font-display text-3xl font-bold text-red-400">Yêu cầu bị từ chối</h1>
      <p className="text-[var(--lp-muted)]">Rất tiếc, yêu cầu truy cập của bạn đã bị từ chối.</p>
      <button
        type="button"
        onClick={onLogout}
        className="mx-auto flex items-center space-x-2 rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)] px-6 py-2.5 text-[var(--lp-text)] transition-colors hover:border-[var(--lp-border-strong)] hover:bg-[var(--lp-surface-elevated)]"
      >
        <LogOut className="h-5 w-5" />
        <span>Đăng xuất</span>
      </button>
    </div>
  </div>
);
