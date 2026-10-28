import type { ImageProvider } from '../types';

const PROVIDERS: ImageProvider[] = ['gemini', 'openai', 'seedance', 'seedream'];

export function isImageProvider(value: string): value is ImageProvider {
  return PROVIDERS.includes(value as ImageProvider);
}

export function resolveProviderFromSettings(
  requested: string | undefined,
  enabledProviders: unknown
): ImageProvider {
  const enabled = Array.isArray(enabledProviders)
    ? enabledProviders.filter((item): item is ImageProvider => typeof item === 'string' && isImageProvider(item))
    : [];
  const requestedValid = requested && isImageProvider(requested) ? requested : null;

  // Allowlist rỗng (admin chưa cấu hình) → không giới hạn, giữ hành vi cũ.
  if (enabled.length === 0) {
    return requestedValid || 'gemini';
  }
  // Allowlist có giá trị → provider yêu cầu phải nằm trong đó, nếu không dùng
  // provider enabled đầu tiên. Chặn việc gọi provider admin đã tắt (Finding 3).
  if (requestedValid && enabled.includes(requestedValid)) {
    return requestedValid;
  }
  return enabled[0];
}

export function openAiSizeFromAspectRatio(aspectRatio?: string): string {
  if (aspectRatio === '1:1') return '1024x1024';
  if (aspectRatio === '16:9') return '1792x1024';
  return '1024x1792';
}

/** BytePlus Seedream expects labels like "2K", not OpenAI pixel sizes. */
export function seedreamSizeFromAspectRatio(_aspectRatio?: string): string {
  return '2K';
}
