import { getUnsupportedImageSizes, resolveGeminiRequestModel } from '../../constants/aiModels';

/** Model Gemini thật sự gọi API (xem `resolveGeminiRequestModel`). */
export function resolveGeminiModel({
  requestedModel,
  adminGeminiModel,
}: {
  requestedModel: string | undefined;
  adminGeminiModel: string | undefined;
}): string {
  return resolveGeminiRequestModel(requestedModel, adminGeminiModel);
}

/** Size không được model hỗ trợ (vd. 512px trên 2.1) → nâng lên 1K. */
export function resolveGeminiImageSize(model: string, imageSize: string | undefined): string {
  const size = imageSize || '1K';
  return getUnsupportedImageSizes(model).includes(size) ? '1K' : size;
}
