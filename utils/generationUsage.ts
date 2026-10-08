import type { GeneratedImage } from '../types';

export interface GenerationUsage {
  promptTokens: number;
  completionTokens: number;
  thinkingTokens: number;
  totalTokens: number;
}

interface GenerateApiResponse {
  imageBase64?: string;
  text?: string;
  promptTokens?: number;
  completionTokens?: number;
  thinkingTokens?: number;
  totalTokens?: number;
}

/** Response `/api/generate` → GeneratedImage (giữ đủ token usage, kể cả thinking). */
export function mapGenerateResponse(prompt: string, data: GenerateApiResponse): GeneratedImage {
  return {
    prompt,
    imageUrl: `data:image/png;base64,${data.imageBase64}`,
    text: data.text || '',
    promptTokens: data.promptTokens || 0,
    completionTokens: data.completionTokens || 0,
    thinkingTokens: data.thinkingTokens || 0,
    totalTokens: data.totalTokens || 0,
  };
}

/** Tổng token của các ảnh tạo thành công (bỏ ảnh lỗi `imageUrl === 'error'`). */
export function sumGenerationUsage(results: GeneratedImage[]): GenerationUsage {
  return results
    .filter((img) => img.imageUrl !== 'error')
    .reduce<GenerationUsage>(
      (sum, img) => ({
        promptTokens: sum.promptTokens + (img.promptTokens || 0),
        completionTokens: sum.completionTokens + (img.completionTokens || 0),
        thinkingTokens: sum.thinkingTokens + (img.thinkingTokens || 0),
        totalTokens: sum.totalTokens + (img.totalTokens || 0),
      }),
      { promptTokens: 0, completionTokens: 0, thinkingTokens: 0, totalTokens: 0 }
    );
}
