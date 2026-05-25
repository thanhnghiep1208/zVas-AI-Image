/** Firebase Auth dùng email giả: username + suffix (khớp server admin create user). */
export const USERNAME_EMAIL_SUFFIX = '@zvas.local';

export function resolveLoginEmail(usernameOrEmail: string): string {
  const trimmed = usernameOrEmail.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  return `${trimmed.toLowerCase()}${USERNAME_EMAIL_SUFFIX}`;
}

/** Chuẩn hóa username khi admin tạo user (bỏ suffix/email nếu admin nhập nhầm). */
export function normalizeAdminUsername(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';
  if (trimmed.endsWith(USERNAME_EMAIL_SUFFIX)) {
    return trimmed.slice(0, -USERNAME_EMAIL_SUFFIX.length);
  }
  const at = trimmed.indexOf('@');
  if (at > 0) return trimmed.slice(0, at);
  return trimmed;
}

export function emailForAdminUsername(username: string): string {
  const local = normalizeAdminUsername(username);
  return local ? `${local}${USERNAME_EMAIL_SUFFIX}` : '';
}
