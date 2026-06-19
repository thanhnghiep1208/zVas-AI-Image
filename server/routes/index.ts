import type { Express } from 'express';
import { db } from '../firebaseAdmin';
import { authenticate } from '../middleware/authenticate';
import { createPostGenerateHandler } from './generate';
import { createPostProviderTestHandler } from './providerTest';
import { getProviderKeys } from './providerKeys';
import { adminUsersRouter } from './adminUsers';

export function registerApiRoutes(app: Express): void {
  app.get('/api/provider-keys', authenticate, getProviderKeys);
  app.post('/api/generate', authenticate, createPostGenerateHandler(db));
  app.post('/api/provider-test', authenticate, createPostProviderTestHandler(db));
  app.use(adminUsersRouter);
}
