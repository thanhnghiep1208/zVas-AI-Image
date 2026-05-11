import React from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  LogIn,
  Palette,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface LandingPageProps {
  onLogin: () => void;
}

const TRUST_POINTS = [
  { icon: Zap, label: 'Đa provider', detail: 'Gemini · OpenAI · Seedance' },
  { icon: ShieldCheck, label: 'Vai trò & bảo mật', detail: 'Admin · editor · analytics — đúng quyền, đúng việc' },
  { icon: BarChart3, label: 'Analytics thực tế', detail: 'Theo dõi chi phí & xu hướng' },
];

const VALUE_PROPS = [
  {
    icon: Sparkles,
    title: 'Biến brief thành visual',
    body: 'Từ mô tả ngắn đến biến thể quảng cáo — một luồng làm việc cho marketing và design.',
  },
  {
    icon: Layers,
    title: 'Workflow linh hoạt',
    body: 'Text-to-image, chỉnh từ ảnh gốc, tham chiếu style, merge và batch — trong cùng một studio.',
  },
  {
    icon: Palette,
    title: 'Style có kiểm soát',
    body: 'Thư viện phong cách, tùy chọn nền & viền — output nhất quán với brand.',
  },
];

const STEPS = [
  { step: '01', title: 'Đăng nhập Google', desc: 'Xác thực nhanh, không mật khẩu phụ.' },
  { step: '02', title: 'Tạo trong studio', desc: 'Prompt, ảnh gốc và tùy chọn — gửi generate.' },
  { step: '03', title: 'Đo lường & lặp', desc: 'Lịch sử cá nhân; admin xem analytics & chi phí.' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => (
  <div className="relative min-h-screen overflow-x-hidden bg-[#05080c] text-gray-200">
    {/* Ambient layers */}
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.14),transparent_55%)]"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(59,130,246,0.1),transparent_50%)]"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(to_bottom,transparent_0%,rgba(15,23,42,0.6)_100%)]"
      aria-hidden
    />

    <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-5 sm:px-8 md:px-10 md:pb-20 md:pt-8">
      {/* Nav — không lặp CTA đăng nhập; tối đa 2 nút login toàn trang (hero + cuối trang) */}
      <header className="mb-14 flex items-center justify-between gap-4 sm:mb-16">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/15 to-blue-600/10 shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)]">
            <Sparkles className="h-4 w-4 text-cyan-300" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white md:text-xl">
            AI Image <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">ZVAS</span>
          </span>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">
          Production-ready
        </span>
      </header>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:items-start">
        {/* Hero copy */}
        <section className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
            Studio tạo ảnh AI
          </p>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Hình ảnh thương hiệu{' '}
            <span className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              sắc nét, nhất quán
            </span>
            — từ prompt đến campaign.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-gray-400 sm:text-lg">
            Một nền tảng cho team cần tốc độ: tạo biến thể creative, giữ style, và có analytics + quyền admin
            cho môi trường thật — không chỉ demo.
          </p>

          <div id="login-cta" className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center scroll-mt-24">
            <button
              type="button"
              onClick={onLogin}
              className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white px-7 py-4 text-base font-semibold text-gray-950 shadow-[0_20px_50px_-20px_rgba(255,255,255,0.35)] transition hover:bg-gray-100 sm:w-auto"
              aria-label="Tiếp tục với Google để đăng nhập"
            >
              <LogIn className="h-5 w-5 shrink-0" aria-hidden />
              <span>Tiếp tục với Google</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden
              />
            </button>
            <a
              href="#features"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-4 text-base font-medium text-gray-300 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.06] sm:w-auto"
            >
              Xem khả năng
            </a>
          </div>

          {/* Trust strip */}
          <ul className="mt-12 grid gap-4 sm:grid-cols-3">
            {TRUST_POINTS.map(({ icon: Icon, label, detail }) => (
              <li
                key={label}
                className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <Icon className="h-4 w-4 text-cyan-400" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Conversion panel + mock */}
        <aside className="relative lg:sticky lg:top-8">
          <div className="absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-cyan-500/25 via-transparent to-blue-600/20 opacity-80 blur-sm" aria-hidden />
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gray-950/80 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/[0.06] bg-gradient-to-r from-white/[0.05] to-transparent px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">Bắt đầu trong vài giây</p>
              <p className="mt-1 text-sm text-gray-400">Đăng nhập để vào studio và dashboard theo role.</p>
            </div>

            <div className="p-6 md:p-8">
              {/* Faux product preview */}
              <div className="mb-8 rounded-2xl border border-white/[0.06] bg-[#0a1016] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Luồng tạo</span>
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Live pipeline
                  </span>
                </div>
                <div className="space-y-2 font-mono text-[11px] leading-relaxed text-gray-400">
                  <div className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-gray-300">
                    <span className="text-cyan-500/80">prompt</span> · &quot;Minimal skincare hero, soft daylight…&quot;
                  </div>
                  <div className="flex items-center gap-2 px-1 text-gray-600">
                    <span className="text-cyan-500/60">↓</span>
                    <ImageIcon className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                    <span>Style guide + aspect ratio</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['A', 'B', 'C'].map((v) => (
                      <div
                        key={v}
                        className="flex aspect-[4/5] items-end justify-center rounded-lg border border-cyan-500/15 bg-gradient-to-b from-cyan-500/10 to-blue-600/5 pb-2 text-[10px] font-bold text-cyan-200/50"
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm text-gray-400">
                {['Lịch sử cá nhân & tải ảnh', 'Admin: users, settings, analytics', 'Rate limit & API theo môi trường'].map(
                  (item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500/80" aria-hidden />
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>

              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-6 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums text-white">3</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Providers</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums text-white">10/m</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Rate limit</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">RBAC</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Roles</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Value props */}
      <section id="features" className="mt-24 scroll-mt-24 md:mt-28">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Vì sao team chọn ZVAS</h2>
          <p className="mt-3 text-gray-400">
            Tập trung vào output đẹp và vận hành rõ ràng — từ người tạo ảnh đến người quản trị.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-cyan-500/20 hover:bg-white/[0.04]"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-transparent text-cyan-300 transition group-hover:border-cyan-500/30">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="mt-20 md:mt-24">
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Cách hoạt động</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ step, title, desc }) => (
            <li
              key={step}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a1016] p-6"
            >
              <span className="font-mono text-xs text-cyan-500/70">{step}</span>
              <p className="mt-2 font-medium text-white">{title}</p>
              <p className="mt-2 text-sm text-gray-500">{desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Bottom CTA */}
      <section className="mt-20 md:mt-24">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-[#0a1016] to-blue-600/10 px-6 py-12 text-center md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"
            aria-hidden
          />
          <h2 className="mx-auto max-w-xl text-balance text-2xl font-semibold text-white md:text-3xl">
            Sẵn sàng cho batch creative tiếp theo?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray-400">
            Đăng nhập Google để vào studio — giao diện và công cụ hiển thị theo vai trò tài khoản của bạn.
          </p>
          <button
            type="button"
            onClick={onLogin}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-gray-950 shadow-xl transition hover:bg-gray-100"
          >
            <LogIn className="h-5 w-5" aria-hidden />
            Bắt đầu với Google
          </button>
        </div>
      </section>

      <footer className="mt-14 border-t border-white/[0.06] pt-8 text-center text-xs text-gray-600">
        AI Image ZVAS — studio tạo ảnh AI cho marketing, design và sản phẩm.
      </footer>
    </div>
  </div>
);
