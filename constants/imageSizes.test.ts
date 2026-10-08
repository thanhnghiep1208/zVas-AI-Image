import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IMAGE_SIZES, normalizeImageSize } from './imageSizes.ts';

describe('IMAGE_SIZES', () => {
  it('offers 1K, 2K and 4K only (512px removed)', () => {
    assert.deepEqual(IMAGE_SIZES, ['1K', '2K', '4K']);
  });
});

describe('normalizeImageSize', () => {
  it('keeps supported sizes', () => {
    for (const size of ['1K', '2K', '4K']) assert.equal(normalizeImageSize(size), size);
  });

  it('maps legacy 512px, unknown and missing sizes to 1K', () => {
    for (const size of ['512px', 'bogus', '', undefined, null]) assert.equal(normalizeImageSize(size), '1K');
  });
});
