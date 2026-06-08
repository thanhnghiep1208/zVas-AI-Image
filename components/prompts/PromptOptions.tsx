
import React from 'react';
import { PaletteIcon } from '../icons/PaletteIcon';

interface PromptOptionsProps {
  options: {
    styleSimplified: boolean;
    keepStyle: boolean;
    keepStartImageStyle: boolean;
    forceRemoveBackground: boolean;
    backgroundRemovalStrength: 'soft' | 'strong';
  };
  onOptionChange: (option: keyof PromptOptionsProps['options']) => void;
  backgroundStyle: string;
  onBackgroundChange: (style: string) => void;
  selectedStyle: string;
  onStyleChange: (style: string) => void;
  
  outlineType: 'none' | 'white' | 'black';
  onOutlineTypeChange: (type: 'none' | 'white' | 'black') => void;
  outlineThickness: 'thin' | 'normal' | 'thick';
  onOutlineThicknessChange: (thickness: 'thin' | 'normal' | 'thick') => void;

  hasReferenceImages: boolean;
  hasStartImage: boolean;
  onShowStyleGuide: () => void;
  onBackgroundRemovalStrengthChange: (strength: 'soft' | 'strong') => void;
}

export const PromptOptions: React.FC<PromptOptionsProps> = ({ 
    options, onOptionChange, backgroundStyle, onBackgroundChange, 
    selectedStyle, onStyleChange, hasReferenceImages, hasStartImage, onShowStyleGuide,
    outlineType, onOutlineTypeChange, outlineThickness, onOutlineThicknessChange,
    onBackgroundRemovalStrengthChange
}) => {
  return (
    <div className="w-full">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
             <label className="col-span-2 text-base font-bold text-gray-400 uppercase tracking-wider">Style & Background</label>
            
            <button
                onClick={onShowStyleGuide}
                className="flex items-center justify-between px-3 py-2 bg-gray-700 border border-gray-600 rounded-md hover:border-cyan-500 transition-colors text-base overflow-hidden"
                title="Select a visual style"
            >
                <span className={`truncate ${selectedStyle ? 'text-cyan-300' : 'text-gray-400'}`}>
                    {selectedStyle ? `${selectedStyle.split(':')[0]}: ${selectedStyle.split(':')[1]}` : 'Chọn Style'}
                </span>
                    {selectedStyle ? (
                    <span 
                        role="button"
                        onClick={(e) => {e.stopPropagation(); onStyleChange('');}}
                        className="ml-1 hover:text-white flex-shrink-0"
                    >×</span>
                ) : <PaletteIcon className="w-5 h-5 ml-1 flex-shrink-0" />}
            </button>
            
            <div className="relative w-full">
                <select
                id="backgroundStyle"
                value={backgroundStyle}
                onChange={(e) => onBackgroundChange(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-base text-gray-300 focus:border-cyan-500 outline-none appearance-none truncate"
                >
                <option value="none">Mặc định</option>
                <option value="black">Nền Đen</option>
                <option value="white">Nền Trắng</option>
                <option value="transparent">Trong suốt</option>
                </select>
            </div>
        </div>

        {/* Outline Section */}
        <div className="space-y-1.5">
            <label className="text-base font-bold text-gray-400 uppercase tracking-wider">Viền Chủ Thể (Outline)</label>
            <div className="grid grid-cols-2 gap-2">
                <div className="relative w-full">
                    <select
                        value={outlineType}
                        onChange={(e) => onOutlineTypeChange(e.target.value as any)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-base text-gray-300 focus:border-cyan-500 outline-none appearance-none truncate"
                    >
                        <option value="none">Không viền</option>
                        <option value="white">Viền Trắng</option>
                        <option value="black">Viền Đen</option>
                    </select>
                </div>
                <div className="relative w-full">
                    <select
                        value={outlineThickness}
                        disabled={outlineType === 'none'}
                        onChange={(e) => onOutlineThicknessChange(e.target.value as any)}
                        className={`w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-base text-gray-300 focus:border-cyan-500 outline-none appearance-none truncate ${outlineType === 'none' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <option value="thin">Mỏng</option>
                        <option value="normal">Vừa</option>
                        <option value="thick">Dày</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Simplify Checkbox Row */}
        <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center space-x-3 p-2 rounded border border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                    type="checkbox"
                    checked={options.styleSimplified}
                    onChange={() => onOptionChange('styleSimplified')}
                    className="w-5 h-5 rounded border-gray-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-gray-800 flex-shrink-0"
                />
                <span className="text-sm text-gray-300 font-medium">Đơn giản hóa</span>
            </label>
            {backgroundStyle === 'transparent' ? (
              <div className="flex flex-col gap-2 p-2 rounded border border-cyan-700/60 bg-cyan-900/10">
                <label className="flex items-center space-x-3 cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        checked={options.forceRemoveBackground}
                        onChange={() => onOptionChange('forceRemoveBackground')}
                        className="w-5 h-5 rounded border-gray-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-gray-800 flex-shrink-0"
                    />
                    <span className="text-sm text-cyan-200 font-medium">Force remove background</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-cyan-300/80">Strength</span>
                  <select
                    value={options.backgroundRemovalStrength}
                    onChange={(e) => onBackgroundRemovalStrengthChange(e.target.value as 'soft' | 'strong')}
                    disabled={!options.forceRemoveBackground}
                    className={`bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 ${
                      !options.forceRemoveBackground ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="soft">Soft</option>
                    <option value="strong">Strong</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded border border-gray-800 text-[11px] text-gray-500 flex items-center">
                Bật nền trong suốt để dùng Force remove background.
              </div>
            )}
        </div>

        {/* Keep Style Row */}
        <div className="border-t border-gray-700 pt-2 mt-0.5">
          <div className="grid grid-cols-2 gap-2">
            <label className={`flex items-center space-x-2 p-2 rounded border border-gray-700 transition-colors ${hasStartImage ? 'hover:bg-gray-700/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                <input
                    type="checkbox"
                    checked={options.keepStartImageStyle}
                    onChange={() => hasStartImage && onOptionChange('keepStartImageStyle')}
                    disabled={!hasStartImage}
                    className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-gray-800 flex-shrink-0"
                />
                <span className="text-[11px] text-gray-300 font-bold uppercase leading-tight">Giữ style ảnh gốc</span>
            </label>

            <label className={`flex items-center space-x-2 p-2.5 rounded border border-gray-700 transition-colors ${hasReferenceImages ? 'hover:bg-gray-700/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                <input
                    type="checkbox"
                    checked={options.keepStyle}
                    onChange={() => hasReferenceImages && onOptionChange('keepStyle')}
                    disabled={!hasReferenceImages}
                    className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-gray-800 flex-shrink-0"
                />
                <span className="text-[11px] text-gray-300 font-bold uppercase leading-tight">Giữ style tham chiếu</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
