import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Laptop, LogOut, Monitor, RefreshCw, Smartphone, X } from 'lucide-react';
import type { UserSessionView } from '../../hooks/useUserSessions';

export interface ActiveSessionsModalProps {
  open: boolean;
  onClose: () => void;
  sessions: UserSessionView[];
  isLoading: boolean;
  error: string | null;
  isRevokingId: string | null;
  onRefresh: () => void;
  onRevokeSession: (sessionId: string, isCurrent: boolean) => void | Promise<void>;
  onRevokeOthers: () => void | Promise<void>;
}

function DeviceIcon({ label }: { label: string }) {
  const lower = label.toLowerCase();
  if (lower.includes('android') || lower.includes('ios') || lower.includes('iphone')) {
    return <Smartphone className="h-5 w-5 shrink-0 text-[var(--lp-accent)]" aria-hidden />;
  }
  if (lower.includes('mac') || lower.includes('windows') || lower.includes('linux')) {
    return <Laptop className="h-5 w-5 shrink-0 text-[var(--lp-accent)]" aria-hidden />;
  }
  return <Monitor className="h-5 w-5 shrink-0 text-[var(--lp-accent)]" aria-hidden />;
}

export const ActiveSessionsModal: React.FC<ActiveSessionsModalProps> = ({
  open,
  onClose,
  sessions,
  isLoading,
  error,
  isRevokingId,
  onRefresh,
  onRevokeSession,
  onRevokeOthers,
}) => {
  const activeCount = sessions.filter((s) => !s.isRevoked).length;
  const otherActive = sessions.filter((s) => !s.isCurrent && !s.isRevoked).length;

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--lp-void)]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sessions-modal-title"
      onClick={handleBackdrop}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface-elevated)] shadow-[0_24px_80px_-24px_var(--lp-accent-glow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--lp-border)] px-5 py-4">
          <div>
            <h2 id="sessions-modal-title" className="font-display text-lg font-semibold text-[var(--lp-text)]">
              Phiên đăng nhập
            </h2>
            <p className="mt-1 text-sm text-[var(--lp-muted)]">
              Mỗi trình duyệt hoặc thiết bị tạo một phiên. Đăng xuất phiên để chặn truy cập trên thiết bị đó.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--lp-border)] text-[var(--lp-muted)] hover:text-[var(--lp-text)]"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-[var(--lp-border)] px-5 py-2.5">
          <span className="text-xs text-[var(--lp-muted)]">
            {activeCount} phiên đang hoạt động
            {otherActive > 0 ? ` · ${otherActive} phiên khác` : ''}
          </span>
          <div className="flex gap-1.5">
            {otherActive > 0 && (
              <button
                type="button"
                onClick={() => void onRevokeOthers()}
                disabled={isLoading || isRevokingId !== null}
                className="cursor-pointer rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-50"
              >
                Đăng xuất tất cả phiên khác
              </button>
            )}
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={isLoading}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--lp-border)] text-[var(--lp-muted)] hover:text-[var(--lp-accent)] disabled:opacity-50"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error ? (
          <p className="mx-5 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {error}
          </p>
        ) : null}

        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {isLoading && sessions.length === 0 ? (
            <li className="py-8 text-center text-sm text-[var(--lp-muted)]">Đang tải phiên…</li>
          ) : sessions.length === 0 ? (
            <li className="py-8 text-center text-sm text-[var(--lp-muted)]">Chưa có phiên nào được ghi nhận.</li>
          ) : (
            sessions.map((session) => (
              <li
                key={session.sessionId}
                className="mb-2 flex items-center gap-3 rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-3 last:mb-0"
              >
                <DeviceIcon label={session.deviceLabel} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-[var(--lp-text)]">
                      {session.deviceLabel}
                    </span>
                    {session.isCurrent ? (
                      <span className="rounded-md bg-[var(--lp-accent-dim)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--lp-accent)]">
                        Phiên này
                      </span>
                    ) : null}
                    {session.isRevoked ? (
                      <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
                        Đã đăng xuất
                      </span>
                    ) : session.isStale ? (
                      <span className="rounded-md bg-[var(--lp-border)] px-1.5 py-0.5 text-[10px] text-[var(--lp-muted)]">
                        Không hoạt động lâu
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--lp-muted)]">
                    Hoạt động: {session.lastActiveLabel}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--lp-muted)]/80">
                    {session.sessionId.slice(0, 8)}…
                  </p>
                </div>
                {!session.isRevoked ? (
                  <button
                    type="button"
                    disabled={isRevokingId === session.sessionId}
                    onClick={() => void onRevokeSession(session.sessionId, session.isCurrent)}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--lp-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--lp-muted)] transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {session.isCurrent ? 'Đăng xuất' : 'Đăng xuất phiên'}
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>

        <p className="border-t border-[var(--lp-border)] px-5 py-3 text-[11px] leading-relaxed text-[var(--lp-muted)]">
          Phiên khác sẽ bị chặn khi mở lại app (tối đa vài phút). Đăng xuất toàn bộ tài khoản Firebase trên thiết bị
          khác vẫn có thể cần đổi mật khẩu nếu nghi ngờ lộ mật khẩu.
        </p>
      </div>
    </div>,
    document.body,
  );
};
