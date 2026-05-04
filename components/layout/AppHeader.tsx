import React from 'react';
import type { User } from 'firebase/auth';
import { LogOut, ShieldCheck, Key, Settings, BarChart3 } from 'lucide-react';
import { PROVIDER_MODEL_OPTIONS } from '../../constants/aiModels';
import type { UserProfile } from '../../hooks/useAuthAndProfile';

export type AppView = 'create' | 'merge' | 'multiple';

const VIEW_LABELS: Record<AppView, string> = {
  create: 'Create',
  merge: 'Merge',
  multiple: 'Multiple',
};

export interface AppHeaderProps {
  user: User;
  userProfile: UserProfile | null;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onSelectApiKey: () => void | Promise<void>;
  pendingUsersCount: number;
  onOpenAdminSettings: () => void;
  onOpenAdminUsers: () => void;
  /** Role `advice`: mở dashboard chỉ tab Analytics */
  onOpenAdminAnalytics: () => void;
  getEffectiveModel: () => string;
  getProviderKey: () => string;
  onModelPreferenceChange: (model: string) => void;
  onLogout: () => void | Promise<void>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  userProfile,
  currentView,
  onViewChange,
  onSelectApiKey,
  pendingUsersCount,
  onOpenAdminSettings,
  onOpenAdminUsers,
  onOpenAdminAnalytics,
  getEffectiveModel,
  getProviderKey,
  onModelPreferenceChange,
  onLogout,
}) => {
  const showApiKeyButton =
    typeof window !== 'undefined' &&
    !!(window as Window & { aistudio?: { openSelectKey?: () => Promise<void> } }).aistudio?.openSelectKey;

  return (
    <header className="flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 border-b border-gray-700 bg-gray-800/80 backdrop-blur-md z-20 flex-shrink-0">
      <div className="flex items-center space-x-2 sm:space-x-8">
        <h1 className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-500 truncate max-w-[120px] sm:max-w-none">
          AI Image
        </h1>
        <nav className="flex items-center space-x-1">
          {(['create', 'merge', 'multiple'] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => onViewChange(view)}
              className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium transition-all ${
                currentView === view
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-4">
        {showApiKeyButton && (
          <button
            type="button"
            onClick={() => void onSelectApiKey()}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-cyan-400 transition-all"
            title="Change API Key"
          >
            <Key className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
        {userProfile?.role === 'admin' && (
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              type="button"
              onClick={onOpenAdminSettings}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-cyan-400 transition-all"
              title="System Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={onOpenAdminUsers}
              className="p-1.5 sm:p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-full transition-all relative"
              title="Admin Dashboard"
            >
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              {pendingUsersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] sm:text-[10px] font-bold min-w-[14px] sm:min-w-[18px] h-[14px] sm:h-[18px] flex items-center justify-center rounded-full border-2 border-gray-800 animate-pulse">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          </div>
        )}
        {userProfile?.role === 'advice' && (
          <button
            type="button"
            onClick={onOpenAdminAnalytics}
            className="p-1.5 sm:p-2 text-violet-400 hover:bg-violet-400/10 rounded-full transition-all"
            title="Analytics (chỉ xem)"
          >
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
        <div className="hidden sm:flex items-center space-x-2 bg-gray-700/40 border border-gray-600 rounded-lg px-2 py-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Model</span>
          <select
            value={getEffectiveModel()}
            onChange={(e) => onModelPreferenceChange(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            {(PROVIDER_MODEL_OPTIONS[getProviderKey()] || PROVIDER_MODEL_OPTIONS.gemini).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2 bg-gray-700/50 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-gray-600">
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || '?')}`}
            alt={user.displayName || ''}
            className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-cyan-500"
            referrerPolicy="no-referrer"
          />
          <span className="text-[10px] sm:text-sm font-medium hidden md:inline truncate max-w-[80px]">{user.displayName}</span>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="p-1.5 sm:p-2 text-gray-400 hover:text-red-400 transition-colors"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
};
