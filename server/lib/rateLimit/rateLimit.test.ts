import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { resolveRateLimitBackend } from './config';
import { tryConsumeRateLimitMemory } from './memoryStore';
import { resetRateLimitBackendForTests, tryConsumeRateLimit } from './index';

describe('rateLimit memory store', () => {
  it('allows up to 10 requests per minute per user', () => {
    const userId = `test-user-${Date.now()}`;
    for (let i = 0; i < 10; i += 1) {
      assert.equal(tryConsumeRateLimitMemory(userId), true);
    }
    assert.equal(tryConsumeRateLimitMemory(userId), false);
  });
});

describe('rateLimit backend resolution', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevBackend = process.env.RATE_LIMIT_BACKEND;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    process.env.RATE_LIMIT_BACKEND = prevBackend;
    resetRateLimitBackendForTests();
  });

  it('defaults to memory outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.RATE_LIMIT_BACKEND;
    resetRateLimitBackendForTests();
    assert.equal(resolveRateLimitBackend(), 'memory');
  });

  it('uses memory when RATE_LIMIT_BACKEND=memory', async () => {
    process.env.RATE_LIMIT_BACKEND = 'memory';
    resetRateLimitBackendForTests();
    const userId = `mem-backend-${Date.now()}`;
    assert.equal(await tryConsumeRateLimit(userId), true);
  });
});
