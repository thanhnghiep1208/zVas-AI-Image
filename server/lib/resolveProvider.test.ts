import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveProviderFromSettings } from './resolveProvider.ts';

describe('resolveProviderFromSettings', () => {
  // Tương thích ngược: khi admin CHƯA cấu hình enabledProviders (rỗng/thiếu/toàn
  // giá trị rác), không giới hạn — tôn trọng provider người dùng chọn.
  it('honors a valid requested provider when no allowlist is configured', () => {
    assert.equal(resolveProviderFromSettings('seedream', undefined), 'seedream');
    assert.equal(resolveProviderFromSettings('seedance', []), 'seedance');
    assert.equal(resolveProviderFromSettings('openai', ['bogus']), 'openai');
  });

  it('falls back to gemini with no allowlist and no valid request', () => {
    assert.equal(resolveProviderFromSettings(undefined, undefined), 'gemini');
    assert.equal(resolveProviderFromSettings('not-a-provider', []), 'gemini');
  });

  // Finding 3: enabledProviders phải được thực thi. Provider admin đã "tắt"
  // không được dùng dù user yêu cầu đích danh.
  it('rejects a requested provider that is not in a non-empty allowlist', () => {
    assert.equal(resolveProviderFromSettings('seedance', ['seedream']), 'seedream');
    assert.equal(resolveProviderFromSettings('openai', ['gemini']), 'gemini');
  });

  it('honors a requested provider that IS in the allowlist', () => {
    assert.equal(resolveProviderFromSettings('gemini', ['seedream', 'gemini']), 'gemini');
    assert.equal(resolveProviderFromSettings('seedream', ['seedream', 'gemini']), 'seedream');
  });

  it('falls back to the first enabled provider when nothing valid is requested', () => {
    assert.equal(resolveProviderFromSettings(undefined, ['seedream', 'gemini']), 'seedream');
    assert.equal(resolveProviderFromSettings('not-a-provider', ['openai']), 'openai');
  });

  it('ignores invalid entries inside the allowlist', () => {
    // ['bogus', 'seedream'] → allowlist hợp lệ = ['seedream'] → seedance bị chặn.
    assert.equal(resolveProviderFromSettings('seedance', ['bogus', 'seedream']), 'seedream');
  });
});
