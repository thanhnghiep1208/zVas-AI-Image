import React, { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import comparisonMarkdown from '../../docs/so-sanh-model-gemini.md?raw';

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="rounded bg-[var(--lp-accent-dim)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--lp-accent)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function isTableSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-{3,}:?$/.test(c.trim()));
}

function parseMarkdownToElements(source: string): React.ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const nextKey = () => {
    key += 1;
    return `md-${key}`;
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const t = line.trim();

    if (t === '') {
      i += 1;
      continue;
    }

    if (t.startsWith('### ')) {
      out.push(
        <h3
          key={nextKey()}
          className="mt-5 text-base font-semibold tracking-tight text-[var(--lp-text)] first:mt-0"
        >
          {renderInline(t.slice(4))}
        </h3>
      );
      i += 1;
      continue;
    }

    if (t.startsWith('## ')) {
      out.push(
        <h2
          key={nextKey()}
          className="mt-6 border-b border-[var(--lp-border)] pb-2 text-lg font-semibold tracking-tight text-[var(--lp-text)] first:mt-0"
        >
          {renderInline(t.slice(3))}
        </h2>
      );
      i += 1;
      continue;
    }

    if (t.startsWith('# ')) {
      out.push(
        <h1 key={nextKey()} className="text-xl font-bold tracking-tight text-[var(--lp-text)]">
          {renderInline(t.slice(2))}
        </h1>
      );
      i += 1;
      continue;
    }

    if (t === '---') {
      out.push(<hr key={nextKey()} className="my-6 border-[var(--lp-border)]" />);
      i += 1;
      continue;
    }

    if (t.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      const rows = tableLines.map((row) =>
        row
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim())
      );
      const bodyRows = rows.filter((r, idx) => !(idx === 1 && isTableSeparatorRow(r)));
      if (bodyRows.length === 0) continue;

      const [headerCells, ...dataRows] = bodyRows;
      out.push(
        <div key={nextKey()} className="my-4 overflow-x-auto rounded-xl border border-[var(--lp-border)]">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)]">
                {headerCells.map((cell, j) => (
                  <th key={j} className="px-3 py-2.5 font-semibold text-[var(--lp-text)]">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--lp-border)] last:border-0 odd:bg-[var(--lp-surface)]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top text-[var(--lp-muted)]">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^[-*]\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        if (lt === '') break;
        if (!/^[-*]\s/.test(lt)) break;
        items.push(lt.replace(/^[-*]\s/, ''));
        i += 1;
      }
      out.push(
        <ul key={nextKey()} className="my-3 list-disc space-y-1.5 pl-5 text-sm text-[var(--lp-muted)]">
          {items.map((item, li) => (
            <li key={li} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    out.push(
      <p key={nextKey()} className="my-2 text-sm leading-relaxed text-[var(--lp-muted)]">
        {renderInline(line.trim())}
      </p>
    );
    i += 1;
  }

  return out;
}

export interface GeminiModelComparisonModalProps {
  open: boolean;
  onClose: () => void;
}

export function GeminiModelComparisonModal({ open, onClose }: GeminiModelComparisonModalProps) {
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const body = useMemo(() => parseMarkdownToElements(comparisonMarkdown), []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => closeBtnRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  if (!open || typeof document === 'undefined') return null;

  /** Portal ra `body` — `backdrop-blur` trên `<header>` tạo containing block khiến `fixed` con bị cắt/lệch. */
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex min-h-0 items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex w-full max-w-[820px] min-h-0 max-h-[min(85vh,720px)] flex-col overflow-hidden rounded-2xl border border-[var(--lp-border-strong)] bg-[var(--lp-surface-elevated)] shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--lp-border)] px-4 py-3 sm:px-5">
          <h2 id={titleId} className="text-base font-semibold text-[var(--lp-text)] sm:text-lg">
            So sánh model Gemini
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--lp-border)] bg-[var(--lp-accent-dim)] text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-text)]"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">{body}</div>
        <p className="shrink-0 border-t border-[var(--lp-border)] px-4 py-2.5 text-center text-[10px] text-[var(--lp-muted)] sm:px-5">
          Nguồn: <code className="rounded bg-[var(--lp-accent-dim)] px-1 font-mono">docs/so-sanh-model-gemini.md</code>
        </p>
      </div>
    </div>,
    document.body
  );
}
