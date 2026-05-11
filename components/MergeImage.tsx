
import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Upload, X, Sparkles, Image as ImageIcon, Loader2, Download, Maximize2 } from 'lucide-react';
import type { ImageFile, GeneratedImage, ImageSize } from '../types';
import { generateImageVariations } from '../services/geminiService';
import { AspectRatioSelector } from './AspectRatioSelector';
import { ImageSizeSelector } from './ImageSizeSelector';

interface MergeImageProps {
  onDownload: (image: GeneratedImage) => void;
  onFullscreen: (image: GeneratedImage) => void;
}

function MergeImageComponent({ onDownload, onFullscreen }: MergeImageProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [error, setError] = useState<string | null>(null);

  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(
    () => () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    },
    []
  );

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const newImages = imageFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].previewUrl);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError('Vui lòng tải lên ít nhất một hình ảnh.');
      return;
    }
    if (!prompt.trim()) {
      setError('Vui lòng nhập prompt để kết hợp các ảnh.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // We use the first image as the main image and the rest as reference images
      // Or we can just pass all as reference images if the service supports it.
      // Looking at geminiService.ts, it takes imageFile (main) and referenceImageFiles (array).
      const mainImage = images[0].file;
      const otherImages = images.slice(1).map(img => img.file);

      const generated = await generateImageVariations(
        mainImage,
        [prompt],
        otherImages,
        null,
        aspectRatio,
        imageSize
      );

      setResults(prev => [...generated, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tạo ảnh.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-gray-100">
      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-8">
          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                  <ImageIcon className="h-5 w-5" />
                </span>
                Tải lên ảnh để kết hợp
              </h2>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-gray-400">
                {images.length} ảnh đã chọn
              </span>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] p-8 text-center transition-colors hover:border-cyan-500/40"
              onClick={() => document.getElementById('merge-upload')?.click()}
            >
              <input
                id="merge-upload"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(Array.from(e.target.files || []))}
              />
              <div className="flex flex-col items-center space-y-3">
                <div className="rounded-full bg-white/[0.06] p-4 transition-colors group-hover:bg-cyan-500/10">
                  <Upload className="h-8 w-8 text-gray-400 transition-colors group-hover:text-cyan-300" />
                </div>
                <div>
                  <p className="text-lg font-medium text-white">Kéo thả hoặc bấm để tải ảnh</p>
                  <p className="text-sm text-gray-500">Nhiều ảnh — AI gộp theo mô tả của bạn</p>
                </div>
              </div>
            </div>

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5">
                {images.map((img, idx) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black">
                    <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-200">
                <Sparkles className="h-5 w-5" />
              </span>
              Mô tả cách kết hợp
            </h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: Kết hợp phong cách của ảnh 1 với chủ thể của ảnh 2, tạo ra một không gian huyền ảo..."
              className="h-32 w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] p-4 text-gray-100 outline-none transition-all placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
            />
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <AspectRatioSelector aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} />
            <ImageSizeSelector imageSize={imageSize} setImageSize={setImageSize} />
          </div>

          <div className="flex flex-col items-center pt-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || images.length === 0 || !prompt.trim()}
              className={`flex w-full max-w-md items-center justify-center gap-3 rounded-2xl py-4 text-lg font-semibold transition-all
                ${isLoading || images.length === 0 || !prompt.trim()
                  ? 'cursor-not-allowed bg-white/5 text-gray-600'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.99]'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Đang xử lý…
                </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6" />
                  Trộn &amp; tạo ảnh
                </>
              )}
            </button>
            {error && <p className="mt-4 text-sm font-medium text-red-300">{error}</p>}
          </div>

          {results.length > 0 && (
            <section className="space-y-6 pt-8">
              <h2 className="border-b border-white/[0.08] pb-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Kết quả kết hợp
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {results.map((res, idx) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-xl transition-all hover:border-cyan-500/35"
                  >
                    <div className="aspect-square bg-black relative">
                      {res.imageUrl === 'error' ? (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-red-400">
                          <p>{res.text || 'Lỗi tạo ảnh'}</p>
                        </div>
                      ) : (
                        <>
                          <img src={res.imageUrl} alt={res.prompt} className="w-full h-full object-contain" />
                          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onFullscreen(res)}
                              className="p-2 bg-black/60 rounded-full text-white hover:bg-cyan-500 transition-colors"
                              title="Xem toàn màn hình"
                            >
                              <Maximize2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => onDownload(res)}
                              className="p-2 bg-black/60 rounded-full text-white hover:bg-cyan-500 transition-colors"
                              title="Tải xuống"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-300 line-clamp-2 italic">"{res.prompt}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export const MergeImage = memo(MergeImageComponent);
