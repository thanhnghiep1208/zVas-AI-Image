import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { createRequireApproved, isApprovedProfile } from './requireApproved';

type ProfileLookup = { exists: boolean; data?: Record<string, unknown> } | Error;

function fakeDb(lookup: ProfileLookup, seenPaths: string[] = []): Firestore {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          seenPaths.push(`${name}/${id}`);
          if (lookup instanceof Error) throw lookup;
          return { exists: lookup.exists, data: () => lookup.data };
        },
      }),
    }),
  } as unknown as Firestore;
}

async function run(lookup: ProfileLookup, seenPaths?: string[]) {
  const req = { user: { uid: 'user-1' } } as unknown as Request;
  const result: { status?: number; body?: unknown; nextCalled: boolean } = { nextCalled: false };
  const res = {
    status(code: number) {
      result.status = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as unknown as Response;
  await createRequireApproved(fakeDb(lookup, seenPaths))(req, res, () => {
    result.nextCalled = true;
  });
  return result;
}

describe('isApprovedProfile', () => {
  it('accepts approved users and admins regardless of status', () => {
    assert.equal(isApprovedProfile({ status: 'approved', role: 'editor' }), true);
    assert.equal(isApprovedProfile({ status: 'pending', role: 'admin' }), true);
    assert.equal(isApprovedProfile({ status: 'rejected', role: 'admin' }), true);
  });

  it('rejects pending, rejected, missing or unknown status', () => {
    assert.equal(isApprovedProfile({ status: 'pending', role: 'editor' }), false);
    assert.equal(isApprovedProfile({ status: 'rejected', role: 'advice' }), false);
    assert.equal(isApprovedProfile({ role: 'editor' }), false);
    assert.equal(isApprovedProfile({ status: 'APPROVED' }), false);
    assert.equal(isApprovedProfile(undefined), false);
  });
});

describe('requireApproved middleware', () => {
  it('reads users/{uid} and calls next for an approved user', async () => {
    const seen: string[] = [];
    const result = await run({ exists: true, data: { status: 'approved', role: 'editor' } }, seen);
    assert.deepEqual(seen, ['users/user-1']);
    assert.equal(result.nextCalled, true);
    assert.equal(result.status, undefined);
  });

  it('calls next for an admin even when not approved', async () => {
    const result = await run({ exists: true, data: { status: 'pending', role: 'admin' } });
    assert.equal(result.nextCalled, true);
  });

  it('returns 403 for a pending user', async () => {
    const result = await run({ exists: true, data: { status: 'pending', role: 'editor' } });
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
    assert.deepEqual(result.body, { error: 'account_not_approved' });
  });

  it('returns 403 for a rejected user', async () => {
    const result = await run({ exists: true, data: { status: 'rejected', role: 'editor' } });
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
  });

  it('returns 403 when the profile document is missing', async () => {
    const result = await run({ exists: false });
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
    assert.deepEqual(result.body, { error: 'account_not_approved' });
  });

  it('fails closed with 503 when the profile lookup throws', async () => {
    const result = await run(new Error('UNAVAILABLE'));
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 503);
  });
});
