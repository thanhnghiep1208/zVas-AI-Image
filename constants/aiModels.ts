export const PROVIDER_MODEL_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  gemini: [
    { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
    { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2' },
  ],
  openai: [{ value: 'dall-e-3', label: 'DALL-E 3' }],
  seedance: [{ value: 'seed-1.5-pro', label: 'Seedance 1.5 Pro' }],
};

export const GEMINI_MODEL_FALLBACK = 'gemini-3.1-flash-image-preview';

export const ALLOWED_GEMINI_MODEL_IDS = new Set(
  (PROVIDER_MODEL_OPTIONS.gemini ?? []).map((o) => o.value)
);

/** Chuẩn hóa id model Gemini (Firestore / localStorage cũ có thể lưu id không còn hỗ trợ). */
export function normalizeGeminiModelId(
  id: string | undefined | null,
  fallback: string = GEMINI_MODEL_FALLBACK
): string {
  const s = id == null ? '' : String(id);
  return ALLOWED_GEMINI_MODEL_IDS.has(s) ? s : fallback;
}
