import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function usage() {
  console.error('Usage: node scripts/rebuild-firestore-access.mjs <service-account.json>');
  process.exit(1);
}

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

async function flushBatch(db, operations) {
  if (operations.length === 0) return;
  const batch = db.batch();
  for (const operation of operations) {
    batch.set(operation.ref, operation.data, { merge: true });
  }
  await batch.commit();
  operations.length = 0;
}

async function main() {
  const serviceAccountPath = process.argv[2];
  if (!serviceAccountPath) usage();

  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  ensureAdminApp(serviceAccount);

  const db = getFirestore();
  const [projectsSnapshot, usersSnapshot] = await Promise.all([
    db.collection('projects').get(),
    db.collection('users').get(),
  ]);

  const allProjectIds = [];
  const projectIdsByUser = new Map();
  const operations = [];

  for (const projectDoc of projectsSnapshot.docs) {
    const data = projectDoc.data() ?? {};
    const memberRoles = data.memberRoles && typeof data.memberRoles === 'object' ? data.memberRoles : {};
    const memberIds = Object.keys(memberRoles).filter((id) => String(id ?? '').trim() !== '').sort();
    allProjectIds.push(projectDoc.id);

    for (const userId of memberIds) {
      if (!projectIdsByUser.has(userId)) {
        projectIdsByUser.set(userId, new Set());
      }
      projectIdsByUser.get(userId).add(projectDoc.id);
    }

    operations.push({
      ref: projectDoc.ref,
      data: {
        memberIds,
      },
    });
    if (operations.length >= 400) await flushBatch(db, operations);
  }

  const allProjectSet = new Set(allProjectIds);
  for (const userDoc of usersSnapshot.docs) {
    const data = userDoc.data() ?? {};
    const globalRoles = Array.isArray(data.globalRoles) ? data.globalRoles : [];
    const isSysAdmin = globalRoles.some((role) => ['sysadmin', 'sysAdmin'].includes(String(role ?? '').trim()));
    const projectIds = Array.from(
      isSysAdmin
        ? allProjectSet
        : (projectIdsByUser.get(userDoc.id) ?? new Set()),
    ).sort();

    operations.push({
      ref: userDoc.ref,
      data: {
        projectIds,
      },
    });
    if (operations.length >= 400) await flushBatch(db, operations);
  }

  await flushBatch(db, operations);

  console.log(JSON.stringify({
    ok: true,
    rebuiltAt: new Date().toISOString(),
    projectsUpdated: projectsSnapshot.size,
    usersUpdated: usersSnapshot.size,
  }, null, 2));
}

main().catch((error) => {
  console.error('[rebuild-firestore-access]', error.message);
  process.exit(1);
});
