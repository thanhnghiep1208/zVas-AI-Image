
import React, { useState, useEffect, memo } from 'react';
import { ImageUploader } from '../inputs/ImageUploader';
import { ImageFile, GeneratedImage } from '../../types';
import { TrashIcon } from '../icons/TrashIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ResultsDisplay } from '../results/ResultsDisplay';
import { HistoryDisplay } from '../results/HistoryDisplay';
import { GenerationErrorAlert } from '../feedback/GenerationErrorAlert';

interface MultipleImageProps {
  image: ImageFile | null;
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  prompts: string[];
  setPrompts: React.Dispatch<React.SetStateAction<string[]>>;
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
  generatedImages: GeneratedImage[];
  historyImages: GeneratedImage[];
  onFullscreen: (image: GeneratedImage) => void;
  onUseAsInput: (image: GeneratedImage) => void;
  onDownload: (image: GeneratedImage) => void;
  onForceRemoveBackgroundDownload: (image: GeneratedImage) => void;
  onClearHistory: () => void;
}

function MultipleImageComponent({
  image,
  onImageSelect,
  onImageRemove,
  prompts,
  setPrompts,
  onGenerate,
  isLoading,
  error,
  generatedImages,
  historyImages,
  onFullscreen,
  onUseAsInput,
  onDownload,
  onForceRemoveBackgroundDownload,
  onClearHistory
}: MultipleImageProps) {
  const [numImages, setNumImages] = useState(prompts.length || 1);

  useEffect(() => {
    // Sync prompts with numImages
    if (prompts.length !== numImages) {
      if (prompts.length < numImages) {
        setPrompts([...prompts, ...Array(numImages - prompts.length).fill('')]);
      } else {
        setPrompts(prompts.slice(0, numImages));
      }
    }
  }, [numImages, setPrompts]);

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <aside className="flex w-full flex-shrink-0 flex-col border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-sm lg:h-full lg:w-[480px] lg:border-b-0 lg:border-r">
        <div className="custom-scrollbar flex-shrink-0 space-y-6 p-4 lg:flex-1 lg:overflow-y-auto">
          {/* Image Upload Section */}
          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-white">Hình ảnh gốc</h2>
            <div className="max-w-xs mx-auto lg:mx-0">
              <ImageUploader
                onImageSelect={onImageSelect}
                image={image}
                onImageRemove={onImageRemove}
                showLabel={false}
              />
            </div>
          </section>

          {/* Number of Images Selector */}
          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-white">Số lượng hình (tối đa 4)</h2>
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setNumImages(num)}
                  className={`h-10 w-10 rounded-xl font-semibold transition-all ${
                    numImages === num
                      ? 'scale-105 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                      : 'border border-white/10 bg-white/[0.05] text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </section>

          {/* Dynamic Prompts Section */}
          <section className="space-y-4">
            <h2 className="mb-1 text-sm font-semibold tracking-tight text-white">Mô tả cho từng hình</h2>
            {prompts.slice(0, numImages).map((prompt, index) => (
              <div key={index} className="space-y-1.5">
                <label className="flex items-center text-xs font-medium text-gray-500">
                  <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-[10px] font-semibold text-cyan-300">
                    {index + 1}
                  </span>
                  Prompt cho hình {index + 1}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => handlePromptChange(index, e.target.value)}
                  placeholder={`VD: Biến hậu cảnh thành phong cảnh núi rừng cho hình ${index + 1}...`}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            ))}
          </section>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-[var(--lp-border)] bg-[var(--lp-surface)] p-5 backdrop-blur-lg lg:static lg:bg-[var(--lp-surface)]/90">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isLoading || !image || prompts.slice(0, numImages).every((p) => !p.trim())}
            className={`flex w-full items-center justify-center rounded-2xl px-4 py-3.5 text-base font-semibold transition-all duration-300 sm:py-4 sm:text-lg ${
              !isLoading && image && prompts.slice(0, numImages).some((p) => p.trim())
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.99]'
                : 'cursor-not-allowed bg-white/5 text-gray-600'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="-ml-1 mr-2 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo…
              </>
            ) : (
              'Tạo nhiều biến thể'
            )}
          </button>
          <GenerationErrorAlert error={error} className="mt-3 text-center" />
        </div>
      </aside>

      <main className="flex min-h-[400px] flex-shrink-0 flex-col p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div className="mb-3 flex flex-shrink-0 flex-col gap-0.5 px-0.5">
          <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">Kết quả</h2>
          <p className="text-xs text-gray-500">Các biến thể từ cùng một ảnh gốc</p>
        </div>
        <div className="mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] lg:overflow-y-auto">
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

        {/* History Section */}
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
    </div>
  );
}

export const MultipleImage = memo(MultipleImageComponent);
