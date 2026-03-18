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
  const userId = process.argv[3];
  
  if (!serviceAccountPath || !userId) {
    console.error('Usage: node scripts/test-user-access.mjs <service-account.json> <user-id>');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  ensureAdminApp(serviceAccount);

  const db = getFirestore();

  console.log(`Testing access for user: ${userId}\n`);

  try {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      console.error(`✗ User document not found: ${userId}`);
      process.exit(1);
    }

    const userData = userSnap.data();
    console.log('✓ User document found');
    console.log(`  globalRoles: ${JSON.stringify(userData.globalRoles || [])}`);
    console.log(`  projectIds: ${JSON.stringify(userData.projectIds || [])}`);

    // Test project access
    if (userData.projectIds?.length > 0) {
      console.log(`\n✓ User has access to ${userData.projectIds.length} projects:`);
      for (const projectId of userData.projectIds.slice(0, 3)) {
        const projectRef = db.collection('projects').doc(projectId);
        const projectSnap = await projectRef.get();
        if (projectSnap.exists) {
          const projectData = projectSnap.data();
          console.log(`  - ${projectId} (${projectData.payload?.name || 'unnamed'})`);
        }
      }
      if (userData.projectIds.length > 3) {
        console.log(`  ... and ${userData.projectIds.length - 3} more`);
      }
    } else {
      console.log('\n⚠️  User has no project access');
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[test-user-access]', error.message);
  process.exit(1);
});
