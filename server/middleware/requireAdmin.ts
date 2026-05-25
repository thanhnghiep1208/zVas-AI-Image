import type { Request, Response, NextFunction } from 'express';
import { db, auth } from '../firebaseAdmin';
import type { AuthenticatedRequest } from '../types';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { uid } = (req as AuthenticatedRequest).user;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Forbidden: User profile not found' });
    }
    const role = userDoc.data()?.role;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    next();
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('requireAdmin error:', err);
    if (err.code === 'app/invalid-credential' || /credential|ENOENT|service account/i.test(err.message ?? '')) {
      return res.status(503).json({
        error:
          'Server chưa cấu hình Firebase Admin (service account). Không thể xác minh quyền admin.',
      });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
