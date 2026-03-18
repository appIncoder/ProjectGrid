import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function usage() {
  console.error('Usage: node scripts/check-firestore-users.mjs <service-account.json> [options]');
  console.error('Options:');
  console.error('  --fix-missing  Initialize missing user documents from Firebase Auth');
  console.error('  --user-id <id> Check specific user');
  process.exit(1);
}

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

async function initializeMissingUsers(db, auth) {
  console.log('Checking for users in Firebase Auth without Firestore documents...');
  
  const usersDb = [];
  let pageToken;
  do {
    const batch = await auth.listUsers(1000, pageToken);
    usersDb.push(...batch.users);
    pageToken = batch.pageToken;
  } while (pageToken);

  const firestoreUsersSnap = await db.collection('users').get();
  const firestoreUserIds = new Set(firestoreUsersSnap.docs.map(d => d.id));

  const missingUsers = usersDb.filter(u => !firestoreUserIds.has(u.uid));
  
  if (missingUsers.length === 0) {
    console.log('✓ All Firebase Auth users have Firestore documents');
    return 0;
  }

  console.log(`Found ${missingUsers.length} Firebase Auth users without Firestore documents:`);
  for (const user of missingUsers) {
    console.log(`  - ${user.uid} (${user.displayName || user.email || 'no email'})`);
  }

  return missingUsers.length;
}

async function createUserDocuments(db, auth) {
  console.log('Creating missing user documents...');
  
  const usersDb = [];
  let pageToken;
  do {
    const batch = await auth.listUsers(1000, pageToken);
    usersDb.push(...batch.users);
    pageToken = batch.pageToken;
  } while (pageToken);

  const firestoreUsersSnap = await db.collection('users').get();
  const firestoreUserIds = new Set(firestoreUsersSnap.docs.map(d => d.id));

  const missingUsers = usersDb.filter(u => !firestoreUserIds.has(u.uid));
  
  if (missingUsers.length === 0) {
    console.log('No missing users to create');
    return 0;
  }

  let created = 0;
  for (const user of missingUsers) {
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email || '',
      username: user.displayName || user.email?.split('@')[0] || 'user',
      label: user.displayName || user.email || user.uid,
      globalRoles: [],
      projectIds: [],
      createdAt: new Date(),
      createdBy: 'system:firestore-init',
    }, { merge: true });
    created++;
    console.log(`  ✓ Created user document for ${user.uid}`);
  }

  return created;
}

async function checkUserAccess(db, userId) {
  console.log(`\nChecking access for user: ${userId}`);
  
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists()) {
    console.error(`✗ User document not found: ${userId}`);
    return false;
  }

  const userData = userSnap.data();
  console.log('User Document:');
  console.log(`  globalRoles: ${JSON.stringify(userData.globalRoles || [])}`);
  console.log(`  projectIds: ${JSON.stringify(userData.projectIds || [])}`);

  const projectsSnap = await db.collection('projects')
    .where('memberIds', 'array-contains', userId)
    .get();
  
  console.log(`\n  Projects (memberIds): ${projectsSnap.size} found`);
  for (const doc of projectsSnap.docs) {
    console.log(`    - ${doc.id} (${doc.data().payload?.name || 'unnamed'})`);
  }

  const projectsByRolesSnap = await db.collection('projects').get();
  const projectsWithUserRoles = projectsByRolesSnap.docs.filter(doc => {
    const memberRoles = doc.data().memberRoles || {};
    return userId in memberRoles;
  });

  console.log(`  Projects (memberRoles): ${projectsWithUserRoles.length} found`);
  for (const doc of projectsWithUserRoles) {
    const roles = doc.data().memberRoles[userId];
    console.log(`    - ${doc.id} (roles: ${JSON.stringify(roles)})`);
  }

  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const serviceAccountPath = args[0];
  if (!serviceAccountPath) usage();

  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  ensureAdminApp(serviceAccount);

  const db = getFirestore();
  const auth = getAuth();

  const fixMissing = args.includes('--fix-missing');
  const userIdIndex = args.indexOf('--user-id');
  const userId = userIdIndex !== -1 ? args[userIdIndex + 1] : null;

  if (userId) {
    await checkUserAccess(db, userId);
  } else {
    const missing = await initializeMissingUsers(db, auth);
    
    if (fixMissing && missing > 0) {
      const created = await createUserDocuments(db, auth);
      console.log(`\n✓ Created ${created} user documents`);
    } else if (missing > 0) {
      console.log('\nRun with --fix-missing to create missing user documents');
    }
  }
}

main().catch((error) => {
  console.error('[check-firestore-users]', error.message);
  process.exit(1);
});
