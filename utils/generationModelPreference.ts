import { modelKeyFrom, parseModelKey } from '../constants/aiModels';

export const PREFERRED_MODEL_KEY_STORAGE = 'preferred_generation_model_key';

const LEGACY_PREFERRED_MODELS_STORAGE = 'preferred_generation_models';

/** Đọc model key đã lưu (format mới `provider:model` hoặc legacy theo provider). */
export function loadPreferredModelKey(): string | null {
  const savedModelKey = localStorage.getItem(PREFERRED_MODEL_KEY_STORAGE);
  if (savedModelKey) {
    try {
      const parsed = JSON.parse(savedModelKey);
      if (typeof parsed === 'string' && parseModelKey(parsed)) {
        return parsed;
      }
    } catch {
      console.warn('Invalid selected model key in localStorage');
    }
  }

  const legacySaved = localStorage.getItem(LEGACY_PREFERRED_MODELS_STORAGE);
  if (!legacySaved) return null;

  try {
    const parsed = JSON.parse(legacySaved) as Record<string, string>;
    if (parsed?.gemini) return modelKeyFrom('gemini', parsed.gemini);
    if (parsed?.openai) return modelKeyFrom('openai', parsed.openai);
    if (parsed?.seedance) return modelKeyFrom('seedance', parsed.seedance);
    if (parsed?.seedream) return modelKeyFrom('seedream', parsed.seedream);
  } catch {
    /* ignore invalid legacy format */
  }

  return null;
}

/** Lưu preference; bỏ qua nếu key không hợp lệ. */
export function savePreferredModelKey(modelKey: string): void {
  if (!parseModelKey(modelKey)) return;
  localStorage.setItem(PREFERRED_MODEL_KEY_STORAGE, JSON.stringify(modelKey));
}
