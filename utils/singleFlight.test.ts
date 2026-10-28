import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSingleFlightGuard } from './singleFlight.ts';

describe('createSingleFlightGuard', () => {
  it('lets the first caller in and rejects a second while in flight', () => {
    const guard = createSingleFlightGuard();
    assert.equal(guard.tryAcquire(), true);
    // Click kép trong cùng frame, trước khi `disabled` kịp render.
    assert.equal(guard.tryAcquire(), false);
  });

  it('allows a new run after release', () => {
    const guard = createSingleFlightGuard();
    guard.tryAcquire();
    guard.release();
    assert.equal(guard.tryAcquire(), true);
  });

  it('reports whether a run is in flight', () => {
    const guard = createSingleFlightGuard();
    assert.equal(guard.isInFlight(), false);
    guard.tryAcquire();
    assert.equal(guard.isInFlight(), true);
  });
});
