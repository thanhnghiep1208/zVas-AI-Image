import React from 'react';
import { LogIn } from 'lucide-react';

export interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => (
  <div className="relative min-h-screen overflow-hidden bg-gray-950 text-gray-200">
    <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
    <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

    <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
      <header className="mb-12 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-500">
          AI Image ZVAS
        </h1>
        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1">AI Studio Ready</span>
          <span className="rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1">Admin Analytics</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-7 md:p-10 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-400 font-semibold">Overview</p>
          <h2 className="mt-4 text-4xl md:text-6xl font-black leading-tight text-white">
            Biến ý tưởng thành hình ảnh <span className="text-cyan-300">chất lượng cao</span> bằng AI
          </h2>
          <p className="mt-5 max-w-2xl text-gray-300 leading-relaxed">
            Cung cấp công cụ tạo ảnh AI chuyên nghiệp dành cho người dùng cá nhân và doanh nghiệp.
            Hỗ trợ nhiều provider, workflow linh hoạt, và hệ thống quản trị đầy đủ cho môi trường production.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Tạo ảnh từ văn bản (Text-to-Image).',
              'Chỉnh sửa ảnh từ ảnh gốc (Image-to-Image).',
              'Trộn ảnh (Merge Image).',
              'Tạo nhiều biến thể cùng lúc.',
              'Quản lý lịch sử tạo ảnh cá nhân.',
              'Bảng điều khiển Admin để quản lý người dùng và cấu hình API.',
            ].map((feature) => (
              <div key={feature} className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                <div className="mb-2 h-1.5 w-8 rounded-full bg-cyan-400/80" />
                <p className="text-sm text-gray-300">{feature}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-gray-900 to-gray-950 p-7 md:p-8 shadow-2xl flex flex-col">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-400 font-semibold">Get Started</p>
            <h3 className="mt-3 text-2xl md:text-3xl font-bold text-white">Đăng nhập để bắt đầu tạo ảnh</h3>
            <p className="mt-3 text-sm text-gray-400">
              Đăng nhập Google để sử dụng toàn bộ tính năng tạo ảnh AI và dashboard quản trị theo quyền tài khoản.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={onLogin}
              className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold text-base transition-all transform hover:scale-[1.01] shadow-xl"
            >
              <LogIn className="w-5 h-5" />
              <span>Tiếp tục với Google</span>
            </button>
            <p className="text-xs text-gray-500 text-center">
              Tài khoản mới có thể cần admin phê duyệt trước khi dùng đầy đủ chức năng.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-3">
              <p className="text-lg font-bold text-cyan-300">3</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Providers</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-3">
              <p className="text-lg font-bold text-cyan-300">10/min</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Rate Limit</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-3">
              <p className="text-lg font-bold text-cyan-300">Admin</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Controls</p>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-10 rounded-2xl border border-gray-800 bg-gray-900/50 px-5 py-4 text-center text-xs text-gray-500">
        AI Image ZVAS - Nền tảng tạo ảnh AI cho team marketing, design và sản phẩm.
      </footer>
    </div>
  </div>
);
