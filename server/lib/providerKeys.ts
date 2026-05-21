import type { ImageProvider } from '../types';

function isLikelyPlaceholderKey(value: string): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === 'your_api_key' ||
    normalized === 'your_real_key_here' ||
    normalized === 'your_key_here' ||
    normalized.includes('replace_me') ||
    normalized.includes('example')
  );
}

function envKeyConfigured(envName: string): boolean {
  const value = String(process.env[envName] || '').trim();
  return value.length > 0 && !isLikelyPlaceholderKey(value);
}

export type ProviderKeysStatus = Record<ImageProvider, boolean>;

export function getProviderKeysStatus(): ProviderKeysStatus {
  return {
    gemini: envKeyConfigured('GEMINI_API_KEY'),
    openai: envKeyConfigured('OPENAI_API_KEY'),
    seedance: envKeyConfigured('SEEDANCE_API_KEY'),
    seedream: envKeyConfigured('SEEDREAM_API_KEY'),
  };
}
