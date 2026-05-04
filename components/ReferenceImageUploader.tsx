
import React, { useRef, useState } from 'react';
import type { ImageFile } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ReferenceImageUploaderProps {
  onImageAdd: (file: File) => void;
  onImageRemove: (index: number) => void;
  images: ImageFile[];
  sectionNumber?: number;
  isDisabled?: boolean;
}

export const ReferenceImageUploader: React.FC<ReferenceImageUploaderProps> = ({ onImageAdd, onImageRemove, images, isDisabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
        for (const file of Array.from(files)) {
            onImageAdd(file);
        }
    }
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleClick = () => {
    if(!isDisabled) fileInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if(isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if(isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if(isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if(isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (file instanceof File && file.type.startsWith('image/')) {
          onImageAdd(file);
        }
      }
      e.dataTransfer.clearData();
    }
  };

  return (
    <div className={`w-full ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <h2 className="text-sm font-bold mb-2 text-gray-300 uppercase tracking-wider">Tham chiếu</h2>
      <div
        className={`h-32 bg-gray-800/30 rounded-lg border border-gray-600 ${isDragging ? 'border-cyan-500' : ''} p-2 overflow-y-auto custom-scrollbar`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="grid grid-cols-2 gap-2">
            <button
                onClick={handleClick}
                className="aspect-square border border-dashed border-gray-600 rounded flex flex-col items-center justify-center text-gray-500 hover:border-cyan-400 hover:text-cyan-400 transition-colors"
            >
                <UploadIcon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Thêm</span>
            </button>
            {images.map((image, index) => (
                <div key={`${image.file.name}-${index}`} className="relative group aspect-square">
                    <img
                        src={image.previewUrl}
                        alt={`Ref ${index}`}
                        className="w-full h-full object-cover rounded border border-gray-600"
                    />
                    <button
                        onClick={(e) => { e.stopPropagation(); onImageRemove(index); }}
                        className="absolute top-0.5 right-0.5 p-1 bg-black/70 rounded-full text-white hover:bg-red-600 opacity-0 group-hover:opacity-100"
                    >
                        <TrashIcon className="w-3 h-3" />
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
          accept="image/png, image/jpeg, image/webp"
          multiple
        />
    </div>
  );
};
