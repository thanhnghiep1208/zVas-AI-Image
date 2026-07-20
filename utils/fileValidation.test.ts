import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAcceptedImageFile,
  isWithinImageSizeLimit,
  formatFileSize,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from './fileValidation.ts';

function fileOfType(type: string): File {
  return new File([new Uint8Array([1, 2, 3])], 'upload', { type });
}

function fileOfSize(bytes: number): File {
  return new File([new Uint8Array(bytes)], 'upload', { type: 'image/png' });
}

describe('isAcceptedImageFile', () => {
  it('accepts png, jpeg, and webp images', () => {
    assert.equal(isAcceptedImageFile(fileOfType('image/png')), true);
    assert.equal(isAcceptedImageFile(fileOfType('image/jpeg')), true);
    assert.equal(isAcceptedImageFile(fileOfType('image/webp')), true);
  });

  it('rejects svg to prevent script-carrying uploads', () => {
    assert.equal(isAcceptedImageFile(fileOfType('image/svg+xml')), false);
  });

  it('rejects gif which is outside the allowlist', () => {
    assert.equal(isAcceptedImageFile(fileOfType('image/gif')), false);
  });

  it('rejects non-image files', () => {
    assert.equal(isAcceptedImageFile(fileOfType('application/pdf')), false);
  });

  it('rejects files with an empty MIME type', () => {
    assert.equal(isAcceptedImageFile(fileOfType('')), false);
  });
});

describe('isWithinImageSizeLimit', () => {
  it('accepts a file at exactly the limit', () => {
    assert.equal(isWithinImageSizeLimit(fileOfSize(MAX_IMAGE_FILE_SIZE_BYTES)), true);
  });

  it('accepts a small file', () => {
    assert.equal(isWithinImageSizeLimit(fileOfSize(1024)), true);
  });

  it('rejects a file over the limit', () => {
    assert.equal(isWithinImageSizeLimit(fileOfSize(MAX_IMAGE_FILE_SIZE_BYTES + 1)), false);
  });
});

describe('formatFileSize', () => {
  it('formats megabytes with one decimal', () => {
    assert.equal(formatFileSize(8 * 1024 * 1024 + 512 * 1024), '8.5 MB');
  });

  it('formats sub-megabyte sizes in KB', () => {
    assert.equal(formatFileSize(512 * 1024), '512 KB');
  });
});
