import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateHttpsBaseUrl } from './validateBaseUrl.ts';

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
