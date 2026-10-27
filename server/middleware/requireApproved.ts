import type { Request, Response, NextFunction } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type { AuthenticatedRequest } from '../types';

/** Mirrors the client gate in App.tsx: admins pass regardless of status. */
export function isApprovedProfile(profile: { status?: unknown; role?: unknown } | undefined): boolean {
  if (!profile) return false;
  return profile.role === 'admin' || profile.status === 'approved';
}

/**
 * Must run after `authenticate`. Rejects users whose users/{uid} is missing or
 * not approved; fails closed (503) if the profile cannot be read.
 */
export function createRequireApproved(db: Firestore) {
  return async function requireApproved(req: Request, res: Response, next: NextFunction) {
    const { uid } = (req as AuthenticatedRequest).user;
    let profile: { status?: unknown; role?: unknown } | undefined;
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      profile = userDoc.exists ? userDoc.data() : undefined;
    } catch (error) {
      console.error('[ERROR] requireApproved profile lookup failed:', error);
      return res.status(503).json({ error: 'profile_unavailable' });
    }
    if (!isApprovedProfile(profile)) {
      return res.status(403).json({ error: 'account_not_approved' });
    }
    next();
  };
}
