/**
 * Tạo/cập nhật document Firestore users/{uid} cho user đã có trên Firebase Auth.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   npx tsx scripts/provision-user-profile.ts --uid <UID> --username admin --role admin
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { emailForAdminUsername } from '../utils/authCredentials.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    uid: get('--uid'),
    username: get('--username') ?? 'admin',
    role: get('--role') ?? 'admin',
    status: get('--status') ?? 'approved',
    displayName: get('--display-name'),
  };
}

async function main() {
  const { uid, username, role, status, displayName } = parseArgs(process.argv.slice(2));
  if (!uid) {
    console.error('Missing --uid');
    process.exit(1);
  }

  const { db, auth } = await import('../server/firebaseAdmin.js');

  let email = emailForAdminUsername(username);
  let resolvedDisplayName = displayName ?? username;

  try {
    const record = await auth.getUser(uid);
    if (record.email) email = record.email;
    if (record.displayName && !displayName) resolvedDisplayName = record.displayName;
  } catch (err) {
    console.warn('Could not load Auth user (continuing with synthetic email):', err);
  }

  const userData = {
    uid,
    email,
    username,
    displayName: resolvedDisplayName,
    photoURL: null,
    role,
    status,
    createdAt: new Date().toISOString(),
  };

  await db.collection('users').doc(uid).set(userData, { merge: true });
  console.log('OK — wrote users/%s', uid);
  console.log(JSON.stringify(userData, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
