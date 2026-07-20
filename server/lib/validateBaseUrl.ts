// Chặn host trỏ tới hạ tầng nội bộ để phòng SSRF (loopback, mạng private,
// link-local incl. cloud metadata 169.254.169.254, và IPv6 tương ứng).
// Lưu ý: đây là kiểm tra theo literal host; không phòng được DNS rebinding
// (hostname public phân giải ra IP nội bộ) — cần chặn ở tầng fetch nếu muốn đầy đủ.
function isBlockedHost(hostname: string): boolean {
  let host = hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1);
  }

  if (host === 'localhost' || host.endsWith('.localhost')) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 127) return true; // loopback 127.0.0.0/8
    if (a === 10) return true; // private 10.0.0.0/8
    if (a === 192 && b === 168) return true; // private 192.168.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16.0.0/12
    if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16 (metadata)
    if (a === 0) return true; // 0.0.0.0/8
    return false;
  }

  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true; // loopback / unspecified
    const firstGroup = host.split(':')[0];
    if (/^f[cd]/.test(firstGroup)) return true; // unique-local fc00::/7
    if (/^fe[89ab]/.test(firstGroup)) return true; // link-local fe80::/10
    const mappedV4 = host.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/); // ::ffff:a.b.c.d
    if (mappedV4 && isBlockedHost(mappedV4[1])) return true;
    return false;
  }

  return false;
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
