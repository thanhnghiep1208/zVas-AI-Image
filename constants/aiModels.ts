export type ProviderKey = 'gemini' | 'openai' | 'seedance' | 'seedream';

export interface ProviderModelOption {
  provider: ProviderKey;
  value: string;
  label: string;
  /** Unique key used by unified dropdown */
  key: string;
}

const baseProviderModelOptions: Record<ProviderKey, Array<{ value: string; label: string }>> = {
  gemini: [
    { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
    { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2' },
  ],
  openai: [{ value: 'dall-e-3', label: 'DALL-E 3' }],
  seedance: [{ value: 'seed-1.5-pro', label: 'Seedance 1.5 Pro' }],
  seedream: [{ value: 'seedream-4.0', label: 'Seedream 4.0' }],
};

export const PROVIDER_MODEL_OPTIONS: Record<ProviderKey, ProviderModelOption[]> = (
  Object.entries(baseProviderModelOptions) as Array<[ProviderKey, Array<{ value: string; label: string }>]>
).reduce(
  (acc, [provider, options]) => {
    acc[provider] = options.map((option) => ({
      ...option,
      provider,
      key: `${provider}:${option.value}`,
    }));
    return acc;
  },
  {} as Record<ProviderKey, ProviderModelOption[]>
);

export const ALL_PROVIDER_MODEL_OPTIONS: ProviderModelOption[] = (
  Object.values(PROVIDER_MODEL_OPTIONS) as ProviderModelOption[][]
).flat();

export const DEFAULT_ENABLED_PROVIDERS: ProviderKey[] = ['gemini'];

export function normalizeEnabledProviders(input: unknown): ProviderKey[] {
  if (!Array.isArray(input)) return [...DEFAULT_ENABLED_PROVIDERS];
  const valid: ProviderKey[] = input.filter(
    (item): item is ProviderKey =>
      item === 'gemini' || item === 'openai' || item === 'seedance' || item === 'seedream'
  );
  return valid.length > 0 ? Array.from(new Set(valid)) : [...DEFAULT_ENABLED_PROVIDERS];
}

export function getEnabledModelOptions(enabledProviders: ProviderKey[]): ProviderModelOption[] {
  return enabledProviders.flatMap((provider) => PROVIDER_MODEL_OPTIONS[provider] ?? []);
}

export function modelKeyFrom(provider: ProviderKey, model: string): string {
  return `${provider}:${model}`;
}

export function parseModelKey(modelKey: string): { provider: ProviderKey; model: string } | null {
  const [providerRaw, ...rest] = String(modelKey || '').split(':');
  const model = rest.join(':');
  if (!model) return null;
  if (
    providerRaw !== 'gemini' &&
    providerRaw !== 'openai' &&
    providerRaw !== 'seedance' &&
    providerRaw !== 'seedream'
  ) {
    return null;
  }
  return { provider: providerRaw, model };
}

export function resolveModelKey(
  enabledProviders: ProviderKey[],
  preferredModelKey: string | null | undefined
): ProviderModelOption {
  const options = getEnabledModelOptions(enabledProviders);
  const fallback = options[0] ?? PROVIDER_MODEL_OPTIONS.gemini[0];
  if (!preferredModelKey) return fallback;
  return options.find((option) => option.key === preferredModelKey) ?? fallback;
}

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
