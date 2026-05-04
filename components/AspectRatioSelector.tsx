
import React from 'react';
import { AspectRatioIcon } from './icons/AspectRatioIcon';

interface AspectRatioSelectorProps {
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  isDisabled?: boolean;
}

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4", "4:1", "1:4", "8:1", "1:8"];

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ aspectRatio, setAspectRatio, isDisabled = false }) => {
  return (
    <div className="w-full">
      <h2 className="text-xs font-bold mb-1.5 text-gray-400 uppercase tracking-wider">Tỷ lệ</h2>
      <div className={`grid grid-cols-3 sm:grid-cols-5 gap-1.5 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {aspectRatios.map(ratio => (
          <button
            key={ratio}
            onClick={() => !isDisabled && setAspectRatio(ratio)}
            disabled={isDisabled}
            className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all duration-200
              ${aspectRatio === ratio 
                ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300' 
                : 'bg-gray-700/30 border-gray-600 hover:border-cyan-500/50 text-gray-400'}
            `}
          >
            <AspectRatioIcon ratio={ratio} className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-medium">{ratio}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
