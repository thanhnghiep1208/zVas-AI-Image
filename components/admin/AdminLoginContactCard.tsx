import React from 'react';
import { Contact } from 'lucide-react';
import { LOGIN_CONTACT_MAX_LENGTH } from '../../utils/publicSettings';

interface AdminLoginContactCardProps {
  value: string;
  onChange: (value: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

export const AdminLoginContactCard: React.FC<AdminLoginContactCardProps> = ({
  value,
  onChange,
  isSaving,
  onSave,
}) => (
  <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--lp-surface)] p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-8">
    <div className="mb-5 flex items-start gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/20 to-blue-600/10">
        <Contact className="h-7 w-7 text-cyan-200" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Thông tin liên hệ</h2>
        <p className="mt-1 text-sm text-gray-500">
          Hiển thị dưới nút Đăng nhập, sau dòng &quot;Để được cấp tài khoản vui lòng liên hệ:&quot;.
          Để trống sẽ ẩn cả đoạn này.
        </p>
      </div>
    </div>

    <div className="flex flex-col space-y-1.5">
      <label htmlFor="login-contact-text" className="text-xs font-medium text-gray-400">
        Nội dung (văn bản thường, xuống dòng được)
      </label>
      <textarea
        id="login-contact-text"
        rows={3}
        value={value}
        maxLength={LOGIN_CONTACT_MAX_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Email: admin@example.com — Zalo: 09xx xxx xxx"
        className="resize-y rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
      />
      <p className="text-right text-xs text-gray-500">
        {value.length}/{LOGIN_CONTACT_MAX_LENGTH}
      </p>
    </div>

    <p className="mt-2 text-xs text-amber-200/80">
      Nội dung này công khai cho mọi người truy cập trang (kể cả chưa đăng nhập).
    </p>

    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-8 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSaving ? 'Đang lưu...' : 'Lưu thông tin liên hệ'}
    </button>
  </section>
);
