import type { ImageSize } from '../types';
import {
  GEMINI_MODEL_FALLBACK,
  GEMINI_NANO_BANANA_2,
  GEMINI_NANO_BANANA_2_1,
  GEMINI_NANO_BANANA_PRO,
} from '../constants/aiModels';

// Pricing per https://ai.google.dev/gemini-api/docs/pricing (Standard tier), checked 2026-10-08.
export interface GeminiImagePricing {
  inputPerMillion: number;
  /** Output ảnh (candidatesTokenCount). */
  outputPerMillion: number;
  /** Output text/thinking (thoughtsTokenCount); bỏ trống = không tính. */
  thinkingOutputPerMillion?: number;
  perImageFallback: Partial<Record<ImageSize, number>>;
}

const GEMINI_IMAGE_PRICING: Record<string, GeminiImagePricing> = {
  [GEMINI_NANO_BANANA_2_1]: {
    inputPerMillion: 1.5,
    outputPerMillion: 30.0,
    thinkingOutputPerMillion: 7.5,
    // 2.1 không hỗ trợ 512px; server tự nâng lên 1K.
    perImageFallback: { '512px': 0.0336, '1K': 0.0336, '2K': 0.0504, '4K': 0.113 },
  },
  [GEMINI_NANO_BANANA_2]: {
    inputPerMillion: 0.5,
    outputPerMillion: 60.0,
    thinkingOutputPerMillion: 3.0,
    perImageFallback: { '512px': 0.04482, '1K': 0.0672, '2K': 0.1008, '4K': 0.1512 },
  },
  [GEMINI_NANO_BANANA_PRO]: {
    inputPerMillion: 2.0,
    outputPerMillion: 120.0,
    perImageFallback: { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
  },
};

export function resolveGeminiImagePricing(modelName: string): GeminiImagePricing {
  return GEMINI_IMAGE_PRICING[modelName] ?? GEMINI_IMAGE_PRICING[GEMINI_MODEL_FALLBACK];
}

/** Chi phí theo token usage thực tế; fallback giá cố định theo độ phân giải khi không có token. */
export function estimateGeminiCost({
  model,
  promptTokens,
  completionTokens,
  thinkingTokens,
  imageCount,
  imageSize,
}: {
  model: string;
  promptTokens: number;
  completionTokens: number;
  thinkingTokens: number;
  imageCount: number;
  imageSize: ImageSize;
}): number {
  const pricing = resolveGeminiImagePricing(model);
  if (promptTokens + completionTokens + thinkingTokens > 0) {
    return (
      (promptTokens / 1_000_000) * pricing.inputPerMillion +
      (completionTokens / 1_000_000) * pricing.outputPerMillion +
      (thinkingTokens / 1_000_000) * (pricing.thinkingOutputPerMillion ?? 0)
    );
  }
  const perImage = pricing.perImageFallback[imageSize] ?? pricing.perImageFallback['1K'] ?? 0.04;
  return imageCount * perImage;
}
