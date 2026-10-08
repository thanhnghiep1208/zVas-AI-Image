import { normalizeImageSize } from '../../constants/imageSizes';

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

/** `config.imageConfig` cho generateContent (size không hợp lệ/512px cũ → 1K). */
export function buildGeminiImageConfig({
  aspectRatio,
  imageSize,
}: {
  model: string;
  aspectRatio?: string;
  imageSize?: string;
}): { aspectRatio: string; imageSize: string } {
  return {
    aspectRatio: aspectRatio || '1:1',
    imageSize: normalizeImageSize(imageSize),
  };
}

/** Token usage trả về client; thinking tokens (`thoughtsTokenCount`) tách riêng để tính giá. */
export function buildGeminiUsage(usage: GeminiUsageMetadata | undefined) {
  const promptTokens = usage?.promptTokenCount || 0;
  const completionTokens = usage?.candidatesTokenCount || 0;
  const thinkingTokens = usage?.thoughtsTokenCount || 0;
  return {
    promptTokens,
    completionTokens,
    thinkingTokens,
    totalTokens: usage?.totalTokenCount || promptTokens + completionTokens + thinkingTokens,
  };
}
