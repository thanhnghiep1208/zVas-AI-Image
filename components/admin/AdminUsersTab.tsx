import React from 'react';
import {
  BarChart3,
  CheckCircle,
  History,
  RefreshCw,
  Shield,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import type { AdminUserProfile } from './types';

interface AdminUsersTabProps {
  users: AdminUserProfile[];
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (userId: string, status: 'approved' | 'rejected') => void;
  onUpdateRole: (userId: string, role: 'admin' | 'editor' | 'advice') => void;
  onDeleteUser: (userId: string, email: string) => void;
  onViewHistory: (uid: string, email: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  isLoading,
  onRefresh,
  onUpdateStatus,
  onUpdateRole,
  onDeleteUser,
  onViewHistory,
}) => (
  <section>
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/15 to-blue-600/10">
          <User className="h-5 w-5 text-cyan-200" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">Danh sách người dùng</h2>
          <p className="mt-1 text-sm text-gray-500">
            Duyệt tài khoản, gán vai trò và xem lịch sử — thao tác rõ ràng, ít gây lẫn.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-gray-200 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
        title="Tải lại danh sách từ Firestore"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
        Làm mới danh sách
      </button>
    </div>

    {isLoading ? (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
        <p className="text-sm text-gray-500">Đang tải danh sách…</p>
      </div>
    ) : (
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--lp-surface)] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Người dùng
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Vai trò
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Trạng thái
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {users.map((user) => (
                <tr key={user.uid} className="transition-colors hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          user.photoURL ||
                          `https://ui-avatars.com/api/?name=${user.displayName}`
                        }
                        alt={user.displayName}
                        className="h-10 w-10 rounded-full border border-white/10 object-cover ring-2 ring-white/5"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{user.displayName}</span>
                        <span className="text-xs text-gray-500">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center space-x-2">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          onUpdateRole(user.uid, e.target.value as 'admin' | 'editor' | 'advice')
                        }
                        className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                      >
                        <option value="editor">Editor</option>
                        <option value="advice">Advice (chỉ Analytics)</option>
                        <option value="admin">Admin</option>
                      </select>
                      {user.role === 'admin' && (
                        <span className="inline-flex" aria-label="Admin">
                          <Shield className="w-3 h-3 text-cyan-400" />
                        </span>
                      )}
                      {user.role === 'advice' && (
                        <span className="inline-flex" aria-label="Advice — chỉ Analytics">
                          <BarChart3 className="w-3 h-3 text-violet-400 shrink-0" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        user.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25'
                          : user.status === 'rejected'
                            ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25'
                            : 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25'
                      }`}
                    >
                      {user.status === 'approved'
                        ? 'Đã duyệt'
                        : user.status === 'rejected'
                          ? 'Từ chối'
                          : 'Chờ duyệt'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onUpdateStatus(user.uid, 'approved')}
                        disabled={user.status === 'approved'}
                        className={`rounded-lg p-2 transition-all ${
                          user.status === 'approved'
                            ? 'cursor-not-allowed text-gray-600'
                            : 'text-emerald-400 hover:bg-emerald-500/15'
                        }`}
                        title="Duyệt"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onUpdateStatus(user.uid, 'rejected')}
                        disabled={user.status === 'rejected'}
                        className={`rounded-lg p-2 transition-all ${
                          user.status === 'rejected'
                            ? 'cursor-not-allowed text-gray-600'
                            : 'text-red-400 hover:bg-red-500/15'
                        }`}
                        title="Từ chối"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onViewHistory(user.uid, user.email)}
                        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-cyan-500/15 hover:text-cyan-300"
                        title="Xem lịch sử"
                      >
                        <History className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDeleteUser(user.uid, user.email)}
                        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-500/15 hover:text-red-300"
                        title="Xóa người dùng"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </section>
);
