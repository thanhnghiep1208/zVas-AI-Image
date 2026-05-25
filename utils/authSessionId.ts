const SESSION_STORAGE_KEY = 'zvas_auth_session_id';

/** ID phiên cố định theo trình duyệt (localStorage). Cùng browser/profile = một phiên. */
export function getOrCreateLocalSessionId(): string {
  if (typeof window === 'undefined') {
    return `ssr-${Date.now()}`;
  }
  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export function clearLocalSessionId(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Thiết bị không xác định';
  const ua = navigator.userAgent;
  let os = 'Hệ điều hành';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Trình duyệt';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  return `${browser} · ${os}`;
}
