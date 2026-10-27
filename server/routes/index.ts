import type { Express } from 'express';
import { db } from '../firebaseAdmin';
import { authenticate } from '../middleware/authenticate';
import { createRequireApproved } from '../middleware/requireApproved';
import { createPostGenerateHandler } from './generate';
import { createPostProviderTestHandler } from './providerTest';
import { getProviderKeys } from './providerKeys';
import { adminUsersRouter } from './adminUsers';

export function registerApiRoutes(app: Express): void {
  const requireApproved = createRequireApproved(db);
  app.get('/api/provider-keys', authenticate, requireApproved, getProviderKeys);
  app.post('/api/generate', authenticate, requireApproved, createPostGenerateHandler(db));
  app.post('/api/provider-test', authenticate, requireApproved, createPostProviderTestHandler(db));
  app.use(adminUsersRouter);
}
