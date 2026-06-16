
export type ImageSize = '512px' | '1K' | '2K' | '4K';

export interface GeneratedImage {
  prompt: string;
  imageUrl: string;
  text?: string | null;
  errorCode?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ImageFile {
  file: File;
  previewUrl: string;
}

export interface GlobalSettings {
  enabledProviders?: string[];
  geminiModel?: string;
  openaiModel?: string;
  seedanceModel?: string;
  seedanceBaseUrl?: string;
  seedreamModel?: string;
  seedreamBaseUrl?: string;
  [key: string]: unknown;
}
