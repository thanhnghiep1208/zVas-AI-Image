import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import aiStyles from '../ai_styles.json' with { type: 'json' };
import { findAiStyleBySelection } from './styleLibrary.ts';
import {
  STYLE_GUIDE_ITEMS,
  filterStyleGuideItems,
  getStyleDisplayName,
  getStyleGuideCategories,
  isStyleGuideItemSelected,
} from './styleGuide.ts';

describe('STYLE_GUIDE_ITEMS', () => {
  it('lists every style of ai_styles.json in the same order', () => {
    assert.deepEqual(
      STYLE_GUIDE_ITEMS.map((item) => item.id),
      (aiStyles as Array<{ id: string }>).map((s) => s.id)
    );
  });

  it('uses the library category in the selection value', () => {
    const photo = STYLE_GUIDE_ITEMS.find((item) => item.id === 'photorealistic');
    assert.equal(photo?.category, 'Photography');
    assert.equal(photo?.value, 'Photography:Photorealistic');
  });

  it('every value maps back to its style prompt', () => {
    for (const item of STYLE_GUIDE_ITEMS) {
      assert.equal(findAiStyleBySelection(item.value)?.id, item.id, item.value);
    }
  });

  it('has a thumbnail file for every style', () => {
    for (const item of STYLE_GUIDE_ITEMS) {
      assert.ok(
        existsSync(new URL(`../assets/images/styles/${item.id}.webp`, import.meta.url)),
        `missing thumbnail for ${item.id}`
      );
    }
  });
});

describe('getStyleGuideCategories', () => {
  it('returns categories in first-appearance order with counts', () => {
    const categories = getStyleGuideCategories(STYLE_GUIDE_ITEMS);
    assert.deepEqual(categories.slice(0, 3), [
      { category: 'Photography', count: 2 },
      { category: 'Architecture', count: 1 },
      { category: '3D / CGI', count: 5 },
    ]);
    assert.equal(categories.reduce((sum, c) => sum + c.count, 0), STYLE_GUIDE_ITEMS.length);
  });
});

describe('filterStyleGuideItems', () => {
  it('returns everything without a category', () => {
    assert.equal(filterStyleGuideItems(STYLE_GUIDE_ITEMS, null).length, STYLE_GUIDE_ITEMS.length);
  });

  it('keeps only the chosen category', () => {
    const sciFi = filterStyleGuideItems(STYLE_GUIDE_ITEMS, 'Sci-Fi');
    assert.deepEqual(sciFi.map((item) => item.id), ['cyberpunk', 'synthwave']);
  });
});

describe('isStyleGuideItemSelected', () => {
  const photo = STYLE_GUIDE_ITEMS[0];

  it('matches the current value format', () => {
    assert.equal(isStyleGuideItemSelected(photo, 'Photography:Photorealistic'), true);
  });

  it('matches legacy values saved with the old categories', () => {
    assert.equal(isStyleGuideItemSelected(photo, 'Style:Photorealistic'), true);
  });

  it('is false for other styles or no selection', () => {
    assert.equal(isStyleGuideItemSelected(photo, 'Sci-Fi:Cyberpunk'), false);
    assert.equal(isStyleGuideItemSelected(photo, ''), false);
  });
});

describe('getStyleDisplayName', () => {
  it('shows the library name without the category', () => {
    assert.equal(getStyleDisplayName('Photography:Photorealistic'), 'Photorealistic');
    assert.equal(getStyleDisplayName('Style:3D Pixel'), '3D Pixel');
  });

  it('falls back to the part after the colon for unknown styles', () => {
    assert.equal(getStyleDisplayName('Custom:Vaporwave'), 'Vaporwave');
    assert.equal(getStyleDisplayName('Vaporwave'), 'Vaporwave');
  });

  it('is empty without a selection', () => {
    assert.equal(getStyleDisplayName(''), '');
  });
});
