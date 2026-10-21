/**
 * `settings/public` — cấu hình ai cũng đọc được (kể cả chưa đăng nhập), chỉ admin ghi.
 * Không đặt dữ liệu nhạy cảm ở đây.
 */
export const PUBLIC_SETTINGS_DOC_PATH = ['settings', 'public'] as const;

/** Phải khớp giới hạn trong `isSafePublicSettings()` của firestore.rules. */
export const LOGIN_CONTACT_MAX_LENGTH = 500;

/** Key app được phép ghi vào `settings/public` — phải khớp `isSafePublicSettings()` trong firestore.rules. */
export const PUBLIC_SETTINGS_WRITE_KEYS: readonly string[] = ['loginContactText', 'updatedAt'];

export interface PublicSettingsPayload {
  loginContactText: string;
  updatedAt: string;
}

export function normalizeLoginContactText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
    .slice(0, LOGIN_CONTACT_MAX_LENGTH);
}

export function buildPublicSettingsPayload(loginContactText: string, now: Date): PublicSettingsPayload {
  return {
    loginContactText: normalizeLoginContactText(loginContactText),
    updatedAt: now.toISOString(),
  };
}
