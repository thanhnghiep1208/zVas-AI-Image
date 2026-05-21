import type { Request, Response } from 'express';
import { getProviderKeysStatus } from '../lib/providerKeys';

export function getProviderKeys(_req: Request, res: Response): void {
  res.json({ configured: getProviderKeysStatus() });
}
