import React, { memo, useCallback, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BarChart3,
  CircleHelp,
  Key,
  LayoutGrid,
  Layers2,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PROVIDER_MODEL_OPTIONS } from '../../constants/aiModels';
import type { UserProfile } from '../../hooks/useAuthAndProfile';
import { GeminiModelComparisonModal } from './GeminiModelComparisonModal';

export type AppView = 'create' | 'merge' | 'multiple';

const VIEW_CONFIG: Record<AppView, { label: string; shortLabel: string; icon: typeof Sparkles }> = {
  create: { label: 'Tạo ảnh', shortLabel: 'Tạo', icon: Sparkles },
  merge: { label: 'Trộn ảnh', shortLabel: 'Trộn', icon: Layers2 },
  multiple: { label: 'Hàng loạt', shortLabel: 'Loạt', icon: LayoutGrid },
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
  /** Preload dashboard chunk trên hover/focus để mở mượt lần đầu. */
  onPrefetchAdminDashboard: () => void;
  getEffectiveModel: () => string;
  getProviderKey: () => string;
  onModelPreferenceChange: (model: string) => void;
  onLogout: () => void | Promise<void>;
  /** Logo: làm mới vùng làm việc (prompt, ảnh, style, kết quả) — không đăng xuất, không xóa analytics. */
  onLogoWorkspaceRefresh: () => void;
}

function AppHeaderComponent({
  user,
  userProfile,
  currentView,
  onViewChange,
  onSelectApiKey,
  pendingUsersCount,
  onOpenAdminSettings,
  onOpenAdminUsers,
  onOpenAdminAnalytics,
  onPrefetchAdminDashboard,
  getEffectiveModel,
  getProviderKey,
  onModelPreferenceChange,
  onLogout,
  onLogoWorkspaceRefresh,
}: AppHeaderProps) {
  const [modelHelpOpen, setModelHelpOpen] = useState(false);
  const handleNavViewClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const raw = e.currentTarget.getAttribute('data-view');
      if (raw === 'create' || raw === 'merge' || raw === 'multiple') {
        onViewChange(raw);
      }
    },
    [onViewChange]
  );

  const showApiKeyButton =
    typeof window !== 'undefined' &&
    !!(window as Window & { aistudio?: { openSelectKey?: () => Promise<void> } }).aistudio?.openSelectKey;

  return (
    <header className="z-20 flex flex-shrink-0 flex-col gap-3 border-b border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <button
          type="button"
          onClick={onLogoWorkspaceRefresh}
          className="group/brand flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl text-left transition-colors hover:bg-[var(--lp-accent-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-border-strong)]"
          aria-label="Làm mới vùng làm việc"
          title="Xóa prompt, ảnh đang chọn và tùy chọn style — giữ đăng nhập và dữ liệu analytics"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)] shadow-[0_0_22px_-8px_var(--lp-accent-glow)] transition-transform group-hover/brand:scale-[1.02]">
            <Sparkles className="h-4 w-4 text-[var(--lp-accent)]" aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <h1 className="font-display truncate text-base font-semibold tracking-tight text-[var(--lp-text)] sm:text-lg">
              AI Image{' '}
              <span className="text-[var(--lp-accent)]">ZVAS</span>
            </h1>
            <p className="hidden text-[11px] text-[var(--lp-muted)] sm:block">Studio tạo ảnh — chọn chế độ bên dưới</p>
          </div>
        </button>

        <nav
          className="flex w-full items-center gap-1 rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface)] p-1 sm:w-auto"
          aria-label="Chế độ làm việc"
        >
          {(['create', 'merge', 'multiple'] as const).map((view) => {
            const { label, shortLabel, icon: Icon } = VIEW_CONFIG[view];
            const active = currentView === view;
            return (
              <button
                key={view}
                type="button"
                data-view={view}
                onClick={handleNavViewClick}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all sm:flex-initial sm:px-3.5 sm:py-2 sm:text-sm ${
                  active
                    ? 'bg-[var(--lp-accent-dim)] text-[var(--lp-text)] shadow-[0_0_22px_-12px_var(--lp-accent-glow)] ring-1 ring-[var(--lp-border-strong)]'
                    : 'text-[var(--lp-muted)] hover:bg-[var(--lp-accent-dim)] hover:text-[var(--lp-text)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-shrink-0 items-center justify-end gap-1.5 sm:gap-2">
        {showApiKeyButton && (
          <button
            type="button"
            onClick={() => void onSelectApiKey()}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--lp-border)] bg-[var(--lp-accent-dim)] text-[var(--lp-muted)] transition-colors hover:border-[var(--lp-border-strong)] hover:text-[var(--lp-accent)] sm:h-10 sm:w-10"
            title="Đổi API key"
          >
            <Key className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
        )}
        {userProfile?.role === 'admin' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenAdminSettings}
              onMouseEnter={onPrefetchAdminDashboard}
              onFocus={onPrefetchAdminDashboard}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--lp-border)] bg-[var(--lp-accent-dim)] text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-accent)] sm:h-10 sm:w-10"
              title="Cấu hình hệ thống"
            >
              <Settings className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>
            <button
              type="button"
              onClick={onOpenAdminUsers}
              onMouseEnter={onPrefetchAdminDashboard}
              onFocus={onPrefetchAdminDashboard}
              className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)] text-[var(--lp-accent)] transition-colors hover:bg-[color-mix(in_oklab,var(--lp-accent)_18%,transparent)] sm:h-10 sm:w-10"
              title="Quản trị"
            >
              <ShieldCheck className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              {pendingUsersCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--lp-void)] bg-red-500 px-1 text-[9px] font-bold text-white sm:h-5 sm:min-w-[20px] sm:text-[10px]">
                  {pendingUsersCount > 99 ? '99+' : pendingUsersCount}
                </span>
              )}
            </button>
          </div>
        )}
        {userProfile?.role === 'advice' && (
          <button
            type="button"
            onClick={onOpenAdminAnalytics}
            onMouseEnter={onPrefetchAdminDashboard}
            onFocus={onPrefetchAdminDashboard}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-200 transition-colors hover:bg-violet-500/20 sm:h-10 sm:w-10"
            title="Analytics (chỉ xem)"
          >
            <BarChart3 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
        )}

        <div className="hidden items-center gap-2 rounded-xl border border-[var(--lp-border)] bg-[var(--lp-accent-dim)] px-2.5 py-1.5 sm:flex">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--lp-muted)]">Model</span>
          <div className="flex items-center gap-1">
            <select
              value={getEffectiveModel()}
              onChange={(e) => onModelPreferenceChange(e.target.value)}
              className="max-w-[140px] cursor-pointer rounded-lg border border-[var(--lp-border)] bg-[var(--lp-ink)] px-2 py-1 text-xs text-[var(--lp-text)] outline-none transition focus:border-[var(--lp-border-strong)] focus:ring-2 focus:ring-[var(--lp-accent-dim)] md:max-w-[200px]"
              aria-label="Chọn model tạo ảnh"
            >
              {(PROVIDER_MODEL_OPTIONS[getProviderKey()] || PROVIDER_MODEL_OPTIONS.gemini).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {getProviderKey() === 'gemini' && (
              <button
                type="button"
                onClick={() => setModelHelpOpen(true)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--lp-border)] bg-[var(--lp-ink)] text-[var(--lp-muted)] transition hover:border-[var(--lp-border-strong)] hover:text-[var(--lp-accent)]"
                title="So sánh Nano Banana 2 và Nano Banana Pro"
                aria-label="Mở hướng dẫn so sánh model Gemini"
              >
                <CircleHelp className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <GeminiModelComparisonModal open={modelHelpOpen} onClose={() => setModelHelpOpen(false)} />

        <div className="flex items-center gap-2 rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface-elevated)] py-1 pl-1 pr-2 sm:pr-3">
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || '?')}`}
            alt={user.displayName || ''}
            className="h-7 w-7 rounded-full border border-[var(--lp-border-strong)] object-cover ring-2 ring-[var(--lp-accent-dim)] sm:h-8 sm:w-8"
            referrerPolicy="no-referrer"
          />
          <span className="hidden max-w-[100px] truncate text-xs font-medium text-[var(--lp-text)] md:inline">
            {user.displayName}
          </span>
        </div>

        <button
          type="button"
          onClick={() => void onLogout()}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--lp-border)] bg-[var(--lp-accent-dim)] text-[var(--lp-muted)] transition-colors hover:border-red-500/40 hover:text-red-300 sm:h-10 sm:w-10"
          title="Đăng xuất"
        >
          <LogOut className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>
      </div>
    </header>
  );
}

export const AppHeader = memo(AppHeaderComponent);
