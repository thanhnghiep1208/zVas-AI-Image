
export type ImageSize = '512px' | '1K' | '2K' | '4K';

export interface GeneratedImage {
  prompt: string;
  imageUrl: string;
  text?: string | null;
  errorCode?: string;
  /** Raw technical error message (pre-translation) — for analytics/diagnostics only, never shown to users. */
  rawErrorMessage?: string;
  promptTokens?: number;
  completionTokens?: number;
  thinkingTokens?: number;
  totalTokens?: number;
}

export interface ImageFile {
  file: File;
  previewUrl: string;
}

export interface GlobalSettings {
  enabledProviders?: string[];
  geminiModel?: string;
  /** true = admin chủ động rollback model Flash về Nano Banana 2. */
  geminiFlashRollback?: boolean;
  openaiModel?: string;
  seedanceModel?: string;
  seedanceBaseUrl?: string;
  seedreamModel?: string;
  seedreamBaseUrl?: string;
  [key: string]: unknown;
}
