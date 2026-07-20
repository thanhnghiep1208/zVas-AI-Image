import React, { useEffect, useRef } from 'react';
import {
  ArrowRight,
  BarChart3,
  Layers,
  LogIn,
  Palette,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface LandingPageProps {
  onLoginClick: () => void;
  sessionNotice?: string | null;
}

/*
 * Shape system (locked):
 *   pills / buttons / badges  -> rounded-full
 *   cards / panels / images   -> rounded-2xl  (16px)
 *   icon tiles                -> rounded-xl    (12px)
 * Accent (locked): teal (--lp-accent) only. Photographic tiles carry their own
 * colour; no second UI accent anywhere on the page.
 *
 * Imagery below uses picsum.photos placeholders standing in for real generated
 * outputs. Swap the seeds for actual sample renders before launch.
 */

const TRUST_POINTS = [
  {
    icon: Zap,
    label: 'Đa provider',
    detail: 'Gemini, OpenAI và Seedance trong cùng một studio.',
  },
  {
    icon: ShieldCheck,
    label: 'Phân quyền RBAC',
    detail: 'Admin, editor và analytics, đúng vai trò đúng việc.',
  },
  {
    icon: BarChart3,
    label: 'Analytics chi phí',
    detail: 'Theo dõi chi phí và xu hướng dùng thật, không chỉ demo.',
  },
];

const VALUE_PROPS = [
  {
    icon: Sparkles,
    title: 'Biến brief thành visual',
    body: 'Từ mô tả ngắn tới bộ biến thể quảng cáo, một luồng làm việc chung cho marketing và design.',
    image: 'https://picsum.photos/seed/zvas-brief-visual/1100/900',
  },
  {
    icon: Layers,
    title: 'Workflow linh hoạt',
    body: 'Text-to-image, chỉnh từ ảnh gốc, tham chiếu style, merge và batch trong cùng một studio.',
    image: null,
  },
  {
    icon: Palette,
    title: 'Style có kiểm soát',
    body: 'Thư viện phong cách cùng tùy chọn nền và viền, giữ output nhất quán với brand.',
    image: 'https://picsum.photos/seed/zvas-style-control/700/520',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Đăng nhập',
    desc: 'Dùng tài khoản do quản trị cấp để vào đúng không gian làm việc của bạn.',
  },
  {
    n: '2',
    title: 'Tạo trong studio',
    desc: 'Nhập prompt, thêm ảnh gốc và tùy chọn, rồi generate ra các biến thể.',
  },
  {
    n: '3',
    title: 'Đo lường và lặp',
    desc: 'Xem lịch sử cá nhân; admin theo dõi analytics và chi phí theo thời gian thực.',
  },
];

const HERO_TILES = [
  { seed: 'zvas-hero-editorial', w: 900, h: 1200, span: 'row-span-2', ratio: 'aspect-[3/4]' },
  { seed: 'zvas-hero-product', w: 800, h: 800, span: '', ratio: 'aspect-square' },
  { seed: 'zvas-hero-campaign', w: 800, h: 800, span: '', ratio: 'aspect-square' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, sessionNotice }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal for below-the-fold sections. Honors reduced motion, cleans up.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.lp-reveal'));
    if (els.length === 0) return;

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="landing-premium relative min-h-[100dvh] overflow-x-hidden bg-[var(--lp-void)] font-sans text-[var(--lp-text)] antialiased"
    >
      {/* Fixed decorative layers: single teal accent, grain kept off scrolling content */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_85%_50%_at_50%_-12%,var(--lp-accent-dim),transparent_60%)]"
        aria-hidden
      />
      <div className="lp-grain pointer-events-none fixed inset-0 opacity-[0.5] mix-blend-overlay" aria-hidden />
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,var(--lp-ink))]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[84rem] px-5 pb-20 pt-6 sm:px-8 md:px-12 md:pb-24 md:pt-8">
        {sessionNotice ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-amber-500/35 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-50/95"
          >
            {sessionNotice}
          </div>
        ) : null}

        {/* Navigation: single line, ~64px */}
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)] shadow-[0_0_30px_-8px_var(--lp-accent-glow)]">
              <Sparkles className="h-[17px] w-[17px] text-[var(--lp-accent)]" aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              AI Image <span className="text-[var(--lp-accent)]">ZVAS</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#features"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-[var(--lp-muted)] transition hover:text-white sm:inline-flex"
            >
              Tính năng
            </a>
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-[var(--lp-border-strong)] hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)]"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Đăng nhập
            </button>
          </div>
        </header>

        {/* Hero: asymmetric split, exactly 4 text elements + image asset */}
        <section className="grid grid-cols-1 items-center gap-10 pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-12 lg:pt-20">
          <div className="lg:col-span-7 lg:pr-6">
            <p className="lp-anim-hero inline-flex items-center gap-2 rounded-full border border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">
              Studio tạo ảnh AI
            </p>
            <h1 className="lp-anim-hero lp-anim-hero-delay font-display mt-6 max-w-[18ch] text-pretty text-[2.7rem] font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:text-[3.25rem] lg:text-[3.35rem]">
              Hình ảnh thương hiệu <span className="text-[var(--lp-accent)]">sắc nét</span>, nhất quán.
            </h1>
            <p className="lp-anim-hero lp-anim-hero-delay mt-6 max-w-md text-pretty text-base leading-[1.6] text-[var(--lp-muted)] sm:text-lg">
              Từ prompt đến campaign: tạo biến thể, giữ style, kèm analytics và phân quyền cho môi trường thật.
            </p>
            <div className="lp-anim-hero lp-anim-hero-delay mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onLoginClick}
                className="group inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[var(--lp-void)] shadow-[0_24px_60px_-30px_rgba(255,255,255,0.5)] transition hover:-translate-y-px hover:bg-slate-100 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)] sm:w-auto"
              >
                <LogIn className="h-5 w-5 shrink-0" aria-hidden />
                <span>Đăng nhập</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </button>
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--lp-border)] px-7 py-3.5 text-base font-medium text-white transition hover:border-[var(--lp-border-strong)] hover:bg-white/[0.04] sm:w-auto"
              >
                Xem tính năng
              </a>
            </div>
          </div>

          {/* Hero asset: sample-output mosaic replaces the old fake credential card */}
          <div className="lp-anim-panel relative lg:col-span-5">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_70%_30%,var(--lp-accent-dim),transparent_65%)] blur-xl"
              aria-hidden
            />
            <div className="relative grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4">
              {HERO_TILES.map((tile, i) => (
                <div
                  key={tile.seed}
                  className={`group relative overflow-hidden rounded-2xl border border-[var(--lp-border)] ${tile.span} ${tile.ratio}`}
                >
                  <img
                    src={`https://picsum.photos/seed/${tile.seed}/${tile.w}/${tile.h}`}
                    alt="Ảnh mẫu tạo bởi studio ZVAS"
                    width={tile.w}
                    height={tile.h}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10"
                    aria-hidden
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust strip: sits directly under the hero, not inside it */}
        <section className="lp-reveal mt-20 grid gap-px overflow-hidden rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-border)] sm:grid-cols-3 md:mt-24">
          {TRUST_POINTS.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="flex gap-3 bg-[var(--lp-void)] p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--lp-border)] bg-white/[0.03]">
                <Icon className="h-4 w-4 text-[var(--lp-accent)]" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-xs leading-snug text-[var(--lp-muted)]">{detail}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Features: bento with real imagery, headline stacked (no split-header) */}
        <section id="features" className="mt-28 scroll-mt-24 md:mt-36">
          <div className="lp-reveal max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Vì sao team chọn ZVAS
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--lp-muted)]">
              Tập trung vào output đẹp và vận hành rõ ràng, từ người tạo ảnh đến người quản trị.
            </p>
          </div>

          <div className="lp-reveal mt-10 grid gap-4 md:grid-cols-3 md:grid-rows-2">
            {/* Featured cell: real image background */}
            <article className="group relative flex min-h-[19rem] flex-col justify-end overflow-hidden rounded-2xl border border-[var(--lp-border)] md:col-span-2 md:row-span-2">
              <img
                src={VALUE_PROPS[0].image ?? ''}
                alt="Bộ biến thể quảng cáo tạo từ một brief"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              />
              <div
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,4,8,0.15)_0%,rgba(2,4,8,0.55)_55%,rgba(2,4,8,0.92)_100%)]"
                aria-hidden
              />
              <div className="relative p-7">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-[var(--lp-accent)] backdrop-blur-sm">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-2xl font-semibold text-white">{VALUE_PROPS[0].title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-200/90 md:text-base">
                  {VALUE_PROPS[0].body}
                </p>
              </div>
            </article>

            {/* Card 2: tinted gradient for visual variation */}
            <article className="group flex flex-col rounded-2xl border border-[var(--lp-border)] bg-gradient-to-br from-[var(--lp-accent-dim)] via-[var(--lp-surface)] to-[var(--lp-void)] p-6 transition hover:border-[var(--lp-border-strong)]">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--lp-border)] bg-black/25 text-[var(--lp-accent)]">
                <Layers className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-white">{VALUE_PROPS[1].title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--lp-muted)]">{VALUE_PROPS[1].body}</p>
            </article>

            {/* Card 3: image thumbnail for variation */}
            <article className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface)] transition hover:border-[var(--lp-border-strong)]">
              <div className="relative h-28 overflow-hidden">
                <img
                  src={VALUE_PROPS[2].image ?? ''}
                  alt="Thư viện phong cách nhất quán với brand"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--lp-surface)] to-transparent" aria-hidden />
              </div>
              <div className="flex flex-1 flex-col p-6 pt-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--lp-border)] bg-white/[0.03] text-[var(--lp-accent)]">
                  <Palette className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-white">{VALUE_PROPS[2].title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lp-muted)]">{VALUE_PROPS[2].body}</p>
              </div>
            </article>
          </div>
        </section>

        {/* How it works: connected steps, verb-first titles */}
        <section className="mt-28 md:mt-36" aria-labelledby="how-heading">
          <h2
            id="how-heading"
            className="lp-reveal font-display text-3xl font-semibold tracking-tight text-white md:text-4xl"
          >
            Cách hoạt động
          </h2>
          <div className="relative mt-10">
            <div
              className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-[var(--lp-border-strong)] to-transparent md:block"
              aria-hidden
            />
            <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
              {STEPS.map(({ n, title, desc }, i) => (
                <li
                  key={n}
                  className="lp-reveal relative"
                  style={{ '--lp-reveal-delay': `${i * 90}ms` } as React.CSSProperties}
                >
                  <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--lp-border-strong)] bg-[var(--lp-void)] font-mono text-sm font-semibold text-[var(--lp-accent)]">
                    {n}
                  </span>
                  <p className="mt-5 font-display text-lg font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--lp-muted)]">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing CTA: single teal accent */}
        <section className="mt-28 md:mt-36">
          <div className="lp-reveal relative overflow-hidden rounded-2xl border border-[var(--lp-border-strong)] bg-[var(--lp-surface-elevated)] px-6 py-14 text-center shadow-[0_32px_80px_-40px_rgba(0,0,0,0.75)] md:px-16 md:py-16">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,var(--lp-accent-dim),transparent_65%)]"
              aria-hidden
            />
            <h2 className="relative mx-auto max-w-xl text-pretty font-display text-2xl font-semibold text-white md:text-3xl">
              Sẵn sàng cho batch creative tiếp theo?
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--lp-muted)]">
              Đăng nhập bằng tài khoản được cấp để vào studio; giao diện và công cụ hiển thị theo vai trò của bạn.
            </p>
            <button
              type="button"
              onClick={onLoginClick}
              className="group relative mt-10 inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-4 text-base font-semibold text-[var(--lp-void)] transition hover:-translate-y-px hover:bg-slate-100 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)]"
            >
              <LogIn className="h-5 w-5" aria-hidden />
              <span>Đăng nhập</span>
              <ArrowRight
                className="h-4 w-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden
              />
            </button>
          </div>
        </section>

        <footer className="mt-20 border-t border-[var(--lp-border)] pt-8 text-center text-xs text-[var(--lp-faint)]">
          AI Image ZVAS. Studio tạo ảnh AI cho marketing, design và sản phẩm.
        </footer>
      </div>
    </div>
  );
};
