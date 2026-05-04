
import React from 'react';
import type { GeneratedImage } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface HistoryDisplayProps {
  images: GeneratedImage[];
  onImageSelect: (image: GeneratedImage) => void;
  onUseAsInput: (image: GeneratedImage) => void;
  onDownload: (image: GeneratedImage) => void;
  onClear?: () => void;
}

export const HistoryDisplay: React.FC<HistoryDisplayProps> = ({ images, onImageSelect, onUseAsInput, onDownload, onClear }) => {
  if (images.length === 0) {
    return (
        <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg opacity-30">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Lịch sử trống</span>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gần đây (10 hình mới nhất)</span>
        {onClear && (
            <button 
                onClick={onClear}
                className="text-[10px] text-gray-500 hover:text-red-400 uppercase font-bold tracking-tighter transition-colors"
            >
                Xóa lịch sử
            </button>
        )}
      </div>
      <div className="flex-1 flex space-x-3 overflow-x-auto custom-scrollbar pb-2 px-1">
        {images.map((image, index) => (
          <div 
            key={`${index}-${image.prompt.slice(0, 10)}`}
            className="flex-shrink-0 group relative w-24 h-full bg-black rounded-md overflow-hidden border border-gray-700 hover:border-cyan-500 transition-all cursor-pointer shadow-lg"
          >
            <img 
                src={image.imageUrl} 
                alt={image.prompt} 
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                onClick={() => onImageSelect(image)}
            />
            
            {/* Quick Actions Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); onUseAsInput(image); }}
                    className="p-1.5 bg-cyan-600 rounded-full text-white hover:bg-cyan-500 transform hover:scale-110 transition-all"
                    title="Dùng làm phôi"
                >
                    <SparklesIcon className="w-3 h-3" />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDownload(image); }}
                    className="p-1.5 bg-gray-700 rounded-full text-white hover:bg-gray-600 transform hover:scale-110 transition-all"
                    title="Tải xuống JPG"
                >
                    <DownloadIcon className="w-3 h-3" />
                </button>
            </div>
            
            {/* Index Badge */}
            <div className="absolute top-0.5 left-0.5 bg-black/50 px-1 rounded text-[8px] font-bold text-gray-400">
                #{index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
