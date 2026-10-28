/**
 * Thu nhỏ / nén ảnh ở client trước khi gửi `/api/generate`.
 *
 * Ảnh chụp điện thoại (4000px+, 5–7MB) sau base64 dễ chạm trần 10MB của server
 * (lỗi 413 chiếm ~29% lượt tạo thất bại, 2026-10). Gemini không cần ảnh đầu vào
 * lớn hơn ~2048px nên thu nhỏ không làm giảm chất lượng kết quả, còn giảm thời
 * gian upload trên mạng yếu.
 */

export const UPLOAD_MAX_EDGE_PX = 2048;
/** Dưới ngưỡng này và trong giới hạn cạnh → gửi nguyên file, không mã hóa lại. */
export const UPLOAD_COMPRESS_MIN_BYTES = 1.5 * 1024 * 1024;
const UPLOAD_QUALITY = 0.9;

export function computeTargetDimensions(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) return { width, height };
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function shouldCompressImage({
  bytes,
  width,
  height,
}: {
  bytes: number;
  width: number;
  height: number;
}): boolean {
  return bytes > UPLOAD_COMPRESS_MIN_BYTES || Math.max(width, height) > UPLOAD_MAX_EDGE_PX;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Trả về file đã thu nhỏ, hoặc chính file gốc nếu không cần / không nhỏ hơn /
 * trình duyệt không hỗ trợ. Không bao giờ throw — nén là tối ưu, không được
 * làm hỏng lượt tạo.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    if (!shouldCompressImage({ bytes: file.size, width: bitmap.width, height: bitmap.height })) {
      return file;
    }

    const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, UPLOAD_MAX_EDGE_PX);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    // PNG có thể mang kênh alpha (ảnh tách nền) → mã hóa WebP (giữ alpha); trình
    // duyệt không mã hóa được WebP tự trả PNG — vẫn dùng được.
    const targetType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    const blob = await canvasToBlob(canvas, targetType, UPLOAD_QUALITY);
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type.split('/')[1] || 'png';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'upload';
    return new File([blob], `${baseName}.${ext}`, { type: blob.type, lastModified: file.lastModified });
  } catch (error) {
    console.warn('compressImageForUpload: giữ ảnh gốc do lỗi nén', error);
    return file;
  } finally {
    bitmap?.close();
  }
}
