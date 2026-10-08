import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getImageSizeOptions, resolveSupportedImageSize } from './imageSizeOptions.ts';

describe('getImageSizeOptions', () => {
  it('lists the 4 sizes, all enabled when nothing is unsupported', () => {
    assert.deepEqual(getImageSizeOptions([]), [
      { size: '512px', disabled: false },
      { size: '1K', disabled: false },
      { size: '2K', disabled: false },
      { size: '4K', disabled: false },
    ]);
  });

  it('disables unsupported sizes only', () => {
    const options = getImageSizeOptions(['512px']);
    assert.deepEqual(
      options.filter((o) => o.disabled).map((o) => o.size),
      ['512px']
    );
  });
});

describe('resolveSupportedImageSize', () => {
  it('falls back to 1K when the current size is unsupported', () => {
    assert.equal(resolveSupportedImageSize('512px', ['512px']), '1K');
  });

  it('keeps a supported size', () => {
    assert.equal(resolveSupportedImageSize('2K', ['512px']), '2K');
    assert.equal(resolveSupportedImageSize('512px', []), '512px');
  });
});
