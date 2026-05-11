import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinalPrompts } from './buildGenerationPrompts';

test('maps selected style from library to ai_styles prompt payload', () => {
  const [result] = buildFinalPrompts({
    activePrompts: ['portrait of a girl'],
    selectedStyle: 'Illustration:Anime',
    backgroundStyle: 'none',
    outlineType: 'none',
    outlineThickness: 'normal',
    promptOptions: {
      styleSimplified: false,
      keepStyle: false,
      keepStartImageStyle: false
    },
    referenceImageCount: 0,
    hasStartImage: false
  });

  assert.match(result, /high quality anime illustration/i);
  assert.match(result, /avoid:\s*photorealistic/i);
  assert.doesNotMatch(result, /Illustration of/i);
});

test('falls back to legacy style formatting when style is unmapped', () => {
  const [result] = buildFinalPrompts({
    activePrompts: ['product shot'],
    selectedStyle: '3D:Unknown Style',
    backgroundStyle: 'none',
    outlineType: 'none',
    outlineThickness: 'normal',
    promptOptions: {
      styleSimplified: false,
      keepStyle: false,
      keepStartImageStyle: false
    },
    referenceImageCount: 0,
    hasStartImage: false
  });

  assert.equal(result, '3D render of product shot Unknown Style');
});

test('applies background, outline and prompt options in final prompt', () => {
  const [result] = buildFinalPrompts({
    activePrompts: ['logo mascot'],
    selectedStyle: '',
    backgroundStyle: 'white',
    outlineType: 'black',
    outlineThickness: 'thick',
    promptOptions: {
      styleSimplified: true,
      keepStyle: true,
      keepStartImageStyle: true
    },
    referenceImageCount: 1,
    hasStartImage: true
  });

  assert.match(result, /isolated on white background/i);
  assert.match(result, /add a bold thick black outline around the subject/i);
  assert.match(result, /make it very simplified/i);
  assert.match(result, /graphic style like as Reference Image/i);
  assert.match(result, /keep graphic style like as Upload Image/i);
});
