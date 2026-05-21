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

export const firebaseApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
export const auth = admin.auth();
