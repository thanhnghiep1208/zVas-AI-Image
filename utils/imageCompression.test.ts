import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTargetDimensions,
  shouldCompressImage,
  UPLOAD_MAX_EDGE_PX,
  UPLOAD_COMPRESS_MIN_BYTES,
} from './imageCompression.ts';

describe('computeTargetDimensions', () => {
  it('keeps images already within the max edge', () => {
    assert.deepEqual(computeTargetDimensions(1600, 900, UPLOAD_MAX_EDGE_PX), { width: 1600, height: 900 });
  });

  it('scales landscape images down by the long edge, keeping aspect ratio', () => {
    assert.deepEqual(computeTargetDimensions(4096, 2304, 2048), { width: 2048, height: 1152 });
  });

  it('scales portrait images down by the long edge', () => {
    assert.deepEqual(computeTargetDimensions(3000, 4000, 2048), { width: 1536, height: 2048 });
  });

  it('never returns a zero dimension for extreme aspect ratios', () => {
    const { width, height } = computeTargetDimensions(20000, 5, 2048);
    assert.equal(width, 2048);
    assert.equal(height, 1);
  });
});

describe('shouldCompressImage', () => {
  it('skips small images within the max edge', () => {
    assert.equal(shouldCompressImage({ bytes: 200 * 1024, width: 1024, height: 1024 }), false);
  });

  it('compresses heavy files even when dimensions are small', () => {
    assert.equal(
      shouldCompressImage({ bytes: UPLOAD_COMPRESS_MIN_BYTES + 1, width: 1024, height: 1024 }),
      true
    );
  });

  it('compresses oversized dimensions even when the file is light', () => {
    assert.equal(shouldCompressImage({ bytes: 300 * 1024, width: 6000, height: 4000 }), true);
  });
});
