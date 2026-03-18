import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function usage() {
  console.error('Usage: node scripts/import-auth-users.mjs <export.json> [service-account.json]');
  process.exit(1);
}

function parseJsonEnv(name) {
  const raw = process.env[name];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${name}: ${error.message}`);
  }
}

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

function resolveKnownPassword(user) {
  const hash = String(user?.passwordHash ?? '').trim().toLowerCase();
  if (hash === '21232f297a57a5a743894a0e4a801fc3') return 'admin123';
  if (hash === '0192023a7bbd73250516f069df18b500') return 'admin123';
  return '';
}

async function upsertUser(auth, user) {
  const uid = String(user?.id ?? user?.uid ?? '').trim();
  const email = String(user?.email ?? '').trim();
  if (!uid || !email) return { skipped: true };

  const payload = {
    uid,
    email,
    displayName: String(user?.fullName ?? user?.label ?? user?.username ?? email).trim() || email,
    disabled: String(user?.status ?? 'active').trim().toLowerCase() !== 'active',
  };

  const knownPassword = resolveKnownPassword(user);
  if (knownPassword) {
    payload.password = knownPassword;
  }

  try {
    await auth.updateUser(uid, payload);
    return { created: false, email, uid };
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
  }

  await auth.createUser(payload);
  return { created: true, email, uid };
}

async function main() {
  const exportPath = process.argv[2];
  if (!exportPath) usage();
  const serviceAccountPathArg = process.argv[3];

  let serviceAccount = null;
  if (serviceAccountPathArg) {
    serviceAccount = JSON.parse(await readFile(serviceAccountPathArg, 'utf8'));
  } else {
    serviceAccount =
      parseJsonEnv('FIREBASE_SERVICE_ACCOUNT_JSON') ||
      parseJsonEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON');
  }

  if (!serviceAccount) {
    throw new Error('Missing service account JSON. Pass a file path or set FIREBASE_SERVICE_ACCOUNT_JSON.');
  }

  ensureAdminApp(serviceAccount);

  const raw = JSON.parse(await readFile(exportPath, 'utf8'));
  const users = Array.isArray(raw?.collections?.users) ? raw.collections.users : [];
  const auth = getAuth();

  let importedUsers = 0;
  let createdUsers = 0;
  let updatedUsers = 0;
  const errors = [];

  for (const user of users) {
    try {
      const result = await upsertUser(auth, user);
      if (result?.skipped) continue;
      importedUsers += 1;
      if (result?.created) createdUsers += 1;
      else updatedUsers += 1;
    } catch (error) {
      errors.push({
        uid: String(user?.id ?? user?.uid ?? '').trim(),
        email: String(user?.email ?? '').trim(),
        code: error?.code ?? 'unknown',
        message: error?.message ?? String(error ?? ''),
      });
    }
  }

  console.log(JSON.stringify({
    ok: errors.length === 0,
    importedAt: new Date().toISOString(),
    importedUsers,
    createdUsers,
    updatedUsers,
    failedUsers: errors.length,
    errors,
  }, null, 2));
}

main().catch((error) => {
  console.error('[import-auth-users]', error.message);
  process.exit(1);
});
