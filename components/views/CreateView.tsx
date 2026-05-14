import React, { useState, useCallback, memo } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { ImageFile, GeneratedImage, ImageSize } from '../../types';
import { ImageUploader } from '../ImageUploader';
import { ReferenceImageUploader } from '../ReferenceImageUploader';
import { PromptManager } from '../PromptManager';
import { ResultsDisplay } from '../ResultsDisplay';
import { PromptOptions } from '../PromptOptions';
import { AspectRatioSelector } from '../AspectRatioSelector';
import { ImageSizeSelector } from '../ImageSizeSelector';
import { HistoryDisplay } from '../HistoryDisplay';
import { isQuotaOrUsageLimitUserMessage } from '../../utils/userFacingError';

type PromptOptionsState = {
  styleSimplified: boolean;
  keepStyle: boolean;
  keepStartImageStyle: boolean;
  forceRemoveBackground: boolean;
  backgroundRemovalStrength: 'soft' | 'strong';
};

export interface CreateViewProps {
  prompts: string[];
  setPrompts: React.Dispatch<React.SetStateAction<string[]>>;
  promptOptions: PromptOptionsState;
  onOptionChange: (option: keyof PromptOptionsState) => void;
  onBackgroundRemovalStrengthChange: (strength: 'soft' | 'strong') => void;
  backgroundStyle: string;
  onBackgroundStyleChange: (v: string) => void;
  selectedStyle: string;
  onSelectedStyleChange: (v: string) => void;
  outlineType: 'none' | 'white' | 'black';
  onOutlineTypeChange: (v: 'none' | 'white' | 'black') => void;
  outlineThickness: 'thin' | 'normal' | 'thick';
  onOutlineThicknessChange: (v: 'thin' | 'normal' | 'thick') => void;
  image: ImageFile | null;
  referenceImages: ImageFile[];
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  onAddReferenceImage: (file: File) => void;
  onRemoveReferenceImage: (index: number) => void;
  aspectRatio: string;
  onAspectRatioChange: (v: string) => void;
  imageSize: ImageSize;
  onImageSizeChange: (v: ImageSize) => void;
  onShowStyleGuide: () => void;
  onGenerate: () => void;
  canGenerate: boolean;
  isLoading: boolean;
  error: string | null;
  generatedImages: GeneratedImage[];
  historyImages: GeneratedImage[];
  onFullscreen: (img: GeneratedImage) => void;
  onUseAsInput: (img: GeneratedImage) => void;
  onDownload: (img: GeneratedImage) => void;
  onForceRemoveBackgroundDownload: (img: GeneratedImage) => void;
  onClearHistory: () => void;
}

const CREATE_WELCOME_DISMISSED_KEY = 'zvas-create-welcome-dismissed';

function readWelcomeDismissedFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CREATE_WELCOME_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function CreateViewComponent({
  prompts,
  setPrompts,
  promptOptions,
  onOptionChange,
  onBackgroundRemovalStrengthChange,
  backgroundStyle,
  onBackgroundStyleChange,
  selectedStyle,
  onSelectedStyleChange,
  outlineType,
  onOutlineTypeChange,
  outlineThickness,
  onOutlineThicknessChange,
  image,
  referenceImages,
  onImageSelect,
  onImageRemove,
  onAddReferenceImage,
  onRemoveReferenceImage,
  aspectRatio,
  onAspectRatioChange,
  imageSize,
  onImageSizeChange,
  onShowStyleGuide,
  onGenerate,
  canGenerate,
  isLoading,
  error,
  generatedImages,
  historyImages,
  onFullscreen,
  onUseAsInput,
  onDownload,
  onForceRemoveBackgroundDownload,
  onClearHistory,
}: CreateViewProps) {
  const [welcomeDismissed, setWelcomeDismissed] = useState(readWelcomeDismissedFromStorage);

  const dismissWelcomeBanner = useCallback(() => {
    try {
      localStorage.setItem(CREATE_WELCOME_DISMISSED_KEY, '1');
    } catch {
      /* ignore quota / private mode */
    }
    setWelcomeDismissed(true);
  }, []);

  return (
  <>
    <aside className="flex w-full flex-shrink-0 flex-col border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-sm lg:h-full lg:w-[480px] lg:border-b-0 lg:border-r">
      <div className="custom-scrollbar flex-shrink-0 space-y-4 p-4 lg:flex-1 lg:overflow-y-auto">
        {!welcomeDismissed && (
          <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.06] px-3 py-2.5 sm:px-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
              <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden />
            </span>
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-gray-400 sm:text-sm">
              <span className="font-medium text-gray-200">Chào bạn!</span> Viết prompt, thêm ảnh gốc nếu cần, chọn style — rồi bấm{' '}
              <span className="text-cyan-300/90">Tạo ảnh</span> bên dưới.
            </p>
            <button
              type="button"
              onClick={dismissWelcomeBanner}
              className="shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500/60"
              aria-label="Đóng gợi ý"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}

        <PromptManager prompts={prompts} setPrompts={setPrompts} hasImage={!!image} />

        <PromptOptions
          options={promptOptions}
          onOptionChange={onOptionChange}
          onBackgroundRemovalStrengthChange={onBackgroundRemovalStrengthChange}
          backgroundStyle={backgroundStyle}
          onBackgroundChange={onBackgroundStyleChange}
          selectedStyle={selectedStyle}
          onStyleChange={onSelectedStyleChange}
          outlineType={outlineType}
          onOutlineTypeChange={onOutlineTypeChange}
          outlineThickness={outlineThickness}
          onOutlineThicknessChange={onOutlineThicknessChange}
          hasReferenceImages={referenceImages.length > 0}
          hasStartImage={!!image}
          onShowStyleGuide={onShowStyleGuide}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ImageUploader onImageSelect={onImageSelect} image={image} onImageRemove={onImageRemove} />
          <ReferenceImageUploader
            onImageAdd={onAddReferenceImage}
            onImageRemove={onRemoveReferenceImage}
            images={referenceImages}
            isDisabled={!image}
          />
        </div>

        <AspectRatioSelector aspectRatio={aspectRatio} setAspectRatio={onAspectRatioChange} />

        <ImageSizeSelector imageSize={imageSize} setImageSize={onImageSizeChange} />
      </div>

      <div className="sticky bottom-0 z-10 border-t border-[var(--lp-border)] bg-[var(--lp-surface)] p-5 backdrop-blur-lg lg:static lg:bg-[var(--lp-surface)]/90">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className={`flex w-full items-center justify-center rounded-2xl px-4 py-3.5 text-base font-semibold transition-all duration-300 sm:py-4 sm:text-lg ${
            canGenerate
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.99]'
              : 'cursor-not-allowed bg-white/5 text-gray-600'
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="-ml-1 mr-2 h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Đang tạo ảnh…
            </>
          ) : (
            'Tạo ảnh'
          )}
        </button>
        {error && (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm ${
              isQuotaOrUsageLimitUserMessage(error)
                ? 'border-amber-500/30 bg-amber-500/[0.08]'
                : 'border-red-500/25 bg-red-500/[0.08]'
            }`}
          >
            {isQuotaOrUsageLimitUserMessage(error) ? (
              <p className="text-amber-200/95">
                <span className="font-semibold text-amber-100">Tạm thời bị giới hạn:</span> {error}
              </p>
            ) : (
              <p className="text-red-300">{error}</p>
            )}
          </div>
        )}
      </div>
    </aside>

    <main className="flex min-h-[400px] flex-shrink-0 flex-col p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <div className="mb-3 flex flex-shrink-0 flex-col gap-0.5 px-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">Kết quả</h2>
          <p className="text-xs text-gray-500">Xem trước, tải về hoặc dùng làm ảnh đầu vào</p>
        </div>
      </div>
      <div className="mb-3 flex min-h-0 flex-shrink-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] lg:overflow-y-auto">
        <ResultsDisplay
          originalImage={image}
          generatedImages={generatedImages}
          isLoading={isLoading}
          onImageSelect={onFullscreen}
          onUseAsInput={onUseAsInput}
          onDownload={onDownload}
          onForceRemoveBackgroundDownload={onForceRemoveBackgroundDownload}
        />
      </div>

      <div className="h-32 flex-shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] pt-3">
        <HistoryDisplay
          images={historyImages}
          onImageSelect={onFullscreen}
          onUseAsInput={onUseAsInput}
          onDownload={onDownload}
          onClear={onClearHistory}
        />
      </div>
    </main>
  </>
  );
}

export const CreateView = memo(CreateViewComponent);
