
import React, { useRef, useState } from 'react';
import type { ImageFile } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  image: ImageFile | null;
  onImageRemove: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, image, onImageRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageRemove();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onImageSelect(file);
      }
      e.dataTransfer.clearData();
    }
  };
  
  const uploaderClasses = `group relative w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors duration-300 bg-gray-800/30 ${
    isDragging 
      ? 'border-cyan-400 ring-2 ring-cyan-500/30' 
      : 'border-gray-600 hover:border-cyan-400'
  }`;

  return (
    <div className="w-full">
      <h2 className="text-base font-bold mb-2 text-gray-300 uppercase tracking-wider">Tải ảnh lên</h2>
      <div
        className={uploaderClasses}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
        />
        {image ? (
          <>
            <img
              src={image.previewUrl}
              alt="Ad preview"
              className="w-full h-full object-contain rounded-lg p-1"
            />
            <button
              onClick={handleRemoveClick}
              className="absolute top-1 right-1 p-1.5 bg-black/70 rounded-full text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Remove image"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="text-center text-gray-500 pointer-events-none">
            <UploadIcon className="w-9 h-9 mx-auto mb-1" />
            {isDragging ? (
                <p className="font-semibold text-cyan-300 text-sm">Thả ảnh vào đây</p>
            ) : (
                <>
                    <p className="text-sm font-medium">Tải ảnh gốc</p>
                </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
