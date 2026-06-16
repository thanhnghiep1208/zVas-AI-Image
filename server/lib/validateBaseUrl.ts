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
  return { ok: true, normalized: baseUrl.replace(/\/+$/, '') };
}
