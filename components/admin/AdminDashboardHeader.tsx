import React from 'react';
import {
  ArrowLeft,
  BarChart3,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import type { AdminTab } from './types';

interface AdminDashboardHeaderProps {
  onClose: () => void;
  analyticsOnly: boolean;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  userCount: number;
}

export const AdminDashboardHeader: React.FC<AdminDashboardHeaderProps> = ({
  onClose,
  analyticsOnly,
  activeTab,
  onTabChange,
  userCount,
}) => (
  <header className="relative z-10 border-b border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
    <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-gray-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-white"
          aria-label="Quay lại ứng dụng"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
              {analyticsOnly ? (
                <BarChart3 className="h-4 w-4 text-cyan-300" aria-hidden />
              ) : (
                <LayoutDashboard className="h-4 w-4 text-cyan-300" aria-hidden />
              )}
            </span>
            <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
              {analyticsOnly ? 'Analytics' : 'Bảng điều khiển'}
            </h1>
          </div>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            {analyticsOnly
              ? 'Theo dõi xu hướng và hiệu suất — giao diện chỉ đọc, dễ đọc.'
              : 'Chào bạn — quản lý team, cấu hình và số liệu trong một không gian gọn gàng.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {!analyticsOnly && (
          <div
            className="flex w-full items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1 sm:w-auto"
            role="tablist"
            aria-label="Mục dashboard"
          >
            {(
              [
                { id: 'users' as const, label: 'Người dùng', icon: Users },
                { id: 'settings' as const, label: 'Cấu hình', icon: Settings },
                { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => onTabChange(id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all sm:flex-initial sm:px-4 ${
                  activeTab === id
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/20 text-white shadow-[0_0_20px_-8px_rgba(34,211,238,0.5)] ring-1 ring-cyan-500/30'
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}

        {!analyticsOnly && (
          <div className="flex items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-gray-400 sm:justify-end">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400/80" aria-hidden />
            <span>
              <span className="font-medium text-gray-200">{userCount}</span> thành viên
            </span>
          </div>
        )}
      </div>
    </div>
  </header>
);
