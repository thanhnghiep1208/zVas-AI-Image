
import React, { useState, useCallback } from 'react';
import { Upload, X, Sparkles, Image as ImageIcon, Loader2, Download, Maximize2 } from 'lucide-react';
import type { ImageFile, GeneratedImage, ImageSize } from '../types';
import { generateImageVariations } from '../services/geminiService';
import { AspectRatioSelector } from './AspectRatioSelector';
import { ImageSizeSelector } from './ImageSizeSelector';

interface MergeImageProps {
  onDownload: (image: GeneratedImage) => void;
  onFullscreen: (image: GeneratedImage) => void;
}

export const MergeImage: React.FC<MergeImageProps> = ({ onDownload, onFullscreen }) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Tải lên hình ảnh để kết hợp
              </h2>
              <span className="text-xs text-gray-500">{images.length} ảnh đã chọn</span>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors bg-gray-800/30 group cursor-pointer"
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
                <div className="p-4 bg-gray-700/50 rounded-full group-hover:bg-cyan-500/10 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 group-hover:text-cyan-400" />
                </div>
                <div>
                  <p className="text-lg font-medium">Kéo thả hoặc click để tải ảnh</p>
                  <p className="text-sm text-gray-500">Tải lên nhiều ảnh để AI kết hợp chúng lại</p>
                </div>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-700 bg-black">
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

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Nhập Prompt kết hợp
            </h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: Kết hợp phong cách của ảnh 1 với chủ thể của ảnh 2, tạo ra một không gian huyền ảo..."
              className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none transition-all"
            />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AspectRatioSelector aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} />
            <ImageSizeSelector imageSize={imageSize} setImageSize={setImageSize} />
          </div>

          <div className="flex flex-col items-center pt-4">
            <button
              onClick={handleGenerate}
              disabled={isLoading || images.length === 0 || !prompt.trim()}
              className={`w-full max-w-md py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all
                ${isLoading || images.length === 0 || !prompt.trim()
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 active:scale-[0.98]'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Merge & Generate
                </>
              )}
            </button>
            {error && <p className="mt-4 text-red-400 text-sm font-medium">{error}</p>}
          </div>

          {results.length > 0 && (
            <section className="pt-12 space-y-6">
              <h2 className="text-2xl font-bold text-white border-b border-gray-800 pb-2">Kết quả kết hợp</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {results.map((res, idx) => (
                  <div key={idx} className="group relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-xl transition-all hover:border-cyan-500/50">
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
};
