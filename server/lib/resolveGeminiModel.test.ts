import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GEMINI_NANO_BANANA_2,
  GEMINI_NANO_BANANA_2_1,
  GEMINI_NANO_BANANA_PRO,
} from '../../constants/aiModels.ts';
import { resolveGeminiImageSize, resolveGeminiModel } from './resolveGeminiModel.ts';

describe('resolveGeminiModel', () => {
  it('keeps Pro', () => {
    assert.equal(
      resolveGeminiModel({ requestedModel: GEMINI_NANO_BANANA_PRO, adminGeminiModel: GEMINI_NANO_BANANA_2 }),
      GEMINI_NANO_BANANA_PRO
    );
  });

  it('keeps 2.1 when not rolled back', () => {
    assert.equal(
      resolveGeminiModel({ requestedModel: GEMINI_NANO_BANANA_2_1, adminGeminiModel: GEMINI_NANO_BANANA_2_1 }),
      GEMINI_NANO_BANANA_2_1
    );
  });

  it('routes 2.1 to Nano Banana 2 while rolled back', () => {
    assert.equal(
      resolveGeminiModel({ requestedModel: GEMINI_NANO_BANANA_2_1, adminGeminiModel: GEMINI_NANO_BANANA_2 }),
      GEMINI_NANO_BANANA_2
    );
  });

  it('routes legacy Nano Banana 2 to 2.1 when not rolled back', () => {
    assert.equal(
      resolveGeminiModel({ requestedModel: GEMINI_NANO_BANANA_2, adminGeminiModel: undefined }),
      GEMINI_NANO_BANANA_2_1
    );
  });

  it('falls back to the active Flash model for unknown or missing ids', () => {
    for (const requestedModel of ['gemini-2.5-flash-image', '', undefined]) {
      assert.equal(resolveGeminiModel({ requestedModel, adminGeminiModel: undefined }), GEMINI_NANO_BANANA_2_1);
      assert.equal(
        resolveGeminiModel({ requestedModel, adminGeminiModel: GEMINI_NANO_BANANA_2 }),
        GEMINI_NANO_BANANA_2
      );
    }
  });

  it('uses admin Pro default when request has no model', () => {
    assert.equal(
      resolveGeminiModel({ requestedModel: undefined, adminGeminiModel: GEMINI_NANO_BANANA_PRO }),
      GEMINI_NANO_BANANA_PRO
    );
  });
});

describe('resolveGeminiImageSize', () => {
  it('upgrades 512px to 1K for 2.1 (unsupported by the API)', () => {
    assert.equal(resolveGeminiImageSize(GEMINI_NANO_BANANA_2_1, '512px'), '1K');
  });

  it('keeps supported sizes for 2.1', () => {
    for (const size of ['1K', '2K', '4K']) {
      assert.equal(resolveGeminiImageSize(GEMINI_NANO_BANANA_2_1, size), size);
    }
  });

  it('keeps 512px for Nano Banana 2', () => {
    assert.equal(resolveGeminiImageSize(GEMINI_NANO_BANANA_2, '512px'), '512px');
  });

  it('defaults to 1K when size is missing', () => {
    assert.equal(resolveGeminiImageSize(GEMINI_NANO_BANANA_2_1, undefined), '1K');
  });
});
