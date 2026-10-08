import { GEMINI_NANO_BANANA_2 } from '../constants/aiModels';
import type { AdminSettingsSnapshot } from '../components/admin/types';

/** Key app được phép ghi vào `settings/global` — phải khớp `isSafeGlobalSettings()` trong firestore.rules. */
export const GLOBAL_SETTINGS_WRITE_KEYS: readonly string[] = [
  'enabledProviders',
  'geminiModel',
  'geminiFlashRollback',
  'seedanceModel',
  'seedanceBaseUrl',
  'seedreamModel',
  'seedreamBaseUrl',
  'updatedAt',
];

export type GlobalSettingsPayload = AdminSettingsSnapshot & {
  /** Rollback chỉ bật khi admin chủ động chọn Nano Banana 2 (xem getAdminGeminiModel). */
  geminiFlashRollback: boolean;
  updatedAt: string;
};

export function buildGlobalSettingsPayload(
  normalized: AdminSettingsSnapshot,
  now: Date
): GlobalSettingsPayload {
  return {
    ...normalized,
    geminiFlashRollback: normalized.geminiModel === GEMINI_NANO_BANANA_2,
    updatedAt: now.toISOString(),
  };
}
