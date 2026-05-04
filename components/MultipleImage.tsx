
import React, { useState, useEffect } from 'react';
import { ImageUploader } from './ImageUploader';
import { ImageFile, GeneratedImage } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { ResultsDisplay } from './ResultsDisplay';
import { HistoryDisplay } from './HistoryDisplay';

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

export const MultipleImage: React.FC<MultipleImageProps> = ({
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
}) => {
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
    <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
      <aside className="w-full lg:w-[480px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-700 bg-gray-800/30 lg:h-full">
        <div className="flex-shrink-0 lg:flex-1 lg:overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Image Upload Section */}
          <section>
            <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider mb-3">Hình ảnh gốc</h2>
            <div className="max-w-xs mx-auto lg:mx-0">
              <ImageUploader onImageSelect={onImageSelect} image={image} onImageRemove={onImageRemove} />
            </div>
          </section>

          {/* Number of Images Selector */}
          <section>
            <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider mb-3">Số lượng hình (Tối đa 4)</h2>
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setNumImages(num)}
                  className={`w-10 h-10 rounded-lg font-bold transition-all ${
                    numImages === num
                      ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-110'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </section>

          {/* Dynamic Prompts Section */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider mb-1">Mô tả cho từng hình</h2>
            {prompts.slice(0, numImages).map((prompt, index) => (
              <div key={index} className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-tight flex items-center">
                  <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] mr-2 text-cyan-400 border border-gray-600">
                    {index + 1}
                  </span>
                  Prompt cho hình {index + 1}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => handlePromptChange(index, e.target.value)}
                  placeholder={`VD: Biến hậu cảnh thành phong cảnh núi rừng cho hình ${index + 1}...`}
                  rows={3}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all resize-none placeholder-gray-600"
                />
              </div>
            ))}
          </section>
        </div>

        <div className="p-6 border-t border-gray-700 bg-gray-900/50 backdrop-blur-md z-10 sticky bottom-0 lg:static">
          <button
            onClick={onGenerate}
            disabled={isLoading || !image || prompts.slice(0, numImages).every(p => !p.trim())}
            className={`w-full text-lg font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center ${
              !isLoading && image && prompts.slice(0, numImages).some(p => p.trim())
                ? 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg transform hover:scale-[1.02]'
                : 'bg-gray-700 cursor-not-allowed text-gray-500'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo...
              </>
            ) : 'Generate Multiple Variations'}
          </button>
          {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
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

        {/* History Section */}
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
    </div>
  );
};
