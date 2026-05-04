
import React from 'react';
import { Maximize } from 'lucide-react';
import { ImageSize } from '../types';

interface ImageSizeSelectorProps {
  imageSize: ImageSize;
  setImageSize: (size: ImageSize) => void;
  isDisabled?: boolean;
}

const sizes: ImageSize[] = ['512px', '1K', '2K', '4K'];

export const ImageSizeSelector: React.FC<ImageSizeSelectorProps> = ({ imageSize, setImageSize, isDisabled = false }) => {
  return (
    <div className="w-full">
      <h2 className="text-xs font-bold mb-1.5 text-gray-400 uppercase tracking-wider">Kích thước</h2>
      <div className={`grid grid-cols-4 gap-1.5 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {sizes.map(size => (
          <button
            key={size}
            onClick={() => !isDisabled && setImageSize(size)}
            disabled={isDisabled}
            className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all duration-200
              ${imageSize === size 
                ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300' 
                : 'bg-gray-700/30 border-gray-600 hover:border-cyan-500/50 text-gray-400'}
            `}
          >
            <Maximize className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[10px] font-medium">{size}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
