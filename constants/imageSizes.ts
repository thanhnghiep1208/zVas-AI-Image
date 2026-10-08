import type { ImageSize } from '../types';

/** Kích thước ảnh app hỗ trợ (đã bỏ 512px — Nano Banana 2.1 / Pro trả 400). */
export const IMAGE_SIZES: ImageSize[] = ['1K', '2K', '4K'];

const DEFAULT_IMAGE_SIZE: ImageSize = '1K';

/** Size không hợp lệ/cũ (vd. 512px từ tab mở trước khi deploy) → 1K. */
export function normalizeImageSize(size: string | null | undefined): ImageSize {
  return IMAGE_SIZES.includes(size as ImageSize) ? (size as ImageSize) : DEFAULT_IMAGE_SIZE;
}
