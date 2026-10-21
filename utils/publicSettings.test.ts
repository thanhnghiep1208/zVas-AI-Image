import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOGIN_CONTACT_MAX_LENGTH,
  PUBLIC_SETTINGS_WRITE_KEYS,
  buildPublicSettingsPayload,
  normalizeLoginContactText,
} from './publicSettings.ts';

const NOW = new Date('2026-10-21T00:00:00.000Z');

describe('normalizeLoginContactText', () => {
  it('returns empty string for non-string values', () => {
    assert.equal(normalizeLoginContactText(undefined), '');
    assert.equal(normalizeLoginContactText(null), '');
    assert.equal(normalizeLoginContactText(42), '');
  });

  it('trims surrounding whitespace and each line, drops blank lines at edges', () => {
    assert.equal(normalizeLoginContactText('  \n Email: a@b.c  \n Zalo: 0900 \n\n'), 'Email: a@b.c\nZalo: 0900');
  });

  it('normalizes CRLF line endings', () => {
    assert.equal(normalizeLoginContactText('a\r\nb'), 'a\nb');
  });

  it('caps length at LOGIN_CONTACT_MAX_LENGTH', () => {
    assert.equal(normalizeLoginContactText('x'.repeat(LOGIN_CONTACT_MAX_LENGTH + 50)).length, LOGIN_CONTACT_MAX_LENGTH);
  });
});

describe('buildPublicSettingsPayload', () => {
  it('normalizes text and stamps updatedAt', () => {
    const payload = buildPublicSettingsPayload('  Liên hệ admin  ', NOW);
    assert.equal(payload.loginContactText, 'Liên hệ admin');
    assert.equal(payload.updatedAt, NOW.toISOString());
  });

  it('writes only keys listed in PUBLIC_SETTINGS_WRITE_KEYS', () => {
    for (const key of Object.keys(buildPublicSettingsPayload('x', NOW))) {
      assert.ok(PUBLIC_SETTINGS_WRITE_KEYS.includes(key), `unexpected key ${key}`);
    }
  });
});
