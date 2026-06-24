import React, { memo } from 'react';

export interface AppFooterProps {
  activeModelLabel: string;
  providerLabel: string;
}

export const AppFooter = memo(function AppFooter({ activeModelLabel, providerLabel }: AppFooterProps) {
  return (
    <footer className="hidden sm:flex flex-shrink-0 items-center justify-center gap-3 border-t border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-[var(--lp-muted)] sm:text-xs">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lp-accent)] shadow-[0_0_10px_var(--lp-accent-glow)]"
            aria-hidden
          />
          <span className="text-[var(--lp-muted)]">Model</span>
          <span className="font-medium text-[var(--lp-accent)]">{activeModelLabel}</span>
        </div>
        <span className="hidden text-[var(--lp-border)] sm:inline" aria-hidden>
          ·
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--lp-muted)]">Provider</span>
          <span className="font-medium capitalize text-[var(--lp-text)]">{providerLabel}</span>
        </div>
      </div>
    </footer>
  );
});
