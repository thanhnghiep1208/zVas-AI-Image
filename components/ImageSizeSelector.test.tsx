import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageSizeSelector } from './ImageSizeSelector.tsx';

function buttonFor(html: string, size: string): string {
  const match = [...html.matchAll(/<button[^>]*>[\s\S]*?<\/button>/g)]
    .map((m) => m[0])
    .find((button) => button.includes(`>${size}</span>`));
  assert.ok(match, `button ${size} not rendered`);
  return match;
}

describe('ImageSizeSelector', () => {
  const html = renderToStaticMarkup(
    <ImageSizeSelector imageSize="1K" setImageSize={() => {}} unsupportedSizes={['512px']} />
  );

  it('disables unsupported sizes with an explanatory tooltip', () => {
    const button = buttonFor(html, '512px');
    assert.match(button, /\sdisabled=""/);
    assert.match(button, /title="Model đang chọn không hỗ trợ kích thước 512px"/);
  });

  it('keeps supported sizes clickable', () => {
    const button = buttonFor(html, '1K');
    assert.doesNotMatch(button, /\sdisabled=""/);
    assert.doesNotMatch(button, /title=/);
  });
});
