/**
 * Gọi Gemini generateContent có retry + ngân sách thời gian.
 *
 * Từ dữ liệu `image_generation_failed` (2026-10): no_output (~22%) do server bỏ
 * qua `finishReason`, 503/500 tạm thời không được retry, và `gemini-3-pro` có
 * lúc treo tới timeout 300s của Cloud Run (504). Module này tách logic đó khỏi
 * route để test được bằng clock giả.
 */

export interface GeminiResult {
  imageBase64: string;
  text: string;
  finishReason?: string;
  blockReason?: string;
}

interface GeminiResponseLike {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string } }> };
  }>;
  promptFeedback?: { blockReason?: string };
}

export function extractGeminiResult(response: GeminiResponseLike): GeminiResult {
  const candidate = response.candidates?.[0];
  let imageBase64 = '';
  let text = '';
  for (const part of candidate?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      imageBase64 = part.inlineData.data;
    } else if (part.text) {
      text = part.text;
    }
  }
  return {
    imageBase64,
    text,
    finishReason: candidate?.finishReason,
    blockReason: response.promptFeedback?.blockReason,
  };
}

/** finishReason của bộ lọc an toàn — prompt/ảnh giữ nguyên thì retry cũng bị chặn lại. */
const CONTENT_FILTER_FINISH_REASONS = new Set([
  'SAFETY',
  'PROHIBITED_CONTENT',
  'BLOCKLIST',
  'SPII',
  'RECITATION',
  'IMAGE_SAFETY',
  'IMAGE_PROHIBITED_CONTENT',
  'IMAGE_RECITATION',
]);

export type GeminiFailureCode = 'content_filter' | 'no_output' | 'timeout';

export function classifyMissingImage({
  finishReason,
  blockReason,
}: {
  finishReason?: string;
  blockReason?: string;
}): { code: 'content_filter' | 'no_output'; retryable: boolean } {
  if (blockReason || (finishReason && CONTENT_FILTER_FINISH_REASONS.has(finishReason))) {
    return { code: 'content_filter', retryable: false };
  }
  // NO_IMAGE / IMAGE_OTHER / STOP-chỉ-có-text: thường thành công ở lần gọi lại.
  return { code: 'no_output', retryable: true };
}

export class GeminiGenerationError extends Error {
  constructor(
    readonly code: GeminiFailureCode,
    message: string,
    readonly finishReason?: string,
    readonly modelText?: string
  ) {
    super(message);
    this.name = 'GeminiGenerationError';
  }
}

export function isTimeoutError(error: unknown): boolean {
  const name = (error as { name?: string })?.name;
  if (name === 'AbortError' || name === 'TimeoutError') return true;
  // SDK có thể bọc lỗi abort thành Error thường.
  const message = error instanceof Error ? error.message : '';
  return /operation was aborted|operation timed out/i.test(message);
}

export function isTransientGeminiError(error: unknown): boolean {
  if (isTimeoutError(error)) return false;
  const status = (error as { status?: number })?.status;
  if (typeof status === 'number') return status === 500 || status === 503 || status === 504;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /"status":\s*"(UNAVAILABLE|INTERNAL)"|"code":\s*(500|503|504)\b/.test(message);
}

export interface RetryOptions {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  maxAttempts?: number;
  /** Tổng thời gian cho mọi lần thử — phải dưới timeout 300s của Cloud Run. */
  totalBudgetMs?: number;
  /** Trần cho một lần gọi Gemini. */
  attemptTimeoutMs?: number;
  /** Không bắt đầu lần thử mới nếu còn ít hơn chừng này. */
  minAttemptMs?: number;
}

export const GEMINI_TOTAL_BUDGET_MS = 240_000;
const DEFAULT_ATTEMPT_TIMEOUT_MS = 150_000;
const DEFAULT_MIN_ATTEMPT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_MISSING_IMAGE_RETRIES = 1;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_JITTER_MS = 500;

/**
 * `call(timeoutMs)` thực hiện một lần gọi Gemini, tự hủy sau `timeoutMs`.
 * Retry: lỗi 500/503/504 tạm thời (tối đa `maxAttempts`) và thiếu ảnh không do
 * bộ lọc (tối đa 1 lần). Không retry timeout — lần sau thường cũng treo, và
 * mỗi lần gọi đều có thể bị tính phí.
 */
export async function generateWithRetry<T>(
  call: (timeoutMs: number) => Promise<{ result: GeminiResult; raw: T }>,
  options: RetryOptions = {}
): Promise<{ result: GeminiResult; raw: T; attempts: number }> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const totalBudgetMs = options.totalBudgetMs ?? GEMINI_TOTAL_BUDGET_MS;
  const attemptTimeoutMs = options.attemptTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  const minAttemptMs = options.minAttemptMs ?? DEFAULT_MIN_ATTEMPT_MS;

  const startedAt = now();
  const remaining = () => totalBudgetMs - (now() - startedAt);
  let missingImageRetries = 0;

  for (let attempt = 1; ; attempt += 1) {
    let failure: unknown;
    let retryable = false;
    try {
      const { result, raw } = await call(Math.min(attemptTimeoutMs, remaining()));
      if (result.imageBase64) return { result, raw, attempts: attempt };

      const missing = classifyMissingImage(result);
      failure = new GeminiGenerationError(
        missing.code,
        missing.code === 'content_filter'
          ? 'Image blocked by the safety filter.'
          : 'No image was generated by the model.',
        result.finishReason ?? result.blockReason,
        result.text
      );
      retryable = missing.retryable && missingImageRetries < MAX_MISSING_IMAGE_RETRIES;
      if (retryable) missingImageRetries += 1;
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new GeminiGenerationError('timeout', 'Gemini request timed out.');
      }
      failure = error;
      retryable = isTransientGeminiError(error);
    }

    const backoffMs = BACKOFF_BASE_MS * 2 ** (attempt - 1) + Math.round(random() * BACKOFF_JITTER_MS);
    if (!retryable || attempt >= maxAttempts || remaining() - backoffMs < minAttemptMs) {
      throw failure;
    }
    console.warn(`[generate] Gemini attempt ${attempt} failed, retrying in ${backoffMs}ms:`, failure);
    await sleep(backoffMs);
  }
}
