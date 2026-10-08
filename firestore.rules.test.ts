import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLOBAL_SETTINGS_WRITE_KEYS } from './utils/adminSettingsPayload.ts';

/**
 * Kiểm tra tĩnh: mọi key app ghi vào `settings/global` phải có trong
 * `isSafeGlobalSettings()` → `keys().hasOnly([...])`, nếu không Admin không lưu được Settings.
 * Không test hành vi rules thật (cần Firestore emulator + Java + @firebase/rules-unit-testing).
 */
function readGlobalSettingsAllowedKeys(): string[] {
  const rules = readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');
  const fn = rules.match(/function isSafeGlobalSettings\(\)\s*\{[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/);
  assert.ok(fn, 'isSafeGlobalSettings() with hasOnly([...]) not found in firestore.rules');
  return [...fn[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('firestore.rules settings/global', () => {
  it('allows every key the app writes', () => {
    const allowed = readGlobalSettingsAllowedKeys();
    const missing = GLOBAL_SETTINGS_WRITE_KEYS.filter((key) => !allowed.includes(key));
    assert.deepEqual(missing, [], `firestore.rules is missing keys: ${missing.join(', ')}`);
  });
});
