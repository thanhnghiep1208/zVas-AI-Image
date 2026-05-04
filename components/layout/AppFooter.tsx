import React from 'react';

export interface AppFooterProps {
  activeModelLabel: string;
  providerLabel: string;
}

export const AppFooter: React.FC<AppFooterProps> = ({ activeModelLabel, providerLabel }) => (
  <footer className="px-4 py-1.5 bg-gray-800/50 border-t border-gray-700 flex items-center justify-center space-x-3 text-[10px] sm:text-xs text-gray-500 flex-shrink-0">
    <div className="flex items-center space-x-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
      <span className="font-medium">Active Model:</span>
      <span className="text-cyan-400 font-bold tracking-wide uppercase">{activeModelLabel}</span>
    </div>
    <span className="text-gray-700">|</span>
    <div className="flex items-center space-x-1">
      <span className="opacity-60">Provider:</span>
      <span className="text-gray-300 font-medium capitalize">{providerLabel}</span>
    </div>
  </footer>
);
