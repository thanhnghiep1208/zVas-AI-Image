export type ProviderKey = 'gemini' | 'openai' | 'seedance' | 'seedream';

export interface ProviderModelOption {
  provider: ProviderKey;
  value: string;
  label: string;
  /** Unique key used by unified dropdown */
  key: string;
}

export const GEMINI_NANO_BANANA_2_1 = 'gemini-nano-banana-2.1';
/** Nano Banana 2 – chỉ còn dùng làm phương án rollback (admin chọn trong Settings). */
export const GEMINI_NANO_BANANA_2 = 'gemini-3.1-flash-image-preview';
export const GEMINI_NANO_BANANA_PRO = 'gemini-3-pro-image-preview';

const GEMINI_MODEL_LABELS: Record<string, string> = {
  [GEMINI_NANO_BANANA_2_1]: 'Nano Banana 2.1',
  [GEMINI_NANO_BANANA_2]: 'Nano Banana 2',
  [GEMINI_NANO_BANANA_PRO]: 'Nano Banana Pro',
};

/** Lựa chọn model Gemini trong Admin Settings (gồm cả Nano Banana 2 để rollback). */
export const GEMINI_ADMIN_MODEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: GEMINI_NANO_BANANA_2_1, label: 'Nano Banana 2.1 (mặc định)' },
  { value: GEMINI_NANO_BANANA_PRO, label: 'Nano Banana Pro' },
  { value: GEMINI_NANO_BANANA_2, label: 'Nano Banana 2 (cũ – dùng để rollback)' },
];

const baseProviderModelOptions: Record<ProviderKey, Array<{ value: string; label: string }>> = {
  gemini: [
    { value: GEMINI_NANO_BANANA_2_1, label: GEMINI_MODEL_LABELS[GEMINI_NANO_BANANA_2_1] },
    { value: GEMINI_NANO_BANANA_PRO, label: GEMINI_MODEL_LABELS[GEMINI_NANO_BANANA_PRO] },
  ],
  openai: [{ value: 'dall-e-3', label: 'DALL-E 3' }],
  seedance: [{ value: 'seed-1.5-pro', label: 'Seedance 1.5 Pro' }],
  seedream: [
    { value: 'seedream-5-0-260128', label: 'Dola-Seedream-5.0-lite' },
    { value: 'seedream-4-5-251128', label: 'ByteDance-Seedream-4.5' },
  ],
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

/**
 * Model Flash user đang thấy: Nano Banana 2 khi admin rollback (chọn NB2 trong Settings),
 * ngược lại là Nano Banana 2.1.
 */
export function getActiveGeminiFlashModel(adminGeminiModel?: string | null): string {
  return adminGeminiModel === GEMINI_NANO_BANANA_2 ? GEMINI_NANO_BANANA_2 : GEMINI_NANO_BANANA_2_1;
}

function isGeminiFlashModel(model: string): boolean {
  return model === GEMINI_NANO_BANANA_2_1 || model === GEMINI_NANO_BANANA_2;
}

function geminiOptionFor(model: string): ProviderModelOption {
  return {
    provider: 'gemini',
    value: model,
    label: GEMINI_MODEL_LABELS[model] ?? model,
    key: `gemini:${model}`,
  };
}

export function getEnabledModelOptions(
  enabledProviders: ProviderKey[],
  adminGeminiModel?: string | null
): ProviderModelOption[] {
  const activeFlash = getActiveGeminiFlashModel(adminGeminiModel);
  return enabledProviders.flatMap((provider) => {
    const options = PROVIDER_MODEL_OPTIONS[provider] ?? [];
    if (provider !== 'gemini') return options;
    return options.map((option) =>
      isGeminiFlashModel(option.value) ? geminiOptionFor(activeFlash) : option
    );
  });
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
  preferredModelKey: string | null | undefined,
  adminGeminiModel?: string | null
): ProviderModelOption {
  const options = getEnabledModelOptions(enabledProviders, adminGeminiModel);
  const fallback = options[0] ?? geminiOptionFor(getActiveGeminiFlashModel(adminGeminiModel));
  if (!preferredModelKey) return fallback;
  const parsed = parseModelKey(preferredModelKey);
  // Preference Flash cũ/mới (NB2 hoặc 2.1) luôn theo model Flash đang hoạt động.
  const key =
    parsed?.provider === 'gemini' && isGeminiFlashModel(parsed.model)
      ? modelKeyFrom('gemini', getActiveGeminiFlashModel(adminGeminiModel))
      : preferredModelKey;
  return options.find((option) => option.key === key) ?? fallback;
}

export const GEMINI_MODEL_FALLBACK = GEMINI_NANO_BANANA_2_1;

export const ALLOWED_GEMINI_MODEL_IDS = new Set(GEMINI_ADMIN_MODEL_OPTIONS.map((o) => o.value));

/** Chuẩn hóa id model Gemini (Firestore / localStorage cũ có thể lưu id không còn hỗ trợ). */
export function normalizeGeminiModelId(
  id: string | undefined | null,
  fallback: string = GEMINI_MODEL_FALLBACK
): string {
  const s = id == null ? '' : String(id);
  return ALLOWED_GEMINI_MODEL_IDS.has(s) ? s : fallback;
}

/** Kích thước ảnh model không hỗ trợ (API 2.1 trả 400 "Image size 512px is not supported"). */
const UNSUPPORTED_IMAGE_SIZES: Record<string, string[]> = {
  [GEMINI_NANO_BANANA_2_1]: ['512px'],
};

export function getUnsupportedImageSizes(model: string): string[] {
  return UNSUPPORTED_IMAGE_SIZES[model] ?? [];
}

/**
 * Model Gemini thật sự được gọi cho một request (dùng chung client/server):
 * - ID không hợp lệ/thiếu → model admin (nếu hợp lệ) hoặc model Flash đang hoạt động.
 * - Flash (2.1 hoặc NB2) → model Flash đang hoạt động (rollback do admin quyết định).
 */
export function resolveGeminiRequestModel(
  requestedModel: string | null | undefined,
  adminGeminiModel: string | null | undefined
): string {
  const activeFlash = getActiveGeminiFlashModel(adminGeminiModel);
  const model =
    requestedModel && ALLOWED_GEMINI_MODEL_IDS.has(requestedModel)
      ? requestedModel
      : adminGeminiModel && ALLOWED_GEMINI_MODEL_IDS.has(adminGeminiModel)
        ? adminGeminiModel
        : activeFlash;
  return isGeminiFlashModel(model) ? activeFlash : model;
}
