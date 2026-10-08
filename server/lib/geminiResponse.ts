import { resolveGeminiImageSize } from './resolveGeminiModel';

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

/** `config.imageConfig` cho generateContent (size không hỗ trợ → 1K). */
export function buildGeminiImageConfig({
  model,
  aspectRatio,
  imageSize,
}: {
  model: string;
  aspectRatio?: string;
  imageSize?: string;
}): { aspectRatio: string; imageSize: string } {
  return {
    aspectRatio: aspectRatio || '1:1',
    imageSize: resolveGeminiImageSize(model, imageSize),
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
