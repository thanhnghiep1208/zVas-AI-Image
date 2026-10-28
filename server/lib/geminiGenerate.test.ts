import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractGeminiResult,
  classifyMissingImage,
  isTransientGeminiError,
  isTimeoutError,
  generateWithRetry,
  GeminiGenerationError,
} from './geminiGenerate.ts';

describe('extractGeminiResult', () => {
  it('reads image, text, finishReason and blockReason', () => {
    const result = extractGeminiResult({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: 'Here you go' }, { inlineData: { data: 'abc', mimeType: 'image/png' } }] },
        },
      ],
      promptFeedback: { blockReason: undefined },
    });
    assert.deepEqual(result, { imageBase64: 'abc', text: 'Here you go', finishReason: 'STOP', blockReason: undefined });
  });

  it('handles an empty response (prompt blocked, no candidates)', () => {
    assert.deepEqual(extractGeminiResult({ promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } }), {
      imageBase64: '',
      text: '',
      finishReason: undefined,
      blockReason: 'PROHIBITED_CONTENT',
    });
  });
});

describe('classifyMissingImage', () => {
  it('treats a blocked prompt as content_filter (not retryable)', () => {
    assert.deepEqual(classifyMissingImage({ blockReason: 'SAFETY' }), { code: 'content_filter', retryable: false });
  });

  for (const finishReason of ['IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT', 'SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_RECITATION', 'RECITATION']) {
    it(`treats finishReason ${finishReason} as content_filter`, () => {
      assert.deepEqual(classifyMissingImage({ finishReason }), { code: 'content_filter', retryable: false });
    });
  }

  for (const finishReason of ['NO_IMAGE', 'IMAGE_OTHER', 'STOP', 'OTHER', undefined]) {
    it(`treats finishReason ${finishReason} as retryable no_output`, () => {
      assert.deepEqual(classifyMissingImage({ finishReason }), { code: 'no_output', retryable: true });
    });
  }
});

describe('isTransientGeminiError', () => {
  it('retries 500 / 503 / 504 ApiError-like errors', () => {
    for (const status of [500, 503, 504]) {
      assert.equal(isTransientGeminiError(Object.assign(new Error('x'), { status })), true);
    }
  });

  it('retries UNAVAILABLE / INTERNAL messages without a status', () => {
    assert.equal(
      isTransientGeminiError(new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}')),
      true
    );
    assert.equal(isTransientGeminiError(new Error('{"error":{"code":500,"message":"Internal error encountered.","status":"INTERNAL"}}')), true);
  });

  it('does not retry client errors, quota or timeouts', () => {
    assert.equal(isTransientGeminiError(Object.assign(new Error('bad'), { status: 400 })), false);
    assert.equal(isTransientGeminiError(Object.assign(new Error('quota'), { status: 429 })), false);
    assert.equal(isTransientGeminiError(Object.assign(new Error('aborted'), { name: 'AbortError' })), false);
  });
});

describe('isTimeoutError', () => {
  it('detects abort / timeout errors', () => {
    assert.equal(isTimeoutError(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })), true);
    assert.equal(isTimeoutError(Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' })), true);
    assert.equal(isTimeoutError(new Error('Internal error')), false);
  });
});

function fakeClock() {
  let now = 0;
  const sleeps: number[] = [];
  return {
    now: () => now,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      now += ms;
    },
    advance: (ms: number) => {
      now += ms;
    },
    sleeps,
  };
}

const IMAGE = { imageBase64: 'img', text: '', finishReason: 'STOP', blockReason: undefined };
const NO_IMAGE = { imageBase64: '', text: 'I cannot draw that', finishReason: 'NO_IMAGE', blockReason: undefined };
const transient = () => Object.assign(new Error('UNAVAILABLE'), { status: 503 });

describe('generateWithRetry', () => {
  it('returns the first successful result without retrying', async () => {
    const clock = fakeClock();
    let calls = 0;
    const out = await generateWithRetry(async () => {
      calls += 1;
      return { result: IMAGE, raw: { n: calls } };
    }, { ...clock, random: () => 0 });
    assert.equal(calls, 1);
    assert.equal(out.result.imageBase64, 'img');
    assert.equal(out.attempts, 1);
  });

  it('retries transient errors with backoff and then succeeds', async () => {
    const clock = fakeClock();
    let calls = 0;
    const out = await generateWithRetry(async () => {
      calls += 1;
      if (calls < 3) throw transient();
      return { result: IMAGE, raw: null };
    }, { ...clock, random: () => 0 });
    assert.equal(calls, 3);
    assert.equal(out.attempts, 3);
    assert.deepEqual(clock.sleeps, [1000, 2000]);
  });

  it('gives up after maxAttempts transient errors and rethrows the last error', async () => {
    const clock = fakeClock();
    let calls = 0;
    await assert.rejects(
      generateWithRetry(async () => {
        calls += 1;
        throw transient();
      }, { ...clock, random: () => 0 }),
      (err: unknown) => (err as { status?: number }).status === 503
    );
    assert.equal(calls, 3);
  });

  it('does not retry non-transient errors', async () => {
    const clock = fakeClock();
    let calls = 0;
    await assert.rejects(
      generateWithRetry(async () => {
        calls += 1;
        throw Object.assign(new Error('bad request'), { status: 400 });
      }, { ...clock, random: () => 0 })
    );
    assert.equal(calls, 1);
  });

  it('retries a missing image once, then reports no_output', async () => {
    const clock = fakeClock();
    let calls = 0;
    await assert.rejects(
      generateWithRetry(async () => {
        calls += 1;
        return { result: NO_IMAGE, raw: null };
      }, { ...clock, random: () => 0 }),
      (err: unknown) =>
        err instanceof GeminiGenerationError && err.code === 'no_output' && err.modelText === 'I cannot draw that'
    );
    assert.equal(calls, 2);
  });

  it('recovers when the retry after a missing image produces one', async () => {
    const clock = fakeClock();
    let calls = 0;
    const out = await generateWithRetry(async () => {
      calls += 1;
      return { result: calls === 1 ? NO_IMAGE : IMAGE, raw: null };
    }, { ...clock, random: () => 0 });
    assert.equal(out.result.imageBase64, 'img');
  });

  it('never retries a content-filtered response', async () => {
    const clock = fakeClock();
    let calls = 0;
    await assert.rejects(
      generateWithRetry(async () => {
        calls += 1;
        return { result: { ...NO_IMAGE, finishReason: 'IMAGE_SAFETY' }, raw: null };
      }, { ...clock, random: () => 0 }),
      (err: unknown) => err instanceof GeminiGenerationError && err.code === 'content_filter'
    );
    assert.equal(calls, 1);
  });

  it('gives each attempt at most the remaining budget and stops when it is spent', async () => {
    const clock = fakeClock();
    const timeouts: number[] = [];
    await assert.rejects(
      generateWithRetry(
        async (timeoutMs) => {
          timeouts.push(timeoutMs);
          clock.advance(100_000);
          throw transient();
        },
        { ...clock, random: () => 0, totalBudgetMs: 240_000, attemptTimeoutMs: 150_000, minAttemptMs: 30_000 }
      )
    );
    // 1st: cap 150s; t=100s + 1s backoff → 139s left; t=201s + 2s backoff → 37s left (≥ 30s).
    assert.deepEqual(timeouts, [150_000, 139_000, 37_000]);
  });

  it('skips a retry when the remaining budget is below minAttemptMs', async () => {
    const clock = fakeClock();
    let calls = 0;
    await assert.rejects(
      generateWithRetry(
        async () => {
          calls += 1;
          clock.advance(220_000);
          throw transient();
        },
        { ...clock, random: () => 0, totalBudgetMs: 240_000, minAttemptMs: 30_000 }
      )
    );
    assert.equal(calls, 1);
  });

  it('does not retry timeouts', async () => {
    const clock = fakeClock();
    let calls = 0;
    await assert.rejects(
      generateWithRetry(async () => {
        calls += 1;
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      }, { ...clock, random: () => 0 }),
      (err: unknown) => err instanceof GeminiGenerationError && err.code === 'timeout'
    );
    assert.equal(calls, 1);
  });
});
