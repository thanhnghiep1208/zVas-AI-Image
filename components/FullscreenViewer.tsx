import React, { useEffect, useState, memo } from 'react';
import type { GeneratedImage } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface FullscreenViewerProps {
  image: GeneratedImage;
  onClose: () => void;
  onDownload: () => void;
  onForceRemoveBackgroundDownload: () => void;
  onUseAsInput: () => void;
}

function FullscreenViewerInner({ image, onClose, onDownload, onForceRemoveBackgroundDownload, onUseAsInput }: FullscreenViewerProps) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 lg:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-prompt-title"
    >
      <div
        className="relative flex flex-col lg:flex-row bg-gray-900 shadow-2xl rounded-xl w-full max-w-6xl max-h-[95vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 bg-black/50 rounded-full text-gray-300 hover:text-white hover:bg-red-600 transition-colors"
          aria-label="Close fullscreen view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Image Panel */}
        <div className="flex-shrink-0 lg:w-2/3 bg-black flex items-center justify-center p-4">
          <img
            src={image.imageUrl}
            alt={image.prompt}
            className="block object-contain max-w-full max-h-full h-auto w-auto"
            onLoad={(e) => {
              const img = e.currentTarget;
              setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            }}
          />
        </div>
        
        {/* Details Panel */}
        <div className="flex-1 p-6 overflow-y-auto">
            <h2 id="fullscreen-prompt-title" className="text-2xl font-bold text-cyan-300 leading-tight">Mô tả</h2>
            
            {dimensions && (
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded border border-gray-700 bg-gray-800 text-xs font-medium text-gray-400 font-mono">
                {dimensions.width} x {dimensions.height} px
              </div>
            )}

            <p className="mt-4 text-lg text-gray-200 whitespace-pre-wrap">{image.prompt}</p>
            
            {image.text && (
                <>
                    <div className="my-6 border-t border-gray-700"></div>
                    <h3 className="text-xl font-bold text-cyan-300">Ghi chú của AI</h3>
                    <p className="mt-2 text-base text-gray-300 italic">"{image.text}"</p>
                </>
            )}

            <div className="mt-8 pt-6 border-t border-gray-700 flex flex-col sm:flex-row gap-3">
                <button
                    onClick={onDownload}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors font-semibold"
                >
                    <DownloadIcon className="w-5 h-5" />
                    <span>Tải xuống</span>
                </button>
                <button
                    onClick={onForceRemoveBackgroundDownload}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 rounded-md transition-colors font-semibold"
                >
                    <span>Remove BG PNG</span>
                </button>
                <button
                    onClick={onUseAsInput}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-cyan-700 hover:bg-cyan-600 rounded-md transition-colors font-semibold"
                >
                    <SparklesIcon className="w-5 h-5" />
                    <span>Chỉnh sửa</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

export const FullscreenViewer = memo(FullscreenViewerInner);