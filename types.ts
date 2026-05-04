
export type ImageSize = '512px' | '1K' | '2K' | '4K';

export interface GeneratedVideo {
  id: string;
  prompt: string;
  videoUrl: string;
  thumbnailUrl?: string;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface GeneratedImage {
  prompt: string;
  imageUrl: string;
  text?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ImageFile {
  file: File;
  previewUrl: string;
}
