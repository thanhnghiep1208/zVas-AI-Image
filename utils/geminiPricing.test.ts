import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GEMINI_NANO_BANANA_2,
  GEMINI_NANO_BANANA_2_1,
  GEMINI_NANO_BANANA_PRO,
} from '../constants/aiModels.ts';
import { estimateGeminiCost, resolveGeminiImagePricing } from './geminiPricing.ts';

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

describe('resolveGeminiImagePricing', () => {
  it('returns Nano Banana 2.1 pricing', () => {
    const p = resolveGeminiImagePricing(GEMINI_NANO_BANANA_2_1);
    assert.equal(p.inputPerMillion, 1.5);
    assert.equal(p.outputPerMillion, 30);
    assert.equal(p.thinkingOutputPerMillion, 7.5);
    assert.deepEqual(p.perImageFallback, { '1K': 0.0336, '2K': 0.0504, '4K': 0.113 });
  });

  it('returns Nano Banana 2 pricing', () => {
    const p = resolveGeminiImagePricing(GEMINI_NANO_BANANA_2);
    assert.equal(p.inputPerMillion, 0.5);
    assert.equal(p.outputPerMillion, 60);
    assert.equal(p.perImageFallback['1K'], 0.0672);
  });

  it('returns Nano Banana Pro pricing', () => {
    const p = resolveGeminiImagePricing(GEMINI_NANO_BANANA_PRO);
    assert.equal(p.inputPerMillion, 2);
    assert.equal(p.outputPerMillion, 120);
    assert.equal(p.perImageFallback['4K'], 0.24);
  });

  it('prices legacy preview ids like their GA model', () => {
    assert.deepEqual(
      resolveGeminiImagePricing('gemini-3-pro-image-preview'),
      resolveGeminiImagePricing(GEMINI_NANO_BANANA_PRO)
    );
    assert.deepEqual(
      resolveGeminiImagePricing('gemini-3.1-flash-image-preview'),
      resolveGeminiImagePricing(GEMINI_NANO_BANANA_2)
    );
  });

  it('uses fallback model (2.1) pricing for unknown ids', () => {
    assert.deepEqual(
      resolveGeminiImagePricing('gemini-unknown-image'),
      resolveGeminiImagePricing(GEMINI_NANO_BANANA_2_1)
    );
  });
});

describe('estimateGeminiCost', () => {
  it('prices prompt, image output and thinking tokens separately for 2.1', () => {
    const cost = estimateGeminiCost({
      model: GEMINI_NANO_BANANA_2_1,
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      thinkingTokens: 1_000_000,
      imageCount: 1,
      imageSize: '1K',
    });
    close(cost, 1.5 + 30 + 7.5);
  });

  it('ignores thinking tokens when the model has no thinking price (Pro)', () => {
    const cost = estimateGeminiCost({
      model: GEMINI_NANO_BANANA_PRO,
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      thinkingTokens: 1_000_000,
      imageCount: 1,
      imageSize: '1K',
    });
    close(cost, 2 + 120);
  });

  it('falls back to per-image price when token usage is missing', () => {
    const cost = estimateGeminiCost({
      model: GEMINI_NANO_BANANA_2_1,
      promptTokens: 0,
      completionTokens: 0,
      thinkingTokens: 0,
      imageCount: 3,
      imageSize: '2K',
    });
    close(cost, 3 * 0.0504);
  });
});
