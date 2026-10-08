import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GEMINI_NANO_BANANA_2,
  GEMINI_NANO_BANANA_2_1,
  GEMINI_NANO_BANANA_PRO,
} from '../../constants/aiModels.ts';
import { buildGeminiImageConfig, buildGeminiUsage } from './geminiResponse.ts';

describe('buildGeminiImageConfig', () => {
  it('defaults to 1:1 and 1K', () => {
    assert.deepEqual(buildGeminiImageConfig({ model: GEMINI_NANO_BANANA_2_1 }), {
      aspectRatio: '1:1',
      imageSize: '1K',
    });
  });

  it('keeps requested aspect ratio and supported size', () => {
    assert.deepEqual(
      buildGeminiImageConfig({ model: GEMINI_NANO_BANANA_2_1, aspectRatio: '16:9', imageSize: '4K' }),
      { aspectRatio: '16:9', imageSize: '4K' }
    );
  });

  it('upgrades 512px to 1K for 2.1 and Pro', () => {
    for (const model of [GEMINI_NANO_BANANA_2_1, GEMINI_NANO_BANANA_PRO]) {
      assert.equal(buildGeminiImageConfig({ model, imageSize: '512px' }).imageSize, '1K');
    }
  });

  it('keeps 512px for Nano Banana 2', () => {
    assert.equal(buildGeminiImageConfig({ model: GEMINI_NANO_BANANA_2, imageSize: '512px' }).imageSize, '512px');
  });
});

describe('buildGeminiUsage', () => {
  // Số liệu thật từ gemini-nano-banana-2.1 (2026-10-08).
  const REAL_USAGE = {
    promptTokenCount: 9,
    candidatesTokenCount: 1337,
    thoughtsTokenCount: 619,
    totalTokenCount: 1965,
  };

  it('maps prompt, completion, thinking and total tokens', () => {
    assert.deepEqual(buildGeminiUsage(REAL_USAGE), {
      promptTokens: 9,
      completionTokens: 1337,
      thinkingTokens: 619,
      totalTokens: 1965,
    });
  });

  it('sums prompt + completion + thinking when totalTokenCount is missing', () => {
    const { totalTokenCount: _ignored, ...withoutTotal } = REAL_USAGE;
    assert.equal(buildGeminiUsage(withoutTotal).totalTokens, 9 + 1337 + 619);
  });

  it('returns zeros when usage metadata is missing', () => {
    assert.deepEqual(buildGeminiUsage(undefined), {
      promptTokens: 0,
      completionTokens: 0,
      thinkingTokens: 0,
      totalTokens: 0,
    });
  });
});
