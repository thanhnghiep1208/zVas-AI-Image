import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GEMINI_NANO_BANANA_2,
  GEMINI_NANO_BANANA_2_1,
  GEMINI_NANO_BANANA_PRO,
} from '../constants/aiModels.ts';
import type { AdminSettingsSnapshot } from '../components/admin/types.ts';
import { buildGlobalSettingsPayload, GLOBAL_SETTINGS_WRITE_KEYS } from './adminSettingsPayload.ts';

const NOW = new Date('2026-10-08T00:00:00.000Z');

function snapshot(geminiModel: string): AdminSettingsSnapshot {
  return {
    seedanceBaseUrl: '',
    seedreamBaseUrl: '',
    geminiModel,
    seedanceModel: 'seed-1.5-pro',
    seedreamModel: 'seedream-5-0-260128',
    enabledProviders: ['gemini'],
  };
}

describe('buildGlobalSettingsPayload', () => {
  it('turns rollback on when admin picks Nano Banana 2', () => {
    assert.equal(buildGlobalSettingsPayload(snapshot(GEMINI_NANO_BANANA_2), NOW).geminiFlashRollback, true);
  });

  it('turns rollback off for 2.1 and Pro', () => {
    for (const model of [GEMINI_NANO_BANANA_2_1, GEMINI_NANO_BANANA_PRO]) {
      assert.equal(buildGlobalSettingsPayload(snapshot(model), NOW).geminiFlashRollback, false);
    }
  });

  it('stamps updatedAt as ISO string', () => {
    assert.equal(buildGlobalSettingsPayload(snapshot(GEMINI_NANO_BANANA_2_1), NOW).updatedAt, NOW.toISOString());
  });

  it('keeps the normalized settings', () => {
    const payload = buildGlobalSettingsPayload(snapshot(GEMINI_NANO_BANANA_PRO), NOW);
    assert.equal(payload.geminiModel, GEMINI_NANO_BANANA_PRO);
    assert.deepEqual(payload.enabledProviders, ['gemini']);
  });

  it('writes only keys listed in GLOBAL_SETTINGS_WRITE_KEYS', () => {
    const keys = Object.keys(buildGlobalSettingsPayload(snapshot(GEMINI_NANO_BANANA_2), NOW));
    for (const key of keys) {
      assert.ok(GLOBAL_SETTINGS_WRITE_KEYS.includes(key), `unexpected key ${key}`);
    }
  });
});
