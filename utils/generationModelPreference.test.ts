import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadPreferredModelKey,
  PREFERRED_MODEL_KEY_STORAGE,
  savePreferredModelKey,
} from './generationModelPreference.ts';

function withLocalStorage(run: () => void) {
  const store = new Map<string, string>();
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    },
  });
  try {
    run();
  } finally {
    if (original) {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: original,
      });
    } else {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  }
}

describe('generationModelPreference', () => {
  it('loadPreferredModelKey returns null when storage empty', () => {
    withLocalStorage(() => {
      assert.equal(loadPreferredModelKey(), null);
    });
  });

  it('round-trips preferred model key', () => {
    withLocalStorage(() => {
      savePreferredModelKey('gemini:gemini-3.1-flash-image-preview');
      assert.equal(
        loadPreferredModelKey(),
        'gemini:gemini-3.1-flash-image-preview'
      );
      assert.equal(
        localStorage.getItem(PREFERRED_MODEL_KEY_STORAGE),
        JSON.stringify('gemini:gemini-3.1-flash-image-preview')
      );
    });
  });

  it('migrates legacy preferred_generation_models gemini entry', () => {
    withLocalStorage(() => {
      localStorage.setItem(
        'preferred_generation_models',
        JSON.stringify({ gemini: 'gemini-3-pro-image-preview' })
      );
      assert.equal(
        loadPreferredModelKey(),
        'gemini:gemini-3-pro-image-preview'
      );
    });
  });

  it('savePreferredModelKey ignores invalid keys', () => {
    withLocalStorage(() => {
      savePreferredModelKey('not-a-valid-key');
      assert.equal(loadPreferredModelKey(), null);
    });
  });
});
