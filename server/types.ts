export type ImageProvider = 'gemini' | 'openai' | 'seedance' | 'seedream';

export interface GenerateRequestBody {
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  provider?: ImageProvider;
  geminiModel?: string;
  openaiModel?: string;
  seedanceModel?: string;
  seedanceBaseUrl?: string;
  seedreamModel?: string;
  seedreamBaseUrl?: string;
  mainImage?: { data: string; mimeType: string } | null;
  referenceImages?: Array<{ data: string; mimeType: string }>;
}

export interface ProviderTestRequestBody {
  provider?: ImageProvider;
  seedanceBaseUrl?: string;
  seedreamBaseUrl?: string;
}

export interface AuthenticatedUser {
  uid: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
  body: unknown;
  headers: { authorization?: string };
}
