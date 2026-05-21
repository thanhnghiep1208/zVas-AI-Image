import React from 'react';

export const AnalyticsTabFallback: React.FC = () => (
  <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface)] p-8">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--lp-accent-dim)] border-t-[var(--lp-accent)]" />
    <p className="text-sm text-[var(--lp-muted)]">Đang tải Analytics…</p>
  </div>
);
