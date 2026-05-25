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
  onLoginClick: () => void;
  sessionNotice?: string | null;
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
    featured: true,
    mock: 'studio' as const,
  },
  {
    icon: Layers,
    title: 'Workflow linh hoạt',
    body: 'Text-to-image, chỉnh từ ảnh gốc, tham chiếu style, merge và batch — trong cùng một studio.',
    featured: false,
    mock: 'workflow' as const,
  },
  {
    icon: Palette,
    title: 'Style có kiểm soát',
    body: 'Thư viện phong cách, tùy chọn nền & viền — output nhất quán với brand.',
    featured: false,
    mock: 'style' as const,
  },
];

const STEPS = [
  { step: '01', title: 'Đăng nhập tài khoản', desc: 'Dùng tên đăng nhập & mật khẩu do quản trị cấp.' },
  { step: '02', title: 'Tạo trong studio', desc: 'Prompt, ảnh gốc và tùy chọn — gửi generate.' },
  { step: '03', title: 'Đo lường & lặp', desc: 'Lịch sử cá nhân; admin xem analytics & chi phí.' },
];

const MockWindowDots: React.FC = () => (
  <div className="flex gap-1.5" aria-hidden>
    <span className="h-2 w-2 rounded-full bg-rose-500/45" />
    <span className="h-2 w-2 rounded-full bg-amber-400/45" />
    <span className="h-2 w-2 rounded-full bg-emerald-400/45" />
  </div>
);

const PipelineThumbMock: React.FC<{ label: string; variant: 'a' | 'b' | 'c' }> = ({ label, variant }) => {
  const shell =
    'relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-lg border border-[var(--lp-border-strong)] p-2 shadow-inner bg-gradient-to-b';
  const byVariant = {
    a: `${shell} from-teal-900/90 via-cyan-800/40 to-slate-950`,
    b: `${shell} from-violet-900/80 via-fuchsia-900/30 to-slate-950`,
    c: `${shell} from-amber-900/70 via-orange-900/25 to-slate-950`,
  };
  return (
    <div className={byVariant[variant]} aria-hidden>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.12)_0%,transparent_45%)]" />
      <span className="relative font-display text-xs font-semibold tracking-wide text-white/90">{label}</span>
      <span className="relative mt-0.5 font-mono text-[9px] uppercase text-white/35">mock</span>
    </div>
  );
};

const BentoStudioMock: React.FC = () => (
  <div
    className="relative mt-8 overflow-hidden rounded-2xl border border-[var(--lp-border)] bg-black/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
    aria-hidden
  >
    <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/5 pb-2">
      <div className="flex items-center gap-2">
        <MockWindowDots />
        <span className="font-mono text-[10px] text-[var(--lp-faint)]">studio.zvas — draft</span>
      </div>
      <span className="rounded border border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--lp-accent)]">
        Generate
      </span>
    </div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-2 rounded-xl border border-white/5 bg-[var(--lp-void)]/90 p-3">
        <div className="h-2 w-1/3 rounded bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-1.5 w-full max-w-[92%] rounded bg-white/[0.07]" />
          <div className="h-1.5 w-full max-w-[88%] rounded bg-white/[0.07]" />
          <div className="h-1.5 w-full max-w-[72%] rounded bg-white/[0.07]" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {['1:1', '4:5', '16:9'].map((r) => (
            <span key={r} className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-[var(--lp-muted)]">
              {r}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-teal-900/90 via-cyan-800/40 to-slate-950 ring-1 ring-white/10">
          <div className="flex h-full items-end p-1.5">
            <span className="font-mono text-[8px] font-medium uppercase text-white/40">v1</span>
          </div>
        </div>
        <div className="aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-violet-900/80 via-fuchsia-900/30 to-slate-950 ring-1 ring-white/10">
          <div className="flex h-full items-end p-1.5">
            <span className="font-mono text-[8px] font-medium uppercase text-white/40">v2</span>
          </div>
        </div>
        <div className="aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-sky-900/80 via-cyan-900/30 to-slate-950 ring-1 ring-white/10">
          <div className="flex h-full items-end p-1.5">
            <span className="font-mono text-[8px] font-medium uppercase text-white/40">v3</span>
          </div>
        </div>
        <div className="aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-amber-900/70 via-orange-900/25 to-slate-950 ring-1 ring-white/10">
          <div className="flex h-full items-end p-1.5">
            <span className="font-mono text-[8px] font-medium uppercase text-white/40">v4</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const WorkflowNodesMock: React.FC = () => (
  <div className="mt-5 space-y-2" aria-hidden>
    <div className="flex items-center gap-2 font-mono text-[9px] text-[var(--lp-faint)]">
      <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[var(--lp-muted)]">txt</span>
      <span className="text-[var(--lp-accent)]/50">→</span>
      <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[var(--lp-muted)]">img</span>
      <span className="text-[var(--lp-accent)]/50">→</span>
      <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[var(--lp-muted)]">style</span>
      <span className="text-[var(--lp-accent)]/50">→</span>
      <span className="rounded border border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)] px-1.5 py-0.5 text-[var(--lp-accent)]">
        batch
      </span>
    </div>
    <div className="h-14 rounded-xl border border-dashed border-white/10 bg-gradient-to-r from-white/[0.03] via-transparent to-[var(--lp-accent-dim)]" />
  </div>
);

const StyleRailMock: React.FC = () => (
  <div className="mt-5 flex items-end gap-1.5" aria-hidden>
    {['#0f172a', '#134e4a', '#0e7490', '#5eead4', '#ccfbf1'].map((c, i) => (
      <div
        key={c}
        className="w-full max-w-[2.75rem] rounded-t-md border border-white/10 shadow-sm"
        style={{
          height: `${36 + i * 10}px`,
          background: `linear-gradient(180deg, ${c}, ${i < 2 ? '#020617' : '#042f2e'})`,
        }}
      />
    ))}
    <div className="ml-1 flex h-14 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--lp-border)] bg-black/30">
      <Palette className="h-4 w-4 text-[var(--lp-accent)]/70" />
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, sessionNotice }) => (
  <div className="landing-premium relative min-h-screen overflow-x-hidden bg-[var(--lp-void)] font-sans text-[var(--lp-text)] antialiased">
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,var(--lp-accent-dim),transparent_58%)]"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_115%_20%,rgba(56,189,248,0.08),transparent_42%)]"
      aria-hidden
    />
    <div
      className="lp-grain pointer-events-none absolute inset-0 opacity-[0.55] mix-blend-overlay"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,var(--lp-ink)_88%)]"
      aria-hidden
    />

    <div className="relative mx-auto max-w-[88rem] px-5 pb-20 pt-6 sm:px-8 md:px-12 md:pb-24 md:pt-10">
      {sessionNotice ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-50/95"
        >
          {sessionNotice}
        </div>
      ) : null}
      <header className="mb-12 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--lp-border)] pb-8 sm:mb-16">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)] shadow-[0_0_32px_-6px_var(--lp-accent-glow)]">
            <Sparkles className="h-[18px] w-[18px] text-[var(--lp-accent)]" aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
              AI Image <span className="text-[var(--lp-accent)]">ZVAS</span>
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--lp-faint)]">
              Studio · Analytics · RBAC
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--lp-muted)] sm:inline-flex">
            Production
          </span>
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

      <div className="relative grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-6 lg:items-start">
        <section className="relative z-[1] lg:col-span-7 lg:pr-4">
          <p className="lp-anim-hero inline-flex items-center gap-2 rounded-full border border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--lp-accent)]">
            Studio tạo ảnh AI
          </p>
          <h1 className="lp-anim-hero lp-anim-hero-delay font-display mt-6 max-w-[14ch] text-pretty text-[2.65rem] font-semibold leading-[1.02] tracking-[-0.02em] text-white sm:text-5xl lg:text-[3.35rem] xl:text-[3.65rem]">
            Hình ảnh thương hiệu{' '}
            <span className="italic text-[var(--lp-accent)]">sắc nét</span>, nhất quán — từ prompt đến campaign.
          </h1>
          <p className="lp-anim-hero lp-anim-hero-delay mt-7 max-w-lg text-pretty text-base leading-[1.65] text-[var(--lp-muted)] sm:text-lg">
            Một nền tảng cho team cần tốc độ: tạo biến thể creative, giữ style, và có analytics + quyền admin cho môi
            trường thật — không chỉ demo.
          </p>

          <div
            id="login-cta"
            className="lp-anim-hero lp-anim-hero-delay mt-9 flex flex-col gap-3 sm:flex-row sm:items-center scroll-mt-28"
          >
            <button
              type="button"
              onClick={onLoginClick}
              className="group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-[var(--lp-void)] shadow-[0_24px_60px_-28px_rgba(255,255,255,0.45)] transition hover:bg-slate-100 sm:w-auto"
            >
              <LogIn className="h-5 w-5 shrink-0" aria-hidden />
              <span>Đăng nhập</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden
              />
            </button>
            
          </div>

          <ul className="mt-14 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {TRUST_POINTS.map(({ icon: Icon, label, detail }) => (
              <li
                key={label}
                className="flex gap-3 rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface)] p-4 backdrop-blur-md transition hover:border-[var(--lp-border-strong)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--lp-border)] bg-white/[0.03]">
                  <Icon className="h-4 w-4 text-[var(--lp-accent)]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-1 text-xs leading-snug text-[var(--lp-muted)]">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="relative z-[2] lg:col-span-5 lg:-mt-4">
          <div
            className="pointer-events-none absolute -inset-[1px] rounded-[1.5rem] bg-gradient-to-br from-[var(--lp-accent)]/25 via-transparent to-sky-500/15 opacity-90 blur-md"
            aria-hidden
          />
          <div className="lp-anim-panel relative overflow-hidden rounded-[1.35rem] border border-[var(--lp-border)] bg-[var(--lp-surface-elevated)] shadow-[0_40px_100px_-48px_rgba(0,0,0,0.85)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--lp-border)] bg-gradient-to-r from-white/[0.04] to-transparent px-6 py-5">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--lp-accent)]">
                  Studio credential
                </p>
                <p className="mt-1.5 font-display text-lg text-white">Pipeline trực tiếp</p>
                <p className="mt-1 text-sm text-[var(--lp-muted)]">Đăng nhập để vào studio và dashboard theo role.</p>
              </div>
              <span className="shrink-0 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Live
              </span>
            </div>

            <div className="p-6 md:p-8">
              <div className="mb-8 rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-void)]/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--lp-faint)]">
                    Luồng tạo
                  </span>
                  <span className="rounded-md bg-[var(--lp-accent-dim)] px-2 py-0.5 text-[10px] font-semibold text-[var(--lp-accent)]">
                    A → B → C
                  </span>
                </div>
                <div className="space-y-2 font-mono text-[11px] leading-relaxed text-[var(--lp-muted)]">
                  <div className="rounded-xl border border-[var(--lp-border)] bg-black/35 px-3 py-2.5 text-[var(--lp-text)]">
                    <span className="text-[var(--lp-accent)]/90">prompt</span> · &quot;Minimal skincare hero, soft
                    daylight…&quot;
                  </div>
                  <div className="flex items-center gap-2 px-1 text-[var(--lp-faint)]">
                    <span className="text-[var(--lp-accent)]/70">↓</span>
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                    <span>Style guide + aspect ratio</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <PipelineThumbMock label="A" variant="a" />
                    <PipelineThumbMock label="B" variant="b" />
                    <PipelineThumbMock label="C" variant="c" />
                  </div>
                </div>
              </div>

              <ul className="space-y-2.5 text-sm text-[var(--lp-muted)]">
                {['Lịch sử cá nhân & tải ảnh', 'Admin: users, settings, analytics', 'Rate limit & API theo môi trường'].map(
                  (item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-accent)]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  )
                )}
              </ul>

              <div className="mt-8 grid grid-cols-3 gap-2 border-t border-[var(--lp-border)] pt-6 text-center">
                <div>
                  <p className="font-display text-xl font-semibold tabular-nums text-white">3</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--lp-faint)]">Providers</p>
                </div>
                <div>
                  <p className="font-display text-xl font-semibold tabular-nums text-white">10/m</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--lp-faint)]">Rate limit</p>
                </div>
                <div>
                  <p className="font-display text-xl font-semibold text-white">RBAC</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--lp-faint)]">Roles</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section id="features" className="mt-28 scroll-mt-28 md:mt-32">
        <div className="mb-12 flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lp-accent)]">
              Platform
            </p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Vì sao team chọn ZVAS
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--lp-muted)] sm:text-right">
            Tập trung vào output đẹp và vận hành rõ ràng — từ người tạo ảnh đến người quản trị.
          </p>
        </div>

        <div className="grid auto-rows-fr gap-4 md:grid-cols-3 md:grid-rows-2">
          {VALUE_PROPS.map(({ icon: Icon, title, body, featured, mock }) => (
            <article
              key={title}
              className={
                featured
                  ? 'group relative flex flex-col justify-between overflow-hidden rounded-[1.35rem] border border-[var(--lp-border-strong)] bg-gradient-to-br from-[var(--lp-accent-dim)] via-[var(--lp-surface)] to-[var(--lp-void)] p-7 md:col-span-2 md:row-span-2 md:min-h-[20rem]'
                  : 'group flex flex-col rounded-[1.35rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 backdrop-blur-md transition hover:border-[var(--lp-border-strong)] hover:bg-[var(--lp-surface-elevated)]'
              }
            >
              {featured && (
                <div
                  className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-[var(--lp-accent)]/10 blur-3xl"
                  aria-hidden
                />
              )}
              <span
                className={
                  featured
                    ? 'relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--lp-border-strong)] bg-black/25 text-[var(--lp-accent)]'
                    : 'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--lp-border)] bg-white/[0.03] text-[var(--lp-accent)] transition group-hover:border-[var(--lp-border-strong)]'
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className={featured ? 'relative mt-8 flex min-h-0 flex-1 flex-col' : 'mt-4 flex flex-1 flex-col'}>
                <h3 className="font-display text-xl font-semibold text-white md:text-2xl">{title}</h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--lp-muted)] md:text-base">{body}</p>
                {mock === 'studio' && <BentoStudioMock />}
                {mock === 'workflow' && <WorkflowNodesMock />}
                {mock === 'style' && <StyleRailMock />}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-24 md:mt-28" aria-labelledby="how-heading">
        <h2 id="how-heading" className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Cách hoạt động
        </h2>
        <div className="relative mt-10">
          <div
            className="pointer-events-none absolute left-0 right-0 top-[2.25rem] hidden h-px bg-gradient-to-r from-transparent via-[var(--lp-border-strong)] to-transparent md:block"
            aria-hidden
          />
          <ol className="relative grid gap-6 md:grid-cols-3 md:gap-0">
            {STEPS.map(({ step, title, desc }) => (
              <li
                key={step}
                className="relative rounded-[1.25rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 pt-8 backdrop-blur-md md:border-t-[var(--lp-border-strong)] md:pt-10"
              >
                <span className="font-mono text-xs font-semibold text-[var(--lp-accent)]">{step}</span>
                <p className="mt-3 font-display text-lg text-white">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lp-muted)]">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-24 md:mt-28">
        <div className="relative overflow-hidden rounded-[1.35rem] border border-[var(--lp-border-strong)] bg-[var(--lp-surface-elevated)] px-6 py-14 text-center shadow-[0_32px_80px_-40px_rgba(0,0,0,0.75)] md:px-16 md:py-16">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,var(--lp-accent-dim),transparent_65%)]"
            aria-hidden
          />
          <h2 className="relative mx-auto max-w-xl text-pretty font-display text-2xl font-semibold text-white md:text-3xl">
            Sẵn sàng cho batch creative tiếp theo?
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-sm text-[var(--lp-muted)]">
            Đăng nhập bằng tài khoản được cấp để vào studio — giao diện và công cụ hiển thị theo vai trò của bạn.
          </p>
          <button
            type="button"
            onClick={onLoginClick}
            className="relative mt-10 inline-flex items-center gap-2 rounded-2xl bg-white px-9 py-4 text-base font-semibold text-[var(--lp-void)] transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)]"
          >
            <LogIn className="h-5 w-5" aria-hidden />
            Đăng nhập
          </button>
        </div>
      </section>

      <footer className="mt-16 border-t border-[var(--lp-border)] pt-10 text-center text-xs text-[var(--lp-faint)]">
        AI Image ZVAS — studio tạo ảnh AI cho marketing, design và sản phẩm.
      </footer>
    </div>
  </div>
);
