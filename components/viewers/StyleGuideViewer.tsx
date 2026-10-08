import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  STYLE_GUIDE_ITEMS,
  filterStyleGuideItems,
  getStyleGuideCategories,
  isStyleGuideItemSelected,
} from '../../lib/styleGuide';

interface StyleGuideViewerProps {
  onClose: () => void;
  onStyleSelect: (styleValue: string) => void;
  /** Style đang chọn (`Category:Name`) để đánh dấu trong lưới. */
  selectedStyle?: string;
}

/** Thumbnail 228×228 cắt từ ảnh lưới gốc — host cùng app (Vite asset, tên có hash). */
const THUMBNAILS = import.meta.glob<string>('../../assets/images/styles/*.webp', {
  eager: true,
  import: 'default',
});

function thumbnailFor(id: string): string | undefined {
  return THUMBNAILS[`../../assets/images/styles/${id}.webp`];
}

const CATEGORIES = getStyleGuideCategories(STYLE_GUIDE_ITEMS);

function chipClass(active: boolean): string {
  return `inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)] ${
    active
      ? 'border-[var(--lp-border-strong)] bg-[var(--lp-accent-dim)] text-[var(--lp-accent)]'
      : 'border-[var(--lp-border)] text-[var(--lp-muted)] hover:border-[var(--lp-border-strong)] hover:text-[var(--lp-text)]'
  }`;
}

function StyleGuideViewerInner({ onClose, onStyleSelect, selectedStyle = '' }: StyleGuideViewerProps) {
  const [category, setCategory] = useState<string | null>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => filterStyleGuideItems(STYLE_GUIDE_ITEMS, category), [category]);
  const selectedItem = useMemo(
    () => STYLE_GUIDE_ITEMS.find((item) => isStyleGuideItemSelected(item, selectedStyle)),
    [selectedStyle]
  );

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // Mở popup: focus style đang chọn (cuộn tới nếu cần), không có thì focus nút đóng.
  useEffect(() => {
    const target = selectedRef.current ?? closeRef.current;
    target?.focus({ preventScroll: true });
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--lp-void)]/90 p-3 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-guide-title"
      aria-describedby="style-guide-desc"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface-elevated)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-[var(--lp-border)] px-5 pt-4 pb-3 sm:px-6">
          <div className="min-w-0">
            <h2
              id="style-guide-title"
              className="font-display text-lg font-semibold tracking-tight text-[var(--lp-text)] sm:text-xl"
            >
              Thư viện phong cách
            </h2>
            <p id="style-guide-desc" className="mt-0.5 text-xs text-[var(--lp-muted)] sm:text-sm">
              {STYLE_GUIDE_ITEMS.length} phong cách — chọn một để áp dụng vào prompt.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg border border-[var(--lp-border)] p-2 text-[var(--lp-muted)] transition-colors hover:border-[var(--lp-border-strong)] hover:text-[var(--lp-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)]"
            aria-label="Đóng thư viện phong cách"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Lọc theo nhóm */}
        <div
          className="custom-scrollbar flex flex-shrink-0 gap-2 overflow-x-auto border-b border-[var(--lp-border)] px-5 py-3 sm:px-6"
          role="group"
          aria-label="Lọc theo nhóm phong cách"
        >
          <button type="button" className={chipClass(category === null)} aria-pressed={category === null} onClick={() => setCategory(null)}>
            Tất cả <span className="opacity-60">{STYLE_GUIDE_ITEMS.length}</span>
          </button>
          {CATEGORIES.map(({ category: name, count }) => (
            <button
              key={name}
              type="button"
              className={chipClass(category === name)}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>

        {/* Lưới style */}
        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    ref={isSelected ? selectedRef : undefined}
                    type="button"
                    onClick={() => onStyleSelect(item.value)}
                    aria-pressed={isSelected}
                    className={`group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)] ${
                      isSelected
                        ? 'border-[var(--lp-accent)] bg-[var(--lp-accent-dim)] shadow-[0_0_24px_-10px_var(--lp-accent-glow)]'
                        : 'border-[var(--lp-border)] bg-[var(--lp-ink)] hover:-translate-y-0.5 hover:border-[var(--lp-border-strong)]'
                    }`}
                  >
                    <span className="block aspect-square w-full overflow-hidden bg-[var(--lp-void)]">
                      <img
                        src={thumbnailFor(item.id)}
                        alt=""
                        width={228}
                        height={228}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    </span>
                    <span className="flex min-w-0 flex-col px-2.5 py-2">
                      <span className="truncate text-sm font-medium text-[var(--lp-text)]">{item.name}</span>
                      <span className="truncate text-[11px] text-[var(--lp-muted)]">{item.category}</span>
                    </span>
                    {isSelected && (
                      <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--lp-accent)] text-[var(--lp-ink)] shadow-lg">
                        <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer: style đang chọn */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-[var(--lp-border)] px-5 py-3 text-xs sm:px-6 sm:text-sm">
          {selectedItem ? (
            <>
              <span className="min-w-0 truncate text-[var(--lp-muted)]">
                Đang chọn: <span className="font-medium text-[var(--lp-accent)]">{selectedItem.name}</span>
              </span>
              <button
                type="button"
                onClick={() => onStyleSelect('')}
                className="shrink-0 cursor-pointer rounded-lg border border-[var(--lp-border)] px-3 py-1.5 text-[var(--lp-muted)] transition-colors hover:border-[var(--lp-border-strong)] hover:text-[var(--lp-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)]"
              >
                Bỏ chọn
              </button>
            </>
          ) : (
            <span className="text-[var(--lp-muted)]">Chưa chọn phong cách — prompt giữ nguyên.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export const StyleGuideViewer = memo(StyleGuideViewerInner);
