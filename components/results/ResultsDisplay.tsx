
import React from 'react';
import type { ImageFile, GeneratedImage } from '../../types';
import { DownloadIcon } from '../icons/DownloadIcon';
import { ExpandIcon } from '../icons/ExpandIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface ResultsDisplayProps {
  originalImage: ImageFile | null;
  generatedImages: GeneratedImage[];
  isLoading: boolean;
  onImageSelect: (image: GeneratedImage) => void;
  onUseAsInput: (image: GeneratedImage) => void;
  onDownload: (image: GeneratedImage) => void;
  onForceRemoveBackgroundDownload: (image: GeneratedImage) => void;
}

interface ImageCardProps {
  title: string;
  imageUrl: string;
  caption?: string | null;
  isError?: boolean;
  onDownload?: () => void;
  onQuickView?: () => void;
  onUseAsInput?: () => void;
  onForceRemoveBackgroundDownload?: () => void;
  isOriginal?: boolean;
}

const ImageCard: React.FC<ImageCardProps> = React.memo(({
  title,
  imageUrl,
  caption,
  isError = false,
  onDownload,
  onQuickView,
  onUseAsInput,
  onForceRemoveBackgroundDownload,
  isOriginal = false,
}) => {
  if (isOriginal) {
    return (
      <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-lg shadow-black/20">
        <div className="border-b border-white/[0.08] bg-white/[0.04] px-3 py-2">
          <h3 className="truncate text-xs font-semibold tracking-tight text-cyan-200/95">Ảnh gốc</h3>
        </div>
        <div className="relative min-h-[280px] flex-1 bg-black/80 lg:min-h-[480px]">
          <img src={imageUrl} alt={title} className="absolute inset-0 h-full w-full object-contain p-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-lg shadow-black/20 transition-all duration-200 hover:border-cyan-500/35">
      <div
        className={`relative min-h-[280px] flex-1 lg:min-h-[480px] ${
          isError ? 'flex items-center justify-center bg-red-500/[0.06]' : 'bg-black/80'
        }`}
      >
        {isError ? (
          <div className="max-w-[90%] space-y-2 p-5 text-center">
            <p className="text-sm font-semibold text-red-300">Không tạo được ảnh</p>
            {caption ? <p className="text-xs leading-relaxed text-red-200/80">{caption}</p> : null}
          </div>
        ) : (
          <>
            <img src={imageUrl} alt={title} className="absolute inset-0 h-full w-full object-contain p-1" />
            <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              {onQuickView && (
                <button
                  type="button"
                  onClick={onQuickView}
                  className="rounded-full border border-white/10 bg-black/55 p-2 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/40 hover:bg-cyan-600/80"
                  title="Xem toàn màn hình"
                >
                  <ExpandIcon className="h-4 w-4" />
                </button>
              )}
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="rounded-full border border-white/10 bg-black/55 p-2 text-white backdrop-blur-sm transition-colors hover:border-cyan-400/40 hover:bg-cyan-600/80"
                  title="Tải xuống (JPG)"
                >
                  <DownloadIcon className="h-4 w-4" />
                </button>
              )}
              {onForceRemoveBackgroundDownload && (
                <button
                  type="button"
                  onClick={onForceRemoveBackgroundDownload}
                  className="rounded-full border border-white/10 bg-black/55 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-emerald-400/50 hover:bg-emerald-600/85"
                  title="Tách nền và tải PNG"
                >
                  Tách nền
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {!isError && (
        <div className="space-y-2 border-t border-white/[0.08] bg-white/[0.02] p-3">
          <p className="line-clamp-2 text-xs font-medium leading-relaxed text-gray-300" title={title}>
            {title}
          </p>
          {onUseAsInput && (
            <button
              type="button"
              onClick={onUseAsInput}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-gray-100 transition-colors hover:border-cyan-500/35 hover:bg-cyan-600/25"
            >
              <SparklesIcon className="h-3.5 w-3.5 text-cyan-200/90" />
              <span>Dùng làm ảnh gốc</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  originalImage,
  generatedImages,
  isLoading,
  onImageSelect,
  onUseAsInput,
  onDownload,
  onForceRemoveBackgroundDownload,
}) => {
  if (!originalImage && !isLoading && generatedImages.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-cyan-500/10 to-blue-600/5 text-cyan-300/50">
          <SparklesIcon className="h-8 w-8" />
        </div>
        <div className="max-w-xs space-y-1">
          <p className="text-sm font-medium text-gray-300">Chưa có ảnh nào</p>
          <p className="text-xs leading-relaxed text-gray-500">
            Sau khi bạn tạo, ảnh sẽ hiện ở đây — xem trước, tải về hoặc dùng làm ảnh đầu vào.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && generatedImages.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 p-6">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/10 border-t-cyan-400" />
        </div>
        <p className="text-sm font-medium text-gray-400">Đang tạo ảnh…</p>
        <p className="max-w-xs text-center text-xs text-gray-600">Quá trình có thể mất vài giây</p>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-3 sm:p-4">
      <div className="grid auto-rows-fr grid-cols-1 gap-4 lg:grid-cols-2">
        {originalImage && (
          <ImageCard title="Ảnh gốc" imageUrl={originalImage.previewUrl} isOriginal />
        )}
        {generatedImages.map((image, index) => (
          <ImageCard
            key={index}
            title={image.prompt}
            imageUrl={image.imageUrl}
            caption={image.text}
            isError={image.imageUrl === 'error'}
            onDownload={image.imageUrl !== 'error' ? () => onDownload(image) : undefined}
            onForceRemoveBackgroundDownload={
              image.imageUrl !== 'error' ? () => onForceRemoveBackgroundDownload(image) : undefined
            }
            onQuickView={image.imageUrl !== 'error' ? () => onImageSelect(image) : undefined}
            onUseAsInput={image.imageUrl !== 'error' ? () => onUseAsInput(image) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
