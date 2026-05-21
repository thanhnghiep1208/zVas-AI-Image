import type { Express } from 'express';
import { db } from '../firebaseAdmin';
import { authenticate } from '../middleware/authenticate';
import { createPostGenerateHandler } from './generate';
import { postRateLimit } from './rateLimit';
import { createPostProviderTestHandler } from './providerTest';
import { getProviderKeys } from './providerKeys';

export function registerApiRoutes(app: Express): void {
  app.post('/api/rate-limit', authenticate, postRateLimit);
  app.get('/api/provider-keys', authenticate, getProviderKeys);
  app.post('/api/generate', authenticate, createPostGenerateHandler(db));
  app.post('/api/provider-test', authenticate, createPostProviderTestHandler(db));
}
