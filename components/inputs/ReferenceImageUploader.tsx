
import React, { useRef, useState } from 'react';
import type { ImageFile } from '../../types';
import { isAcceptedImageFile, ACCEPTED_IMAGE_TYPES } from '../../utils/fileValidation';
import { UploadIcon } from '../icons/UploadIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface ReferenceImageUploaderProps {
  onImageAdd: (file: File) => void;
  onImageRemove: (index: number) => void;
  images: ImageFile[];
  sectionNumber?: number;
  isDisabled?: boolean;
  /** When false, omit the heading (e.g. parent already titled the section). */
  showLabel?: boolean;
}

export const ReferenceImageUploader: React.FC<ReferenceImageUploaderProps> = ({
  onImageAdd,
  onImageRemove,
  images,
  isDisabled,
  showLabel = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        onImageAdd(file);
      }
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleClick = () => {
    if (!isDisabled) fileInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
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
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (file instanceof File && isAcceptedImageFile(file)) {
          onImageAdd(file);
        }
      }
      e.dataTransfer.clearData();
    }
  };

  const panelClasses = `custom-scrollbar h-32 overflow-y-auto rounded-2xl border p-2 transition-all duration-300 ${
    isDragging && !isDisabled
      ? 'border-cyan-400/80 bg-cyan-500/[0.08] ring-2 ring-cyan-500/25'
      : 'border-white/[0.08] bg-white/[0.03]'
  }`;

  return (
    <div className={`w-full ${isDisabled ? 'pointer-events-none opacity-50' : ''}`}>
      {showLabel && (
        <div className="mb-2">
          <h2 className="text-sm font-semibold tracking-tight text-white">Ảnh tham chiếu</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {isDisabled
              ? 'Thêm ảnh chính trước — sau đó kéo thả hoặc bấm để thêm nhiều ảnh.'
              : 'Tùy chọn — gợi ý phong cách hoặc bối cảnh. PNG, JPEG, WebP.'}
          </p>
        </div>
      )}
      <div
        className={panelClasses}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            className="group/add flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/12 bg-white/[0.02] text-gray-500 transition-all hover:border-cyan-500/45 hover:bg-white/[0.05] hover:text-cyan-200/90 disabled:cursor-not-allowed disabled:hover:border-white/12 disabled:hover:bg-white/[0.02] disabled:hover:text-gray-500"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-cyan-300/80 transition-colors group-hover/add:border-cyan-500/30 group-hover/add:text-cyan-200">
              <UploadIcon className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-semibold tracking-tight">Thêm ảnh</span>
          </button>
          {images.map((image, index) => (
            <div key={`${image.previewUrl}-${index}`} className="group relative aspect-square">
              <img
                src={image.previewUrl}
                alt={`Tham chiếu ${index + 1}`}
                className="h-full w-full rounded-xl border border-white/10 object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageRemove(index);
                }}
                className="absolute right-1 top-1 rounded-full border border-white/15 bg-black/55 p-1.5 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all hover:border-red-400/40 hover:bg-red-600/90 group-hover:opacity-100"
                aria-label="Xóa ảnh tham chiếu"
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
      />
    </div>
  );
};
