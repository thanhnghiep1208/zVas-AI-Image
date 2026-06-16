import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validatePassword, validatePrompt } from './validateUserInput';

describe('validatePassword', () => {
  it('rejects passwords shorter than 12 characters', () => {
    const result = validatePassword('short1');
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('12'));
  });

  it('rejects a password of exactly 11 characters', () => {
    const result = validatePassword('a'.repeat(11));
    assert.equal(result.valid, false);
  });

  it('accepts a password of exactly 12 characters', () => {
    const result = validatePassword('a'.repeat(12));
    assert.equal(result.valid, true);
    assert.equal(result.error, undefined);
  });

  it('accepts a password longer than 12 characters', () => {
    const result = validatePassword('StrongPass123!');
    assert.equal(result.valid, true);
  });

  it('rejects an empty password', () => {
    const result = validatePassword('');
    assert.equal(result.valid, false);
  });
});

describe('validatePrompt', () => {
  it('rejects an empty prompt', () => {
    const result = validatePrompt('');
    assert.equal(result.valid, false);
    assert.ok(result.error);
  });

  it('rejects a whitespace-only prompt', () => {
    const result = validatePrompt('   ');
    assert.equal(result.valid, false);
  });

  it('accepts a normal prompt', () => {
    const result = validatePrompt('portrait of a cat');
    assert.equal(result.valid, true);
    assert.equal(result.error, undefined);
  });

  it('rejects a prompt longer than 4000 characters', () => {
    const result = validatePrompt('x'.repeat(4001));
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('4000'));
  });

  it('accepts a prompt of exactly 4000 characters', () => {
    const result = validatePrompt('x'.repeat(4000));
    assert.equal(result.valid, true);
  });
});
