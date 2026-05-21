import React from 'react';
import { History, XCircle } from 'lucide-react';

export interface UserHistoryImage {
  id: string;
  prompt?: string;
  imageUrl?: string;
  createdAt?: { toDate?: () => Date };
}

interface UserHistoryModalProps {
  email: string;
  images: UserHistoryImage[];
  isLoading: boolean;
  onClose: () => void;
}

export const UserHistoryModal: React.FC<UserHistoryModalProps> = ({
  email,
  images,
  isLoading,
  onClose,
}) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[var(--lp-surface-elevated)] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] bg-white/[0.02] px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-white">Lịch sử tạo ảnh</h3>
          <p className="mt-0.5 truncate text-sm text-gray-500">{email}</p>
          <p className="mt-1 text-xs text-gray-600">Tối đa 50 mục gần nhất</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-gray-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Đóng"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </header>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
            <p className="text-sm text-gray-500">Đang tải lịch sử…</p>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
            <History className="mb-4 h-12 w-12 text-gray-600 opacity-40" aria-hidden />
            <p className="text-sm">Chưa có lịch sử tạo hình cho tài khoản này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-[var(--lp-ink)]"
              >
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-600 p-2 text-center italic">
                  {img.imageUrl === 'idb' ? 'Ảnh lưu tại máy người dùng' : 'Lỗi ảnh'}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                  <p className="text-[10px] text-white line-clamp-3">{img.prompt}</p>
                  <p className="text-[8px] text-gray-400 mt-1">
                    {img.createdAt?.toDate ? img.createdAt.toDate().toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);
