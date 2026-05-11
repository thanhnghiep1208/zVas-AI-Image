import React from 'react';

export interface AppFooterProps {
  activeModelLabel: string;
  providerLabel: string;
}

export const AppFooter: React.FC<AppFooterProps> = ({ activeModelLabel, providerLabel }) => (
  <footer className="flex flex-shrink-0 items-center justify-center gap-3 border-t border-white/[0.08] bg-gray-950/45 px-4 py-2 backdrop-blur-md">
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-gray-500 sm:text-xs">
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
          aria-hidden
        />
        <span className="text-gray-500">Model</span>
        <span className="font-medium text-cyan-300/95">{activeModelLabel}</span>
      </div>
      <span className="hidden text-white/15 sm:inline" aria-hidden>
        ·
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">Provider</span>
        <span className="font-medium capitalize text-gray-300">{providerLabel}</span>
      </div>
    </div>
  </footer>
);
