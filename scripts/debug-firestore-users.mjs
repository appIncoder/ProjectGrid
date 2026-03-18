import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

async function main() {
  const serviceAccountPath = process.argv[2];
  if (!serviceAccountPath) {
    console.error('Usage: node scripts/debug-firestore-users.mjs <service-account.json>');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  ensureAdminApp(serviceAccount);

  const db = getFirestore();
  const auth = getAuth();

  console.log('=== Firebase Auth Users ===');
  const authUsers = [];
  let pageToken;
  do {
    const batch = await auth.listUsers(1000, pageToken);
    authUsers.push(...batch.users);
    pageToken = batch.pageToken;
  } while (pageToken);

  console.log(`Found ${authUsers.length} users in Firebase Auth:`);
  for (const user of authUsers) {
    console.log(`  - ${user.uid} (${user.email || 'no email'})`);
  }

  console.log('\n=== Firestore Users ===');
  const firestoreSnap = await db.collection('users').get();
  console.log(`Found ${firestoreSnap.size} users in Firestore:`);
  for (const doc of firestoreSnap.docs) {
    const data = doc.data();
    console.log(`  - ${doc.id}`);
    console.log(`      email: ${data.email || 'N/A'}`);
    console.log(`      uid: ${data.uid || 'N/A'}`);
    console.log(`      globalRoles: ${JSON.stringify(data.globalRoles || [])}`);
    console.log(`      projectIds: ${JSON.stringify(data.projectIds || [])}`);
  }

  console.log('\n=== Comparison ===');
  const firestoreUids = new Set(firestoreSnap.docs.map(d => d.id));
  const authUids = new Set(authUsers.map(u => u.uid));

  const missingInFirestore = authUsers.filter(u => !firestoreUids.has(u.uid));
  const orphanedInFirestore = firestoreSnap.docs.filter(d => !authUids.has(d.id));

  if (missingInFirestore.length > 0) {
    console.log(`\n⚠️  Missing in Firestore (${missingInFirestore.length}):`);
    for (const user of missingInFirestore) {
      console.log(`  - ${user.uid} (${user.email})`);
    }
  }

  if (orphanedInFirestore.length > 0) {
    console.log(`\n⚠️  Orphaned in Firestore (${orphanedInFirestore.length}):`);
    for (const doc of orphanedInFirestore) {
      console.log(`  - ${doc.id}`);
    }
  }

  if (missingInFirestore.length === 0 && orphanedInFirestore.length === 0) {
    console.log('\n✓ All users are synchronized');
  }
}

main().catch((error) => {
  console.error('[debug-firestore-users]', error.message);
  process.exit(1);
});
