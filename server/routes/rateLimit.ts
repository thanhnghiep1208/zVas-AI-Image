import type { Request, Response } from 'express';
import { tryConsumeRateLimit } from '../lib/rateLimit';
import type { AuthenticatedRequest } from '../types';

export async function postRateLimit(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).user.uid;
  let allowed: boolean;
  try {
    allowed = await tryConsumeRateLimit(userId);
  } catch (error) {
    console.error('[ERROR] Rate limit backend unavailable:', error);
    return res.status(503).json({ error: 'rate_limit_unavailable' });
  }
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }
  res.json({ status: 'ok' });
}
