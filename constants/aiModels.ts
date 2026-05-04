export const PROVIDER_MODEL_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  gemini: [
    { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash' },
    { value: 'gemini-3-flash-image-preview', label: 'Gemini 3 Flash' },
    { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro' },
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash' },
  ],
  openai: [{ value: 'dall-e-3', label: 'DALL-E 3' }],
  seedance: [{ value: 'seed-1.5-pro', label: 'Seedance 1.5 Pro' }],
};
