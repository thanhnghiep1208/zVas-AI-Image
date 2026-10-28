import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateHttpsBaseUrl, validateProviderBaseUrl } from './validateBaseUrl.ts';

describe('validateHttpsBaseUrl', () => {
  it('accepts a public https base URL', () => {
    const result = validateHttpsBaseUrl('https://api.seedance.com/v1', 'Seedance');
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.normalized, 'https://api.seedance.com/v1');
  });

  it('strips trailing slashes from the normalized URL', () => {
    const result = validateHttpsBaseUrl('https://api.seedream.ai/', 'Seedream');
    assert.equal(result.ok && result.normalized, 'https://api.seedream.ai');
  });

  it('rejects a malformed URL', () => {
    assert.equal(validateHttpsBaseUrl('not a url', 'Seedance').ok, false);
  });

  it('rejects non-https protocols', () => {
    assert.equal(validateHttpsBaseUrl('http://api.seedance.com', 'Seedance').ok, false);
  });

  it('rejects the cloud metadata endpoint (SSRF)', () => {
    assert.equal(validateHttpsBaseUrl('https://169.254.169.254/latest/meta-data', 'Seedance').ok, false);
  });

  it('rejects localhost (SSRF)', () => {
    assert.equal(validateHttpsBaseUrl('https://localhost/v1', 'Seedance').ok, false);
    assert.equal(validateHttpsBaseUrl('https://localhost:8443', 'Seedance').ok, false);
  });

  it('rejects loopback IP literals (SSRF)', () => {
    assert.equal(validateHttpsBaseUrl('https://127.0.0.1', 'Seedance').ok, false);
    assert.equal(validateHttpsBaseUrl('https://[::1]', 'Seedance').ok, false);
  });

  it('rejects private-network IPv4 ranges (SSRF)', () => {
    assert.equal(validateHttpsBaseUrl('https://10.0.0.5', 'Seedance').ok, false);
    assert.equal(validateHttpsBaseUrl('https://172.16.5.4', 'Seedance').ok, false);
    assert.equal(validateHttpsBaseUrl('https://192.168.1.10', 'Seedance').ok, false);
  });
});

describe('validateProviderBaseUrl', () => {
  it('accepts the default Seedance host', () => {
    const r = validateProviderBaseUrl('https://api.seedance.com/v1', 'seedance');
    assert.equal(r.ok && r.normalized, 'https://api.seedance.com/v1');
  });

  it('accepts Seedream byteplus regional hosts (suffix match)', () => {
    assert.equal(validateProviderBaseUrl('https://ark.ap-southeast.bytepluses.com/api/v3', 'seedream').ok, true);
    assert.equal(validateProviderBaseUrl('https://ark.cn-beijing.bytepluses.com/api/v3', 'seedream').ok, true);
  });

  // Finding 1: base URL do người dùng gửi không được trỏ ra host lạ, vì server
  // gắn kèm API key thật trong header Authorization → rò khóa nếu host là của attacker.
  it('rejects an attacker-controlled external host for Seedance', () => {
    const r = validateProviderBaseUrl('https://evil.example.com/v1', 'seedance');
    assert.equal(r.ok, false);
  });

  it('rejects a host that only looks like the provider domain', () => {
    assert.equal(validateProviderBaseUrl('https://api.seedance.com.evil.net/v1', 'seedance').ok, false);
    assert.equal(validateProviderBaseUrl('https://bytepluses.com.attacker.net/x', 'seedream').ok, false);
    assert.equal(validateProviderBaseUrl('https://notbytepluses.com/x', 'seedream').ok, false);
  });

  it('still blocks internal/SSRF targets even if somehow allowlisted shape', () => {
    assert.equal(validateProviderBaseUrl('https://127.0.0.1/v1', 'seedance').ok, false);
    assert.equal(validateProviderBaseUrl('http://api.seedance.com/v1', 'seedance').ok, false);
  });

  it('honors a host added through the per-provider env allowlist', () => {
    const prev = process.env.SEEDANCE_ALLOWED_HOSTS;
    process.env.SEEDANCE_ALLOWED_HOSTS = 'proxy.mycorp.com';
    try {
      assert.equal(validateProviderBaseUrl('https://proxy.mycorp.com/v1', 'seedance').ok, true);
    } finally {
      if (prev === undefined) delete process.env.SEEDANCE_ALLOWED_HOSTS;
      else process.env.SEEDANCE_ALLOWED_HOSTS = prev;
    }
  });
});
