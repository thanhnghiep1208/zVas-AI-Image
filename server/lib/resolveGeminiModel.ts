import { resolveGeminiRequestModel } from '../../constants/aiModels';

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
