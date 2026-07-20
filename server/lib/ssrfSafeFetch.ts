import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { Agent, fetch as undiciFetch } from 'undici';
import { isBlockedIp } from './ipRanges';

// Dùng fetch CỦA undici (không phải global fetch của Node) để dispatcher/Agent
// cùng một phiên bản undici — tránh lỗi giao diện Dispatcher không khớp.
const defaultFetch = undiciFetch as unknown as typeof fetch;

// Danh sách host được phép trỏ nội bộ (escape hatch cho deploy provider riêng).
// Mặc định rỗng. Ví dụ: SSRF_ALLOWED_HOSTS="proxy.internal,10.1.2.3"
function allowedHosts(): Set<string> {
  return new Set(
    (process.env.SSRF_ALLOWED_HOSTS || '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Trả về địa chỉ nội bộ ĐẦU TIÊN trong tập phân giải, hoặc null nếu tất cả đều
 * public. (Trả string|null thay vì union để không phụ thuộc narrowing — dự án
 * không bật strict.)
 */
export function blockedAddress(addresses: Array<{ address: string; family?: number }>): string | null {
  const bad = addresses.find((a) => isBlockedIp(a.address));
  return bad ? bad.address : null;
}

type LookupImpl = typeof dnsLookup;
type GuardedCallback = (err: NodeJS.ErrnoException | null, address?: string | LookupAddress[], family?: number) => void;

/**
 * Bọc dns.lookup: phân giải TẤT CẢ địa chỉ, chặn nếu có địa chỉ nội bộ, rồi trả
 * đúng địa chỉ sẽ dùng để kết nối. Vì undici gọi lookup ngay trước khi mở socket
 * và connect vào chính địa chỉ trả về, khe hở DNS rebinding (TOCTOU) bị đóng.
 */
export function makeGuardedLookup(lookupImpl: LookupImpl = dnsLookup) {
  return (hostname: string, options: unknown, callback: GuardedCallback): void => {
    const opts = (typeof options === 'object' && options !== null ? options : {}) as Record<string, unknown>;
    lookupImpl(hostname, { ...opts, all: true } as never, (err, result) => {
      if (err) return callback(err);
      const list = result as unknown as LookupAddress[];
      const blocked = blockedAddress(list);
      if (blocked) {
        return callback(
          Object.assign(new Error(`SSRF chặn: ${hostname} phân giải ra địa chỉ nội bộ ${blocked}`), {
            code: 'SSRF_BLOCKED',
          })
        );
      }
      if (opts.all) return callback(null, list);
      return callback(null, list[0].address, list[0].family);
    });
  };
}

const ssrfAgent = new Agent({
  connect: { lookup: makeGuardedLookup() as never, timeout: 10_000 },
});

export interface SsrfSafeFetchOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  dispatcher?: unknown;
}

/**
 * fetch() cho URL do người dùng cấp:
 *  - guarded DNS lookup chặn IP nội bộ ở mọi hop (kể cả redirect vì undici tái
 *    dùng cùng dispatcher),
 *  - không tự follow redirect (redirect: 'error') để loại vector redirect-SSRF,
 *  - timeout cứng chống treo.
 * Host trong SSRF_ALLOWED_HOSTS được bỏ qua guard.
 */
export async function ssrfSafeFetch(
  input: string | URL,
  init: RequestInit = {},
  options: SsrfSafeFetchOptions = {}
): Promise<Response> {
  const url = typeof input === 'string' ? new URL(input) : input;
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const bypass = allowedHosts().has(host);

  // undici bỏ qua connect.lookup khi host là IP literal, nên guard DNS không chạy.
  // Chặn literal nội bộ tại đây để ssrfSafeFetch tự an toàn (không phụ thuộc caller).
  if (!bypass && isBlockedIp(host)) {
    throw Object.assign(new Error(`SSRF chặn: ${host} là địa chỉ nội bộ`), { code: 'SSRF_BLOCKED' });
  }

  const timeoutMs = options.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = options.fetchImpl ?? defaultFetch;

  try {
    return await fetchImpl(input, {
      ...init,
      redirect: init.redirect ?? 'error',
      signal: init.signal ?? controller.signal,
      ...(bypass ? {} : { dispatcher: options.dispatcher ?? ssrfAgent }),
    } as RequestInit);
  } finally {
    clearTimeout(timer);
  }
}
