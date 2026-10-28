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

/**
 * Allowlist host cho từng provider. Base URL do client gửi lên được dùng để gọi
 * API provider KÈM khóa server trong header Authorization, nên host lạ = rò khóa
 * (Finding 1). Mặc định chỉ cho host chính thức; admin tự host proxy thì thêm qua
 * env `SEEDANCE_ALLOWED_HOSTS` / `SEEDREAM_ALLOWED_HOSTS` (danh sách, phân cách phẩy).
 * Mục bắt đầu bằng '.' là khớp hậu tố domain (vd. '.bytepluses.com').
 */
export type AllowlistedProvider = 'seedance' | 'seedream';

const DEFAULT_PROVIDER_HOSTS: Record<AllowlistedProvider, string[]> = {
  seedance: ['api.seedance.com'],
  seedream: ['.bytepluses.com'],
};

const PROVIDER_LABEL: Record<AllowlistedProvider, string> = {
  seedance: 'Seedance',
  seedream: 'Seedream',
};

function allowedProviderHosts(provider: AllowlistedProvider): string[] {
  const envName = provider === 'seedance' ? 'SEEDANCE_ALLOWED_HOSTS' : 'SEEDREAM_ALLOWED_HOSTS';
  const extra = (process.env[envName] || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_PROVIDER_HOSTS[provider], ...extra];
}

function hostMatchesAllowlist(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return allowlist.some((entry) =>
    entry.startsWith('.') ? host === entry.slice(1) || host.endsWith(entry) : host === entry
  );
}

/**
 * Như `validateHttpsBaseUrl` (https + chặn IP nội bộ) và THÊM: host phải nằm trong
 * allowlist của provider. Dùng cho mọi lời gọi provider có gắn khóa server.
 */
export function validateProviderBaseUrl(
  baseUrl: string,
  provider: AllowlistedProvider
): { ok: true; normalized: string } | { ok: false; error: string } {
  const label = PROVIDER_LABEL[provider];
  const base = validateHttpsBaseUrl(baseUrl, label);
  if (base.ok === false) return base;

  let hostname: string;
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    return { ok: false, error: `${label} base URL không hợp lệ.` };
  }
  if (!hostMatchesAllowlist(hostname, allowedProviderHosts(provider))) {
    return {
      ok: false,
      error: `${label} base URL không được phép (host không thuộc danh sách tin cậy).`,
    };
  }
  return base;
}
