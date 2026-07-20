import { isBlockedIp } from './ipRanges';

// Chặn host trỏ tới hạ tầng nội bộ để phòng SSRF (localhost + mọi dải IP nội bộ).
// Lưu ý: đây là kiểm tra theo literal host; không phòng được DNS rebinding
// (hostname public phân giải ra IP nội bộ). Lớp chặn ở tầng kết nối nằm trong
// ssrfSafeFetch (guard DNS lookup) — dùng chung isBlockedIp.
function isBlockedHost(hostname: string): boolean {
  let host = hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return true;
  }
  return isBlockedIp(host);
}

export function validateHttpsBaseUrl(
  baseUrl: string,
  provider: string
): { ok: true; normalized: string } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { ok: false, error: `${provider} base URL không hợp lệ.` };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: `${provider} base URL phải dùng https://` };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: `${provider} base URL không được trỏ tới địa chỉ nội bộ.` };
  }
  return { ok: true, normalized: baseUrl.replace(/\/+$/, '') };
}
