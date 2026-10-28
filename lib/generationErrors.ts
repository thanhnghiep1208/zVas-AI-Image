/**
 * Phân loại lỗi tạo ảnh — nguồn duy nhất cho client (`geminiService`), lúc ghi
 * analytics (`analyticsService`) và lúc gom dashboard (`analyticsAggregation`).
 *
 * Trước 10/2026 có 3 bộ luật keyword riêng, lệch thứ tự nhau (vd. "rate limit"
 * thành `quota_exceeded` ở chỗ này, `rate_limit` ở chỗ kia), và message thô bị
 * ghi thẳng vào `error_code`. Rule ở đây được kiểm bằng message thật trong
 * `analytics_events` (xem generationErrors.test.ts).
 */

export const GENERATION_ERROR_CODES = [
  'payload_too_large',
  'file_read_failed',
  'content_filter',
  'invalid_prompt',
  'network_error',
  'no_output',
  'timeout',
  'service_unavailable',
  'server_error',
  'quota_exceeded',
  'rate_limit',
  'config_error',
  'forbidden',
  'auth_error',
  'permission_denied',
  'not_found',
  'unknown_error',
] as const;

export type GenerationErrorCode = (typeof GENERATION_ERROR_CODES)[number];

/**
 * - `user`: do nội dung/thao tác của user (ảnh quá nặng, prompt bị lọc...) — sửa bằng UX/hướng dẫn.
 * - `client`: mạng/thiết bị phía user.
 * - `system`: server, nhà cung cấp AI hoặc cấu hình — đội vận hành phải xử lý.
 */
export type GenerationErrorSource = 'user' | 'client' | 'system';

export interface GenerationErrorInfo {
  code: GenerationErrorCode;
  label: string;
  severity: 'warning' | 'critical';
  source: GenerationErrorSource;
}

const INFO: Record<GenerationErrorCode, Omit<GenerationErrorInfo, 'code'>> = {
  payload_too_large: { label: 'Payload Too Large (413)', severity: 'warning', source: 'user' },
  file_read_failed: { label: 'File Read Failed', severity: 'warning', source: 'user' },
  content_filter: { label: 'Content Filter', severity: 'warning', source: 'user' },
  invalid_prompt: { label: 'Invalid Request (400)', severity: 'warning', source: 'user' },
  network_error: { label: 'Network Error', severity: 'warning', source: 'client' },
  no_output: { label: 'No Output', severity: 'warning', source: 'system' },
  timeout: { label: 'API Timeout', severity: 'critical', source: 'system' },
  service_unavailable: { label: 'Service Unavailable (503)', severity: 'critical', source: 'system' },
  server_error: { label: 'Server Error (500/502)', severity: 'critical', source: 'system' },
  quota_exceeded: { label: 'Quota Exceeded (429)', severity: 'critical', source: 'system' },
  rate_limit: { label: 'Rate Limit', severity: 'warning', source: 'system' },
  config_error: { label: 'API Key / Config', severity: 'critical', source: 'system' },
  forbidden: { label: 'API Key / Permission (403)', severity: 'critical', source: 'system' },
  auth_error: { label: 'Auth Error (401)', severity: 'critical', source: 'system' },
  permission_denied: { label: 'Permission Denied', severity: 'critical', source: 'system' },
  not_found: { label: 'Model Not Found', severity: 'warning', source: 'system' },
  unknown_error: { label: 'Unknown Error', severity: 'critical', source: 'system' },
};

const KNOWN_CODES = new Set<string>(GENERATION_ERROR_CODES);

export function isGenerationErrorCode(value: unknown): value is GenerationErrorCode {
  return typeof value === 'string' && KNOWN_CODES.has(value);
}

/** Thứ tự quan trọng: rule cụ thể đứng trước rule chung (vd. "API key not valid" là 400 nhưng là lỗi cấu hình). */
const RULES: Array<[GenerationErrorCode, RegExp]> = [
  ['payload_too_large', /\b413\b|payload too large|entity too large|too large/],
  ['file_read_failed', /file read failed/],
  ['no_output', /no image was generated|\bno output\b/],
  ['content_filter', /safety|content filter|blocked|prohibited/],
  ['config_error', /api key missing|api key not valid|api key invalid|default credentials|service account\.?json|chưa được cấu hình|not configured|unregistered callers/],
  ['quota_exceeded', /\b429\b|quota|resource exhausted|too many requests/],
  ['rate_limit', /rate limit/],
  ['service_unavailable', /\b503\b|service unavailable|"status":"unavailable"|high demand/],
  ['timeout', /\b504\b|timeout|timed out|deadline exceeded|aborted/],
  ['server_error', /\b50[02]\b|internal server error|internal error|bad gateway|non json|not valid json|doctype/],
  ['permission_denied', /permission denied|insufficient permissions/],
  ['forbidden', /\b403\b|forbidden/],
  ['auth_error', /\b401\b|unauthorized|unauthenticated|must be logged in/],
  ['not_found', /not found|does not exist/],
  ['invalid_prompt', /\b400\b|bad request|invalid argument|invalid|not supported/],
  ['network_error', /failed to fetch|load failed|networkerror|network/],
];

/** Message thô / slug cũ / mã sạch → mã lỗi chuẩn. */
export function classifyGenerationError(raw: string | null | undefined): GenerationErrorCode {
  const text = String(raw ?? '').trim();
  if (!text) return 'unknown_error';
  if (isGenerationErrorCode(text)) return text;
  // Slug cũ (`no_image_was_generated_by_the_model_`) và mã như RESOURCE_EXHAUSTED, non-JSON.
  const normalized = text.toLowerCase().replace(/[_-]+/g, ' ');
  for (const [code, pattern] of RULES) {
    if (pattern.test(normalized)) return code;
  }
  return 'unknown_error';
}

export function describeGenerationError(raw: string | null | undefined): GenerationErrorInfo {
  const code = classifyGenerationError(raw);
  return { code, ...INFO[code] };
}

export const GENERATION_ERROR_SOURCE_LABELS: Record<GenerationErrorSource, string> = {
  user: 'Do nội dung / thao tác',
  client: 'Mạng / thiết bị user',
  system: 'Hệ thống / nhà cung cấp',
};
