import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(serverDir, '..');

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'firebase-applet-config.json'), 'utf8')
) as { projectId: string; firestoreDatabaseId: string };

/** Tìm service account JSON (dev local). Hỗ trợ tên file có khoảng trắng đầu do lỗi copy. */
function resolveServiceAccountPath(): string | null {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const candidates = [
    path.join(projectRoot, 'service-account.json'),
    path.join(projectRoot, ' service-account.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const serviceAccountPath = resolveServiceAccountPath();
const initOptions: admin.AppOptions = { projectId: firebaseConfig.projectId };

if (serviceAccountPath) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as admin.ServiceAccount;
  initOptions.credential = admin.credential.cert(serviceAccount);
} else if (process.env.NODE_ENV !== 'production') {
  console.warn(
    '[firebaseAdmin] No service account file found. Set GOOGLE_APPLICATION_CREDENTIALS or add service-account.json at project root.',
  );
}

export const firebaseApp = admin.apps.length
  ? admin.app()
  : admin.initializeApp(initOptions);

export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
export const auth = admin.auth();
