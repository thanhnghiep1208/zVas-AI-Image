
import React, { useRef, useState } from 'react';
import type { ImageFile } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';

interface MaskUploaderProps {
  onMaskSelect: (file: File) => void;
  mask: ImageFile | null;
  onMaskRemove: () => void;
  sectionNumber?: number;
  isDisabled: boolean;
}

export const MaskUploader: React.FC<MaskUploaderProps> = ({ onMaskSelect, mask, onMaskRemove, isDisabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    const file = event.target.files?.[0];
    if (file) {
      onMaskSelect(file);
    }
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleClick = () => {
    if (isDisabled) return;
    fileInputRef.current?.click();
  };
  
  const handleRemoveClick = (e: React.MouseEvent) => {
    if (isDisabled) return;
    e.stopPropagation();
    onMaskRemove();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onMaskSelect(file);
      }
      e.dataTransfer.clearData();
    }
  };
  
  const uploaderClasses = `relative w-full h-24 border border-dashed rounded-lg flex items-center justify-center transition-colors duration-300 ${
    isDragging 
      ? 'border-cyan-400 bg-cyan-900/20' 
      : isDisabled 
        ? 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed' 
        : 'border-gray-600 hover:border-cyan-500 bg-gray-800/30 cursor-pointer'
  }`;

  return (
    <div className="w-full">
      <h2 className={`text-sm font-bold mb-2 text-gray-300 uppercase tracking-wider ${isDisabled ? 'opacity-50' : ''}`}>Mặt nạ</h2>
      <div
        className={uploaderClasses}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        title="Tải lên mặt nạ đen trắng. Vùng đen sẽ được chỉnh sửa."
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          disabled={isDisabled}
        />
        {mask ? (
          <>
            <img
              src={mask.previewUrl}
              alt="Mask preview"
              className="w-full h-full object-contain rounded-lg p-1"
            />
            <button
              onClick={handleRemoveClick}
              className="absolute top-1 right-1 p-1.5 bg-black/70 rounded-full text-white hover:bg-red-600 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-center text-gray-500">
            <UploadIcon className="w-6 h-6 mx-auto" />
            <span className="text-xs">Mask</span>
          </div>
        )}
      </div>
    </div>
  );
};
