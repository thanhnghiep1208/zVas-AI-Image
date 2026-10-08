import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_GEMINI_MODEL_IDS,
  GEMINI_ADMIN_MODEL_OPTIONS,
  GEMINI_MODEL_FALLBACK,
  GEMINI_NANO_BANANA_2,
  GEMINI_NANO_BANANA_2_1,
  GEMINI_NANO_BANANA_PRO,
  getActiveGeminiFlashModel,
  getAdminGeminiModel,
  getEnabledModelOptions,
  getUnsupportedImageSizes,
  normalizeGeminiModelId,
  resolveGeminiRequestModel,
  resolveModelKey,
} from './aiModels.ts';

describe('Gemini model ids', () => {
  it('uses Nano Banana 2.1 as fallback', () => {
    assert.equal(GEMINI_NANO_BANANA_2_1, 'gemini-nano-banana-2.1');
    assert.equal(GEMINI_MODEL_FALLBACK, GEMINI_NANO_BANANA_2_1);
  });

  it('allows 2.1, legacy Nano Banana 2 and Pro', () => {
    assert.deepEqual(
      [...ALLOWED_GEMINI_MODEL_IDS].sort(),
      [GEMINI_NANO_BANANA_2_1, GEMINI_NANO_BANANA_2, GEMINI_NANO_BANANA_PRO].sort()
    );
  });

  it('admin options list 2.1 first, then Pro, then legacy Nano Banana 2', () => {
    assert.deepEqual(
      GEMINI_ADMIN_MODEL_OPTIONS.map((o) => o.value),
      [GEMINI_NANO_BANANA_2_1, GEMINI_NANO_BANANA_PRO, GEMINI_NANO_BANANA_2]
    );
  });
});

describe('normalizeGeminiModelId', () => {
  it('keeps every allowed id', () => {
    for (const id of ALLOWED_GEMINI_MODEL_IDS) {
      assert.equal(normalizeGeminiModelId(id), id);
    }
  });

  it('falls back to 2.1 for unknown or empty ids', () => {
    for (const id of ['gemini-2.5-flash-image', '', null, undefined]) {
      assert.equal(normalizeGeminiModelId(id), GEMINI_NANO_BANANA_2_1);
    }
  });
});

describe('getActiveGeminiFlashModel', () => {
  it('returns legacy Nano Banana 2 when admin rolled back', () => {
    assert.equal(getActiveGeminiFlashModel(GEMINI_NANO_BANANA_2), GEMINI_NANO_BANANA_2);
  });

  it('returns 2.1 otherwise', () => {
    for (const admin of [GEMINI_NANO_BANANA_2_1, GEMINI_NANO_BANANA_PRO, undefined, null, 'bogus']) {
      assert.equal(getActiveGeminiFlashModel(admin), GEMINI_NANO_BANANA_2_1);
    }
  });
});

describe('getEnabledModelOptions (gemini)', () => {
  it('shows 2.1 then Pro, without legacy Nano Banana 2', () => {
    const options = getEnabledModelOptions(['gemini']);
    assert.deepEqual(
      options.map((o) => o.value),
      [GEMINI_NANO_BANANA_2_1, GEMINI_NANO_BANANA_PRO]
    );
    assert.equal(options[0].label, 'Nano Banana 2.1');
    assert.equal(options[0].key, `gemini:${GEMINI_NANO_BANANA_2_1}`);
  });

  it('swaps 2.1 for Nano Banana 2 while rolled back', () => {
    const options = getEnabledModelOptions(['gemini'], GEMINI_NANO_BANANA_2);
    assert.deepEqual(
      options.map((o) => o.value),
      [GEMINI_NANO_BANANA_2, GEMINI_NANO_BANANA_PRO]
    );
    assert.equal(options[0].label, 'Nano Banana 2');
  });
});

describe('resolveModelKey', () => {
  it('defaults to 2.1 without preference', () => {
    assert.equal(resolveModelKey(['gemini'], null).value, GEMINI_NANO_BANANA_2_1);
  });

  it('maps legacy Nano Banana 2 preference to 2.1', () => {
    assert.equal(
      resolveModelKey(['gemini'], `gemini:${GEMINI_NANO_BANANA_2}`).value,
      GEMINI_NANO_BANANA_2_1
    );
  });

  it('keeps Pro preference', () => {
    assert.equal(
      resolveModelKey(['gemini'], `gemini:${GEMINI_NANO_BANANA_PRO}`).value,
      GEMINI_NANO_BANANA_PRO
    );
    assert.equal(
      resolveModelKey(['gemini'], `gemini:${GEMINI_NANO_BANANA_PRO}`, GEMINI_NANO_BANANA_2).value,
      GEMINI_NANO_BANANA_PRO
    );
  });

  it('maps 2.1 preference to Nano Banana 2 while rolled back', () => {
    assert.equal(
      resolveModelKey(['gemini'], `gemini:${GEMINI_NANO_BANANA_2_1}`, GEMINI_NANO_BANANA_2).value,
      GEMINI_NANO_BANANA_2
    );
  });

  it('maps legacy Nano Banana 2 preference to 2.1 even when another provider is listed first', () => {
    assert.equal(
      resolveModelKey(['openai', 'gemini'], `gemini:${GEMINI_NANO_BANANA_2}`).key,
      `gemini:${GEMINI_NANO_BANANA_2_1}`
    );
  });

  it('maps 2.1 preference to Nano Banana 2 during rollback even when another provider is listed first', () => {
    assert.equal(
      resolveModelKey(['openai', 'gemini'], `gemini:${GEMINI_NANO_BANANA_2_1}`, GEMINI_NANO_BANANA_2).key,
      `gemini:${GEMINI_NANO_BANANA_2}`
    );
  });

  it('keeps non-gemini preferences untouched', () => {
    assert.equal(
      resolveModelKey(['gemini', 'openai'], 'openai:dall-e-3').key,
      'openai:dall-e-3'
    );
  });
});

describe('getUnsupportedImageSizes', () => {
  it('marks 512px unsupported for 2.1', () => {
    assert.deepEqual(getUnsupportedImageSizes(GEMINI_NANO_BANANA_2_1), ['512px']);
  });

  it('marks 512px unsupported for Pro (API returns 400)', () => {
    assert.deepEqual(getUnsupportedImageSizes(GEMINI_NANO_BANANA_PRO), ['512px']);
  });

  it('allows every size for Nano Banana 2 and non-gemini models', () => {
    assert.deepEqual(getUnsupportedImageSizes(GEMINI_NANO_BANANA_2), []);
    assert.deepEqual(getUnsupportedImageSizes('dall-e-3'), []);
  });
});

describe('resolveGeminiRequestModel', () => {
  it('uses the active Flash model when request has no model', () => {
    assert.equal(resolveGeminiRequestModel(undefined, undefined), GEMINI_NANO_BANANA_2_1);
    assert.equal(resolveGeminiRequestModel(undefined, GEMINI_NANO_BANANA_2), GEMINI_NANO_BANANA_2);
  });

  it('uses admin Pro when request has no model', () => {
    assert.equal(resolveGeminiRequestModel(undefined, GEMINI_NANO_BANANA_PRO), GEMINI_NANO_BANANA_PRO);
  });
});

describe('getAdminGeminiModel', () => {
  it('treats legacy stored Nano Banana 2 (no rollback flag) as 2.1', () => {
    assert.equal(getAdminGeminiModel({ geminiModel: GEMINI_NANO_BANANA_2 }), GEMINI_NANO_BANANA_2_1);
    assert.equal(
      getAdminGeminiModel({ geminiModel: GEMINI_NANO_BANANA_2, geminiFlashRollback: false }),
      GEMINI_NANO_BANANA_2_1
    );
  });

  it('keeps Nano Banana 2 only when rollback flag is explicitly true', () => {
    assert.equal(
      getAdminGeminiModel({ geminiModel: GEMINI_NANO_BANANA_2, geminiFlashRollback: true }),
      GEMINI_NANO_BANANA_2
    );
  });

  it('keeps 2.1 and Pro, normalizes missing/unknown to 2.1', () => {
    assert.equal(getAdminGeminiModel({ geminiModel: GEMINI_NANO_BANANA_PRO }), GEMINI_NANO_BANANA_PRO);
    assert.equal(getAdminGeminiModel({ geminiModel: GEMINI_NANO_BANANA_2_1 }), GEMINI_NANO_BANANA_2_1);
    assert.equal(getAdminGeminiModel({ geminiModel: 'bogus' }), GEMINI_NANO_BANANA_2_1);
    assert.equal(getAdminGeminiModel(null), GEMINI_NANO_BANANA_2_1);
  });

  it('legacy settings resolve to 2.1 in the user dropdown', () => {
    const admin = getAdminGeminiModel({ geminiModel: GEMINI_NANO_BANANA_2 });
    assert.equal(getEnabledModelOptions(['gemini'], admin)[0].value, GEMINI_NANO_BANANA_2_1);
  });
});

describe('GA model ids (preview ids migrated)', () => {
  const PRO_PREVIEW = 'gemini-3-pro-image-preview';
  const NB2_PREVIEW = 'gemini-3.1-flash-image-preview';

  it('uses GA ids for Pro and Nano Banana 2', () => {
    assert.equal(GEMINI_NANO_BANANA_PRO, 'gemini-3-pro-image');
    assert.equal(GEMINI_NANO_BANANA_2, 'gemini-3.1-flash-image');
  });

  it('normalizes stored preview ids to GA ids', () => {
    assert.equal(normalizeGeminiModelId(PRO_PREVIEW), GEMINI_NANO_BANANA_PRO);
    assert.equal(normalizeGeminiModelId(NB2_PREVIEW), GEMINI_NANO_BANANA_2);
  });

  it('keeps a saved Pro preview preference as Pro', () => {
    assert.equal(resolveModelKey(['gemini'], `gemini:${PRO_PREVIEW}`).value, GEMINI_NANO_BANANA_PRO);
  });

  it('maps a saved Nano Banana 2 preview preference to the active Flash model', () => {
    assert.equal(resolveModelKey(['gemini'], `gemini:${NB2_PREVIEW}`).value, GEMINI_NANO_BANANA_2_1);
  });

  it('honours admin settings stored with preview ids', () => {
    assert.equal(getAdminGeminiModel({ geminiModel: PRO_PREVIEW }), GEMINI_NANO_BANANA_PRO);
    assert.equal(getAdminGeminiModel({ geminiModel: NB2_PREVIEW }), GEMINI_NANO_BANANA_2_1);
    assert.equal(
      getAdminGeminiModel({ geminiModel: NB2_PREVIEW, geminiFlashRollback: true }),
      GEMINI_NANO_BANANA_2
    );
  });

  it('routes stale-tab requests with preview ids to GA ids', () => {
    assert.equal(resolveGeminiRequestModel(PRO_PREVIEW, undefined), GEMINI_NANO_BANANA_PRO);
    assert.equal(resolveGeminiRequestModel(NB2_PREVIEW, undefined), GEMINI_NANO_BANANA_2_1);
  });
});
