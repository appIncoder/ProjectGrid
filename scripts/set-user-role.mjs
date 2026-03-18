import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

async function main() {
  const serviceAccountPath = process.argv[2];
  if (!serviceAccountPath) {
    console.error('Usage: node scripts/init-admin-role.mjs <service-account.json> <user-id>');
    process.exit(1);
  }

  const userId = process.argv[3];
  if (!userId) {
    console.error('Usage: node scripts/init-admin-role.mjs <service-account.json> <user-id>');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  ensureAdminApp(serviceAccount);

  const db = getFirestore();

  console.log(`Setting admin role for user: ${userId}`);

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  
  if (!userSnap.exists) {
    console.error(`✗ User document not found: ${userId}`);
    process.exit(1);
  }

  const currentRoles = userSnap.data().globalRoles || [];
  const newRoles = Array.from(new Set([...currentRoles, 'sysAdmin'])).sort();

  await userRef.update({
    globalRoles: newRoles,
  });

  console.log(`✓ User ${userId} roles updated: ${JSON.stringify(newRoles)}`);
}

main().catch((error) => {
  console.error('[init-admin-role]', error.message);
  process.exit(1);
});
