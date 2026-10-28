import { auth } from '../firebase';
import type { GeneratedImage, ImageSize } from '../types';
import { describeApiOrNetworkError } from '../utils/userFacingError';
import { mapGenerateResponse } from '../utils/generationUsage';
import { compressImageForUpload } from '../utils/imageCompression';
import { classifyGenerationError, isGenerationErrorCode } from '../lib/generationErrors';

/**
 * Lâu hơn tổng ngân sách retry phía server (`GEMINI_TOTAL_BUDGET_MS`, 240s) một
 * chút để server luôn kịp trả lỗi `timeout` có cấu trúc trước khi client bỏ cuộc,
 * và vẫn dưới timeout 300s của Cloud Run.
 */
const GENERATE_REQUEST_TIMEOUT_MS = 270_000;

/** Trần body JSON của server là 10MB (`server.ts`); chừa chỗ cho prompt + JSON. */
const MAX_REQUEST_IMAGE_BASE64_CHARS = 9.5 * 1024 * 1024;

type EncodedImage = { data: string; mimeType: string };

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    // onerror nhận ProgressEvent (không có message) → trước đây thành "An unknown
    // error occurred." trong analytics. Thường gặp khi file gốc bị thu hồi (ảnh
    // iCloud/Photos chưa tải về, file bị xóa/di chuyển sau khi chọn).
    reader.onerror = () => reject(new Error(`File read failed: ${reader.error?.name || 'unknown'}`));
  });
};

export const generateImageVariations = async (
  imageFile: File | null,
  prompts: string[],
  referenceImageFiles: File[],
  maskFile: File | null,
  aspectRatio: string,
  imageSize: ImageSize = '1K',
  systemApiKey: string | null = null,
  globalSettings: any = null
): Promise<GeneratedImage[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to generate images.");
  }

  const idToken = await currentUser.getIdToken();

  const encodeImage = async (file: File): Promise<EncodedImage> => {
    const upload = await compressImageForUpload(file);
    return { data: await fileToBase64(upload), mimeType: upload.type };
  };

  // Nén + base64 một lần cho mọi prompt (trước đây mỗi prompt đọc lại toàn bộ ảnh).
  // Mỗi prompt vẫn await bên trong try của nó để lỗi đọc file thành kết quả lỗi
  // của prompt đó thay vì làm sập cả lượt tạo.
  const encodedImagesPromise = Promise.all([
    imageFile ? encodeImage(imageFile) : Promise.resolve(null),
    Promise.all((referenceImageFiles || []).map(encodeImage)),
  ]);
  encodedImagesPromise.catch(() => {});

  const generateSingleImage = async (prompt: string): Promise<GeneratedImage> => {
    try {
      const [mainImage, refs] = await encodedImagesPromise;

      const base64Chars = (mainImage?.data.length ?? 0) + refs.reduce((sum, ref) => sum + ref.data.length, 0);
      if (base64Chars > MAX_REQUEST_IMAGE_BASE64_CHARS) {
        throw new Error('Request payload too large. Please use a smaller image or compress before upload.');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GENERATE_REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch('/api/generate', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            prompt,
            aspectRatio,
            imageSize,
            provider: globalSettings?.activeProvider || 'gemini',
            geminiModel: globalSettings?.geminiModel,
            openaiModel: globalSettings?.openaiModel,
            seedanceModel: globalSettings?.seedanceModel,
            seedanceBaseUrl: globalSettings?.seedanceBaseUrl,
            seedreamModel: globalSettings?.seedreamModel,
            seedreamBaseUrl: globalSettings?.seedreamBaseUrl,
            mainImage,
            referenceImages: refs
          })
        });
      } catch (fetchError) {
        if (controller.signal.aborted) {
          throw new Error('Request timed out waiting for the image generation server.');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
      }

      const rawBody = await response.text();
      let responseData: any = {};
      try {
        responseData = rawBody ? JSON.parse(rawBody) : {};
      } catch (error) {
        responseData = {};
      }
      if (!response.ok) {
        const preview = String(rawBody || '').slice(0, 180).replace(/\s+/g, ' ').trim();
        const fallbackMessage = rawBody && rawBody.startsWith('<')
          ? `Backend returned non-JSON response (HTTP ${response.status}). Preview: ${preview || 'empty body'}`
          : `Backend error (HTTP ${response.status}): ${preview || 'empty body'}`;
        const httpError = new Error(responseData.error || fallbackMessage || 'Generation failed.');
        const tagged = httpError as Error & { code?: string; status?: number };
        tagged.status = response.status;
        if (typeof responseData.code === 'string') {
          tagged.code = responseData.code;
        }
        throw httpError;
      }

      const imageBase64 = responseData.imageBase64;
      if (!imageBase64) {
        throw new Error("No image was generated by the model.");
      }

      return mapGenerateResponse(prompt, responseData);

    } catch (error: any) {
      console.error(`Error generating image for prompt "${prompt}":`, error);

      // error can be a non-Error rejection (e.g. a FileReader ProgressEvent, or a
      // plain object) — fall back to a stable placeholder instead of leaking
      // "[object Object]"/undefined into the analytics message.
      let userMessage =
        (typeof error?.message === 'string' && error.message) ||
        (typeof error === 'string' ? error : '') ||
        `An unknown error occurred. (${error?.name || error?.constructor?.name || typeof error})`;
      const provider = String(globalSettings?.activeProvider || 'gemini');

      // Mã máy đọc được, lấy TRƯỚC khi đổi sang message tiếng Việt. Server
      // (`{ error, code }`) biết rõ nhất nên được ưu tiên.
      const errorCode = isGenerationErrorCode(error?.code)
        ? error.code
        : classifyGenerationError(userMessage);

      // rawErrorMessage giữ nguyên message kỹ thuật gốc — chỉ dùng cho
      // analytics/chẩn đoán (tooltip "Sample error messages"), không hiển thị
      // cho người dùng.
      const rawErrorMessage = userMessage;

      // Handle specific API errors (Gemini-only messages — do not mislabel Seedream/OpenAI)
      if (errorCode === 'quota_exceeded' && provider === 'gemini') {
        userMessage = "Hết hạn mức API (429 Quota Exceeded): Tài khoản Miễn phí của bạn đã hết lượt sử dụng. Vui lòng thử lại sau vài phút (giới hạn phút) hoặc vào ngày mai (giới hạn ngày). Để sử dụng không giới hạn, vui lòng nhấn nút 'Select API Key' và chọn một Key từ Google Cloud dự án có tính phí (Paid project).";
      } else if (errorCode === 'forbidden' && provider === 'gemini') {
        userMessage = "Lỗi API (403 Forbidden): Model Gemini image yêu cầu API Key trả phí (Paid) từ Google Cloud. Hoặc chọn SEEDREAM · Dola-Seedream-5.0-lite / ByteDance-Seedream-4.5 trên dropdown (cần SEEDREAM_API_KEY).";
      } else if (errorCode === 'not_found' && provider === 'gemini') {
        userMessage = "Lỗi API: API Key đã chọn có thể không hợp lệ hoặc model không khả dụng cho Key này. Vui lòng thử chọn lại API Key.";
      } else {
        // Mọi mã lỗi khác (provider không phải gemini, hoặc chưa có message
        // riêng ở trên) — không để lộ text kỹ thuật thô (raw fetch/API message,
        // "An unknown error occurred.", JSON preview từ backend...) ra người
        // dùng. Message gốc vẫn được lưu ở rawErrorMessage cho analytics.
        userMessage = describeApiOrNetworkError(userMessage);
      }

      return {
        prompt,
        imageUrl: 'error',
        rawErrorMessage,
        text: userMessage,
        errorCode,
        ...(typeof error?.status === 'number' ? { httpStatus: error.status } : {}),
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      };
    }
  };

  const generationPromises = prompts.map(prompt => generateSingleImage(prompt));
  return Promise.all(generationPromises);
};
