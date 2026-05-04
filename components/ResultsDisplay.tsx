
import React from 'react';
import type { ImageFile, GeneratedImage } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { ExpandIcon } from './icons/ExpandIcon';
import { SparklesIcon } from './icons/SparklesIcon';

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

const ImageCard: React.FC<ImageCardProps> = ({ title, imageUrl, caption, isError = false, onDownload, onQuickView, onUseAsInput, onForceRemoveBackgroundDownload, isOriginal = false }) => {

  if (isOriginal) {
    return (
        <div className="group bg-gray-800 rounded-lg overflow-hidden shadow border border-gray-700 flex flex-col h-full">
            <div className="p-2 bg-gray-800/80 border-b border-gray-700">
              <h3 className="text-xs font-semibold text-cyan-400 truncate uppercase tracking-wider">Input</h3>
            </div>
            <div className="relative flex-1 bg-black min-h-[300px] lg:min-h-[500px]">
              <img src={imageUrl} alt={title} className="w-full h-full object-contain absolute inset-0" />
            </div>
        </div>
    );
  }
    
  return (
    <div className="group bg-gray-800 rounded-lg overflow-hidden shadow border border-gray-700 transition-all duration-200 hover:border-cyan-500/50 flex flex-col h-full">
      <div className={`relative flex-1 min-h-[300px] lg:min-h-[500px] ${isError ? 'bg-red-900/20 flex items-center justify-center' : 'bg-black'}`}>
        {isError ? (
           <div className="text-center p-4 text-red-400">
              <p className="text-sm font-bold">Error</p>
              <p className="text-xs mt-1">{caption}</p>
           </div>
        ) : (
          <>
              <img src={imageUrl} alt={title} className="w-full h-full object-contain absolute inset-0" />
              <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   {onQuickView && (
                      <button
                          onClick={onQuickView}
                          className="p-1.5 bg-black/60 rounded-full text-white hover:bg-cyan-500 hover:text-white transition-colors"
                          title="View full screen"
                      >
                          <ExpandIcon className="w-4 h-4" />
                      </button>
                  )}
                  {onDownload && (
                      <button
                          onClick={onDownload}
                          className="p-1.5 bg-black/60 rounded-full text-white hover:bg-cyan-500 hover:text-white transition-colors"
                          title="Download as JPG"
                      >
                          <DownloadIcon className="w-4 h-4" />
                      </button>
                  )}
                  {onForceRemoveBackgroundDownload && (
                      <button
                          onClick={onForceRemoveBackgroundDownload}
                          className="px-2 py-1 bg-black/60 rounded-full text-[10px] text-white hover:bg-emerald-600 transition-colors font-semibold"
                          title="Force remove background and download PNG"
                      >
                          Remove BG
                      </button>
                  )}
              </div>
          </>
        )}
      </div>
      {!isError && (
          <div className="p-2.5 bg-gray-800 text-xs border-t border-gray-700">
              <div className="mb-2">
                  <p className="font-medium text-gray-300 line-clamp-2" title={title}>
                      {title}
                  </p>
              </div>
              {onUseAsInput && (
              <button
                  onClick={onUseAsInput}
                  className="w-full flex items-center justify-center space-x-1.5 px-2 py-1.5 bg-gray-700 hover:bg-cyan-700 rounded transition-colors text-gray-200 font-medium"
              >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>Edit This</span>
              </button>
              )}
          </div>
      )}
    </div>
  );
};


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ originalImage, generatedImages, isLoading, onImageSelect, onUseAsInput, onDownload, onForceRemoveBackgroundDownload }) => {

    if (!originalImage && !isLoading && generatedImages.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
                <SparklesIcon className="w-12 h-12 opacity-20" />
                <p className="text-sm">Your generated images will appear here.</p>
            </div>
        );
    }
    
    if (isLoading && generatedImages.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-gray-700 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-sm font-medium">Generating Variations...</p>
            </div>
        );
    }

  return (
    <div className="p-2 h-full overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-fr">
        {originalImage && (
          <ImageCard title="Original" imageUrl={originalImage.previewUrl} isOriginal={true} />
        )}
        {generatedImages.map((image, index) => (
          <ImageCard 
            key={index} 
            title={image.prompt} 
            imageUrl={image.imageUrl} 
            caption={image.text}
            isError={image.imageUrl === 'error'}
            onDownload={image.imageUrl !== 'error' ? () => onDownload(image) : undefined}
            onForceRemoveBackgroundDownload={image.imageUrl !== 'error' ? () => onForceRemoveBackgroundDownload(image) : undefined}
            onQuickView={image.imageUrl !== 'error' ? () => onImageSelect(image) : undefined}
            onUseAsInput={image.imageUrl !== 'error' ? () => onUseAsInput(image) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
