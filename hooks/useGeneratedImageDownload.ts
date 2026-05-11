import { useCallback } from 'react';
import type { GeneratedImage } from '../types';

export interface GeneratedImageDownloadPromptOptions {
  forceRemoveBackground: boolean;
  backgroundRemovalStrength: 'soft' | 'strong';
}

export interface UseGeneratedImageDownloadParams {
  backgroundStyle: string;
  promptOptions: GeneratedImageDownloadPromptOptions;
  onDownloadTracked?: (meta: { exportType: 'jpg' | 'png'; removeBackground: boolean }) => void;
}

export function useGeneratedImageDownload({
  backgroundStyle,
  promptOptions,
  onDownloadTracked,
}: UseGeneratedImageDownloadParams) {
  const downloadImageWithOptions = useCallback(
    (
      imageToDownload: GeneratedImage,
      options?: { forceTransparent?: boolean; forceRemoveBackground?: boolean }
    ) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const shouldExportTransparentPng = options?.forceTransparent || backgroundStyle === 'transparent';
        if (!shouldExportTransparentPng) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        if (shouldExportTransparentPng && (options?.forceRemoveBackground || promptOptions.forceRemoveBackground)) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          const useStrong = promptOptions.backgroundRemovalStrength === 'strong';
          const width = canvas.width;
          const height = canvas.height;
          const visited = new Uint8Array(width * height);
          const queue: number[] = [];

          const borderStep = Math.max(1, Math.floor(Math.min(width, height) / 64));
          let borderR = 0;
          let borderG = 0;
          let borderB = 0;
          let borderCount = 0;
          const borderColorDistanceValues: number[] = [];

          const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;
          const sampleBorderPixel = (x: number, y: number) => {
            const idx = getPixelIndex(x, y);
            const a = pixels[idx + 3];
            if (a < 20) return;
            borderR += pixels[idx];
            borderG += pixels[idx + 1];
            borderB += pixels[idx + 2];
            borderCount += 1;
          };

          for (let x = 0; x < width; x += borderStep) {
            sampleBorderPixel(x, 0);
            sampleBorderPixel(x, height - 1);
          }
          for (let y = borderStep; y < height - borderStep; y += borderStep) {
            sampleBorderPixel(0, y);
            sampleBorderPixel(width - 1, y);
          }

          const avgBorderR = borderCount > 0 ? borderR / borderCount : 255;
          const avgBorderG = borderCount > 0 ? borderG / borderCount : 255;
          const avgBorderB = borderCount > 0 ? borderB / borderCount : 255;

          for (let x = 0; x < width; x += borderStep) {
            const topIdx = getPixelIndex(x, 0);
            const bottomIdx = getPixelIndex(x, height - 1);
            borderColorDistanceValues.push(
              Math.abs(pixels[topIdx] - avgBorderR) + Math.abs(pixels[topIdx + 1] - avgBorderG) + Math.abs(pixels[topIdx + 2] - avgBorderB),
              Math.abs(pixels[bottomIdx] - avgBorderR) + Math.abs(pixels[bottomIdx + 1] - avgBorderG) + Math.abs(pixels[bottomIdx + 2] - avgBorderB)
            );
          }

          const baseAdaptiveDistance = borderColorDistanceValues.length > 0
            ? borderColorDistanceValues.reduce((sum, v) => sum + v, 0) / borderColorDistanceValues.length
            : 24;
          const adaptiveDistanceThreshold = Math.max(useStrong ? 36 : 20, baseAdaptiveDistance * (useStrong ? 2.1 : 1.5));

          const isBackgroundLike = (idx: number): boolean => {
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];
            if (a === 0) return true;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const chroma = max - min;
            const isLightNeutral = useStrong
              ? max > 205 && chroma < 28
              : max > 232 && chroma < 14;
            const isCheckerLight = useStrong
              ? r > 150 && g > 150 && b > 150 && chroma < 44
              : r > 184 && g > 184 && b > 184 && chroma < 24;

            const distanceToBorderAvg =
              Math.abs(r - avgBorderR) +
              Math.abs(g - avgBorderG) +
              Math.abs(b - avgBorderB);
            const isSimilarToBorder = distanceToBorderAvg < adaptiveDistanceThreshold;

            return isLightNeutral || isCheckerLight || isSimilarToBorder;
          };

          const enqueue = (x: number, y: number) => {
            if (x < 0 || y < 0 || x >= width || y >= height) return;
            const p = y * width + x;
            if (visited[p]) return;
            const idx = p * 4;
            if (!isBackgroundLike(idx)) return;
            visited[p] = 1;
            queue.push(p);
          };

          for (let x = 0; x < width; x += 1) {
            enqueue(x, 0);
            enqueue(x, height - 1);
          }
          for (let y = 1; y < height - 1; y += 1) {
            enqueue(0, y);
            enqueue(width - 1, y);
          }

          while (queue.length > 0) {
            const p = queue.shift() as number;
            const x = p % width;
            const y = Math.floor(p / width);
            const idx = p * 4;
            pixels[idx + 3] = 0;

            enqueue(x - 1, y);
            enqueue(x + 1, y);
            enqueue(x, y - 1);
            enqueue(x, y + 1);
            enqueue(x - 1, y - 1);
            enqueue(x + 1, y - 1);
            enqueue(x - 1, y + 1);
            enqueue(x + 1, y + 1);
          }

          if (useStrong) {
            for (let i = 0; i < pixels.length; i += 4) {
              if (pixels[i + 3] === 0) continue;
              const r = pixels[i];
              const g = pixels[i + 1];
              const b = pixels[i + 2];
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              if (max > 238 && max - min < 9) {
                pixels[i + 3] = 0;
              }
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }

        const outputUrl = shouldExportTransparentPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.92);
        onDownloadTracked?.({
          exportType: shouldExportTransparentPng ? 'png' : 'jpg',
          removeBackground: Boolean(shouldExportTransparentPng && (options?.forceRemoveBackground || promptOptions.forceRemoveBackground)),
        });
        const link = document.createElement('a');
        link.href = outputUrl;
        const sanitizedPrompt = imageToDownload.prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = shouldExportTransparentPng
          ? `variation_${sanitizedPrompt.slice(0, 50)}.png`
          : `variation_${sanitizedPrompt.slice(0, 50)}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.src = imageToDownload.imageUrl;
    },
    [backgroundStyle, promptOptions.backgroundRemovalStrength, promptOptions.forceRemoveBackground, onDownloadTracked]
  );

  const handleDownloadImage = useCallback(
    (imageToDownload: GeneratedImage) => {
      downloadImageWithOptions(imageToDownload);
    },
    [downloadImageWithOptions]
  );

  const handleForceRemoveBackgroundDownload = useCallback(
    (imageToDownload: GeneratedImage) => {
      downloadImageWithOptions(imageToDownload, { forceTransparent: true, forceRemoveBackground: true });
    },
    [downloadImageWithOptions]
  );

  return {
    downloadImageWithOptions,
    handleDownloadImage,
    handleForceRemoveBackgroundDownload,
  };
}
