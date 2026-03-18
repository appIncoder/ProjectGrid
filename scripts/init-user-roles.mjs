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

// Admin user ID from the migration data
const ADMIN_USER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

async function main() {
  const serviceAccountPath = process.argv[2];
  if (!serviceAccountPath) {
    console.error('Usage: node scripts/init-user-roles.mjs <service-account.json>');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  ensureAdminApp(serviceAccount);

  const db = getFirestore();

  console.log('Initializing user roles from migration data...\n');

  // Define roles for each user
  const userRoles = {
    [ADMIN_USER_ID]: ['sysAdmin'],
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': [],
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': [],
    'cccccccc-cccc-cccc-cccc-cccccccccccc': [],
    'dddddddd-dddd-dddd-dddd-dddddddddddd': [],
  };

  let updated = 0;
  for (const [userId, roles] of Object.entries(userRoles)) {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.log(`⚠️  User not found: ${userId}`);
      continue;
    }

    const currentRoles = userSnap.data().globalRoles || [];
    
    if (JSON.stringify(currentRoles.sort()) === JSON.stringify(roles.sort())) {
      console.log(`✓ ${userId}: roles already set to ${JSON.stringify(roles)}`);
      continue;
    }

    await userRef.update({
      globalRoles: roles,
    });
    
    console.log(`✓ ${userId}: roles updated to ${JSON.stringify(roles)}`);
    updated++;
  }

  console.log(`\n✓ Updated ${updated} users`);
}

main().catch((error) => {
  console.error('[init-user-roles]', error.message);
  process.exit(1);
});
