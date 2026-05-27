
import React, { useRef, useState } from 'react';
import type { ImageFile } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  image: ImageFile | null;
  onImageRemove: () => void;
  /** When false, omit the heading (parent section already has a title). */
  showLabel?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelect,
  image,
  onImageRemove,
  showLabel = true,
}) => {
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

  const uploaderClasses = `group relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
    isDragging
      ? 'border-cyan-400/80 bg-cyan-500/[0.08] ring-2 ring-cyan-500/25'
      : 'border-white/12 bg-white/[0.03] hover:border-cyan-500/40 hover:bg-white/[0.05]'
  }`;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-2">
          <h2 className="text-sm font-semibold tracking-tight text-white">Ảnh chính</h2>
          <p className="mt-0.5 text-xs text-gray-500">Kéo thả hoặc bấm để chọn — PNG, JPEG, WebP</p>
        </div>
      )}
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
              alt="Ảnh đã chọn"
              className="h-full w-full object-contain p-2"
            />
            <button
              type="button"
              onClick={handleRemoveClick}
              className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/55 p-2 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all hover:border-red-400/40 hover:bg-red-600/90 focus-visible:opacity-100 group-hover:opacity-100"
              aria-label="Xóa ảnh"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="pointer-events-none flex flex-col items-center gap-2 px-4 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-cyan-300/90">
              <UploadIcon className="h-5 w-5" />
            </span>
            {isDragging ? (
              <p className="text-sm font-medium text-cyan-200">Thả ảnh vào đây</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-200">Chọn ảnh gốc</p>
                <p className="text-xs text-gray-500">Tối đa một ảnh mỗi lần</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
