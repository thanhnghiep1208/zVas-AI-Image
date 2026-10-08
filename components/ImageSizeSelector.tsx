import React, { useEffect } from 'react';
import { Maximize } from 'lucide-react';
import { ImageSize } from '../types';
import { getImageSizeOptions, resolveSupportedImageSize } from './imageSizeOptions';

interface ImageSizeSelectorProps {
  imageSize: ImageSize;
  setImageSize: (size: ImageSize) => void;
  isDisabled?: boolean;
  /** Size model hiện tại không hỗ trợ (vd. 512px với Nano Banana 2.1) — bị disable. */
  unsupportedSizes?: string[];
}

export const ImageSizeSelector: React.FC<ImageSizeSelectorProps> = ({
  imageSize,
  setImageSize,
  isDisabled = false,
  unsupportedSizes = [],
}) => {
  const supportedSize = resolveSupportedImageSize(imageSize, unsupportedSizes);

  // Đổi sang model không hỗ trợ size đang chọn → tự chuyển về 1K.
  useEffect(() => {
    if (supportedSize !== imageSize) setImageSize(supportedSize);
  }, [supportedSize, imageSize, setImageSize]);

  return (
    <div className="w-full">
      <h2 className="text-xs font-bold mb-1.5 text-gray-400 uppercase tracking-wider">Kích thước</h2>
      <div className={`grid grid-cols-4 gap-1.5 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {getImageSizeOptions(unsupportedSizes).map(({ size, disabled: isUnsupported }) => {
          return (
            <button
              key={size}
              onClick={() => !isDisabled && !isUnsupported && setImageSize(size)}
              disabled={isDisabled || isUnsupported}
              title={isUnsupported ? `Model đang chọn không hỗ trợ kích thước ${size}` : undefined}
              className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all duration-200
                ${isUnsupported
                  ? 'bg-gray-800/30 border-gray-700 text-gray-600 opacity-50 cursor-not-allowed'
                  : imageSize === size
                    ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300'
                    : 'bg-gray-700/30 border-gray-600 hover:border-cyan-500/50 text-gray-400'}
              `}
            >
              <Maximize className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[10px] font-medium">{size}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
