import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { blockedAddress, makeGuardedLookup, ssrfSafeFetch } from './ssrfSafeFetch.ts';

type Addr = { address: string; family: number };

// Fake dns.lookup honoring the { all: true } contract used by the guard.
function fakeLookup(addresses: Addr[] | Error) {
  return (_hostname: string, _options: unknown, cb: (err: Error | null, res?: unknown) => void) => {
    if (addresses instanceof Error) return cb(addresses);
    cb(null, addresses);
  };
}

describe('blockedAddress', () => {
  it('returns null when all addresses are public', () => {
    assert.equal(blockedAddress([{ address: '93.184.216.34', family: 4 }]), null);
  });

  it('returns the first internal address when any is blocked', () => {
    const blocked = blockedAddress([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ]);
    assert.equal(blocked, '10.0.0.1');
  });
});

describe('makeGuardedLookup', () => {
  it('errors when the hostname resolves to an internal address (DNS rebinding)', (_t, done) => {
    const guarded = makeGuardedLookup(fakeLookup([{ address: '169.254.169.254', family: 4 }]) as never);
    guarded('evil.attacker.test', {}, (err: Error | null) => {
      assert.ok(err, 'expected a blocking error');
      assert.match(String(err?.message), /169\.254\.169\.254/);
      done();
    });
  });

  it('passes through the address when it resolves to a public IP', (_t, done) => {
    const guarded = makeGuardedLookup(fakeLookup([{ address: '93.184.216.34', family: 4 }]) as never);
    guarded('api.seedance.com', {}, (err: Error | null, address?: string, family?: number) => {
      assert.equal(err, null);
      assert.equal(address, '93.184.216.34');
      assert.equal(family, 4);
      done();
    });
  });

  it('propagates DNS resolution errors', (_t, done) => {
    const guarded = makeGuardedLookup(fakeLookup(new Error('ENOTFOUND')) as never);
    guarded('nope.test', {}, (err: Error | null) => {
      assert.ok(err);
      assert.match(String(err?.message), /ENOTFOUND/);
      done();
    });
  });
});

describe('ssrfSafeFetch (wiring)', () => {
  function captureFetch() {
    const calls: Array<{ input: unknown; init: RequestInit }> = [];
    const fetchImpl = (async (input: unknown, init: RequestInit) => {
      calls.push({ input, init });
      return new Response('ok');
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  }

  it('disables redirect following and attaches the guarded dispatcher', async () => {
    const { calls, fetchImpl } = captureFetch();
    await ssrfSafeFetch('https://api.seedance.com/v1', {}, { fetchImpl });
    assert.equal(calls[0].init.redirect, 'error');
    assert.ok((calls[0].init as Record<string, unknown>).dispatcher, 'expected a dispatcher');
    assert.ok(calls[0].init.signal instanceof AbortSignal);
  });

  it('rejects a literal internal IP before making any request', async () => {
    const { calls, fetchImpl } = captureFetch();
    await assert.rejects(
      ssrfSafeFetch('https://10.0.0.1/x', {}, { fetchImpl }),
      (e: unknown) => (e as { code?: string })?.code === 'SSRF_BLOCKED'
    );
    assert.equal(calls.length, 0);
  });

  it('bypasses the dispatcher for hosts on SSRF_ALLOWED_HOSTS', async () => {
    const prev = process.env.SSRF_ALLOWED_HOSTS;
    process.env.SSRF_ALLOWED_HOSTS = 'proxy.internal';
    try {
      const { calls, fetchImpl } = captureFetch();
      await ssrfSafeFetch('https://proxy.internal/v1', {}, { fetchImpl });
      assert.equal((calls[0].init as Record<string, unknown>).dispatcher, undefined);
    } finally {
      process.env.SSRF_ALLOWED_HOSTS = prev;
    }
  });
});
