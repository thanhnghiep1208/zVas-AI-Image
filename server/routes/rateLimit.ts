import type { Request, Response } from 'express';
import { tryConsumeRateLimit } from '../lib/rateLimit';
import type { AuthenticatedRequest } from '../types';

export async function postRateLimit(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).user.uid;
  const allowed = await tryConsumeRateLimit(userId);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }
  res.json({ status: 'ok' });
}
