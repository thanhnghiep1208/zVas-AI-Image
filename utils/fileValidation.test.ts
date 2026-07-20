import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAcceptedImageFile } from './fileValidation.ts';

function fileOfType(type: string): File {
  return new File([new Uint8Array([1, 2, 3])], 'upload', { type });
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
