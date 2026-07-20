export const ACCEPTED_IMAGE_TYPES = 'image/png, image/jpeg, image/webp';

const ACCEPTED_IMAGE_MIME_TYPES = new Set(
  ACCEPTED_IMAGE_TYPES.split(',').map((type) => type.trim())
);

/**
 * Giới hạn dung lượng mỗi ảnh (bytes gốc).
 * Server nhận body JSON tối đa 10MB (xem `server.ts`). Ảnh được mã hóa base64
 * làm phồng ~33%, nên một ảnh ~7MB gốc đã gần chạm trần. Chặn ở client giúp
 * người dùng thấy thông báo rõ ràng thay vì lỗi 413 khó hiểu từ backend.
 */
export const MAX_IMAGE_FILE_SIZE_MB = 7;
export const MAX_IMAGE_FILE_SIZE_BYTES = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;

/**
 * Tổng dung lượng tất cả ảnh (chính + tham chiếu) trong một lần tạo.
 * Vì mọi ảnh đi chung một request tới `/api/generate`, tổng base64 phải nằm
 * dưới trần 10MB của server — tương đương ~7MB dữ liệu gốc.
 */
export const MAX_TOTAL_IMAGE_SIZE_BYTES = 7 * 1024 * 1024;

export function isAcceptedImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_MIME_TYPES.has(file.type);
}

export function isWithinImageSizeLimit(file: File): boolean {
  return file.size <= MAX_IMAGE_FILE_SIZE_BYTES;
}

/** Định dạng dung lượng thân thiện cho thông báo (KB dưới 1MB, còn lại MB). */
export function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${(Math.round(mb * 10) / 10).toString()} MB`;
}
