import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageSizeSelector } from './ImageSizeSelector.tsx';

// File .test.ts (không phải .tsx): `npm test` (tsx --test) chỉ tự tìm *.test.ts.
describe('ImageSizeSelector', () => {
  const html = renderToStaticMarkup(
    createElement(ImageSizeSelector, { imageSize: '1K', setImageSize: () => {} })
  );
  const labels = [...html.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map((m) => m[1]);

  it('renders 1K, 2K and 4K buttons only', () => {
    assert.deepEqual(labels, ['1K', '2K', '4K']);
  });

  it('does not offer 512px', () => {
    assert.doesNotMatch(html, /512px/);
  });
});
