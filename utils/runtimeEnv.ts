export function getRuntimeEnvValue(key: string): string {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string> })?.env;
  if (viteEnv && typeof viteEnv[key] === 'string') {
    return viteEnv[key];
  }
  if (viteEnv && key === 'API_KEY' && typeof viteEnv.VITE_API_KEY === 'string') {
    return viteEnv.VITE_API_KEY;
  }
  if (viteEnv && key === 'GEMINI_API_KEY' && typeof viteEnv.VITE_GEMINI_API_KEY === 'string') {
    return viteEnv.VITE_GEMINI_API_KEY;
  }
  const processEnv = typeof process !== 'undefined' ? (process as { env?: Record<string, string | undefined> }).env : undefined;
  if (processEnv && typeof processEnv[key] === 'string') {
    return processEnv[key];
  }
  return '';
}

export function isLikelyPlaceholderKey(value: string): boolean {
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
