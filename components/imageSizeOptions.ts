import type { ImageSize } from '../types';

const IMAGE_SIZES: ImageSize[] = ['512px', '1K', '2K', '4K'];
const FALLBACK_SIZE: ImageSize = '1K';

/** Các nút kích thước; size model không hỗ trợ (vd. 512px với 2.1/Pro) bị disable. */
export function getImageSizeOptions(unsupported: string[]): Array<{ size: ImageSize; disabled: boolean }> {
  return IMAGE_SIZES.map((size) => ({ size, disabled: unsupported.includes(size) }));
}

/** Size đang chọn không được hỗ trợ → 1K; ngược lại giữ nguyên. */
export function resolveSupportedImageSize(size: ImageSize, unsupported: string[]): ImageSize {
  return unsupported.includes(size) ? FALLBACK_SIZE : size;
}
