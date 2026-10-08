import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { GeneratedImage } from '../types.ts';
import { mapGenerateResponse, sumGenerationUsage } from './generationUsage.ts';

describe('mapGenerateResponse', () => {
  it('maps image, text and all token counts from the API response', () => {
    assert.deepEqual(
      mapGenerateResponse('a cat', {
        imageBase64: 'AAA',
        text: 'note',
        promptTokens: 9,
        completionTokens: 1337,
        thinkingTokens: 619,
        totalTokens: 1965,
      }),
      {
        prompt: 'a cat',
        imageUrl: 'data:image/png;base64,AAA',
        text: 'note',
        promptTokens: 9,
        completionTokens: 1337,
        thinkingTokens: 619,
        totalTokens: 1965,
      }
    );
  });

  it('defaults missing text and token counts to empty/0', () => {
    const image = mapGenerateResponse('a cat', { imageBase64: 'AAA' });
    assert.equal(image.text, '');
    assert.equal(image.promptTokens, 0);
    assert.equal(image.completionTokens, 0);
    assert.equal(image.thinkingTokens, 0);
    assert.equal(image.totalTokens, 0);
  });
});

describe('sumGenerationUsage', () => {
  const ok = (n: number): GeneratedImage => ({
    prompt: 'p',
    imageUrl: 'data:image/png;base64,AAA',
    promptTokens: n,
    completionTokens: 10 * n,
    thinkingTokens: 100 * n,
    totalTokens: 111 * n,
  });

  it('sums every token type across successful images', () => {
    assert.deepEqual(sumGenerationUsage([ok(1), ok(2)]), {
      promptTokens: 3,
      completionTokens: 30,
      thinkingTokens: 300,
      totalTokens: 333,
    });
  });

  it('ignores failed images', () => {
    const failed: GeneratedImage = { ...ok(5), imageUrl: 'error' };
    assert.deepEqual(sumGenerationUsage([ok(1), failed]), sumGenerationUsage([ok(1)]));
  });

  it('treats missing counts as 0', () => {
    assert.deepEqual(sumGenerationUsage([{ prompt: 'p', imageUrl: 'x' }]), {
      promptTokens: 0,
      completionTokens: 0,
      thinkingTokens: 0,
      totalTokens: 0,
    });
  });
});
