import React from 'react';
import type { ImageFile, GeneratedImage, ImageSize } from '../../types';
import { ImageUploader } from '../ImageUploader';
import { ReferenceImageUploader } from '../ReferenceImageUploader';
import { PromptManager } from '../PromptManager';
import { ResultsDisplay } from '../ResultsDisplay';
import { PromptOptions } from '../PromptOptions';
import { AspectRatioSelector } from '../AspectRatioSelector';
import { ImageSizeSelector } from '../ImageSizeSelector';
import { HistoryDisplay } from '../HistoryDisplay';

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

export const CreateView: React.FC<CreateViewProps> = ({
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
}) => (
  <>
    <aside className="w-full lg:w-[480px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-700 bg-gray-800/30 lg:h-full">
      <div className="flex-shrink-0 lg:flex-1 lg:overflow-y-auto p-4 space-y-4 custom-scrollbar">
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

      <div className="p-6 border-t border-gray-700 bg-gray-900/50 backdrop-blur-md z-10 sticky bottom-0 lg:static">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className={`w-full text-lg font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center ${
            canGenerate
              ? 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg transform hover:scale-[1.02]'
              : 'bg-gray-700 cursor-not-allowed text-gray-500'
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
              Đang tạo...
            </>
          ) : (
            'Generate Images'
          )}
        </button>
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
            {error.includes('Quota exceeded') ? (
              <p className="text-amber-400">
                <span className="font-bold">Hết hạn mức (Quota Exceeded):</span> Hệ thống đã đạt giới hạn lượt đọc
                miễn phí trong ngày. Vui lòng quay lại vào ngày mai hoặc liên hệ Admin để nâng cấp.
              </p>
            ) : (
              <p className="text-red-400">{error}</p>
            )}
          </div>
        )}
      </div>
    </aside>

    <main className="flex-shrink-0 lg:flex-1 bg-gray-900 p-2 flex flex-col lg:overflow-hidden min-h-[400px] lg:min-h-0">
      <div className="flex items-center justify-between mb-2 px-1 flex-shrink-0">
        <h2 className="text-base font-bold text-cyan-300 uppercase tracking-wider">Kết quả</h2>
      </div>
      <div className="flex-shrink-0 lg:flex-1 lg:overflow-y-auto rounded-lg border border-gray-800 bg-gray-800/20 mb-2">
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

      <div className="h-32 flex-shrink-0 border-t border-gray-800 pt-2">
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
