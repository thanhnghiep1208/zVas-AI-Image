import React from 'react';

export const AuthLoadingScreen: React.FC = () => (
  <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[var(--lp-void)]">
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,var(--lp-accent-dim),transparent_60%)]"
      aria-hidden
    />
    <div className="lp-grain pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay" aria-hidden />
    <div
      className="relative z-10 h-12 w-12 animate-spin rounded-full border-2 border-[var(--lp-accent-dim)] border-t-[var(--lp-accent)]"
      aria-hidden
    />
  </div>
);
