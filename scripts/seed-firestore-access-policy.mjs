import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const SUPER_USER_EMAIL = 'etienne.darquennes@gmail.com';
const OWNER_EMAIL = 'etienne.darquennes@eglisemlk.fr';
const PROJECT_MANAGER_ROLE = 'projectManager';

function usage() {
  console.error('Usage: node scripts/seed-firestore-access-policy.mjs [service-account.json]');
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

async function loadJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function resolveServiceAccount(pathArg) {
  if (pathArg) {
    return loadJsonFile(pathArg);
  }

  const envJson =
    parseJsonEnv('FIREBASE_SERVICE_ACCOUNT_JSON') ||
    parseJsonEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON');
  if (envJson) return envJson;

  const fallbackPath = path.join(process.cwd(), 'scripts', 'carecode-2dea6-firebase-adminsdk-xfnu9-39622212a0.json');
  try {
    await access(fallbackPath);
    return loadJsonFile(fallbackPath);
  } catch {
    throw new Error(
      'Missing service account JSON. Pass a file path, set FIREBASE_SERVICE_ACCOUNT_JSON, or place the Firebase admin JSON in scripts/.',
    );
  }
}

function ensureAdminApp(serviceAccount) {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function asString(value) {
  return String(value ?? '').trim();
}

function labelForUser(authUser, userDocData, fallbackEmail) {
  return (
    asString(userDocData?.label) ||
    asString(authUser?.displayName) ||
    asString(userDocData?.email) ||
    asString(authUser?.email) ||
    fallbackEmail
  );
}

async function ensureUserDoc(db, authUser) {
  const userRef = db.collection('users').doc(authUser.uid);
  const snapshot = await userRef.get();
  const current = snapshot.exists ? (asRecord(snapshot.data()) ?? {}) : {};
  await userRef.set(
    {
      uid: authUser.uid,
      email: authUser.email || '',
      username: current.username ?? authUser.email?.split('@')[0] ?? authUser.uid,
      label: current.label ?? authUser.displayName ?? authUser.email ?? authUser.uid,
      globalRoles: Array.isArray(current.globalRoles) ? current.globalRoles : [],
      projectIds: Array.isArray(current.projectIds) ? current.projectIds : [],
      updatedAt: new Date(),
    },
    { merge: true },
  );
  return userRef.get();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) usage();
  if (args.length > 1) usage();

  const serviceAccount = await resolveServiceAccount(args[0]);
  ensureAdminApp(serviceAccount);

  const auth = getAuth();
  const db = getFirestore();

  const superAuthUser = await auth.getUserByEmail(SUPER_USER_EMAIL);
  const ownerAuthUser = await auth.getUserByEmail(OWNER_EMAIL);
  const [superUserSnap, ownerUserSnap, usersSnapshot, projectsSnapshot] = await Promise.all([
    ensureUserDoc(db, superAuthUser),
    ensureUserDoc(db, ownerAuthUser),
    db.collection('users').get(),
    db.collection('projects').get(),
  ]);

  const superUserData = asRecord(superUserSnap.data()) ?? {};
  const ownerUserData = asRecord(ownerUserSnap.data()) ?? {};
  const superUserId = superAuthUser.uid;
  const ownerUserId = ownerAuthUser.uid;
  const ownerLabel = labelForUser(ownerAuthUser, ownerUserData, OWNER_EMAIL);

  let batch = db.batch();
  let batchCount = 0;
  let usersUpdated = 0;
  let projectsUpdated = 0;

  for (const userDoc of usersSnapshot.docs) {
    const data = asRecord(userDoc.data()) ?? {};
    const currentRoles = Array.isArray(data.globalRoles) ? data.globalRoles.map((role) => asString(role)).filter(Boolean) : [];
    const nextRolesWithoutSysAdmin = currentRoles.filter((role) => !['sysAdmin', 'sysadmin'].includes(role));
    const nextRoles = userDoc.id === superUserId
      ? Array.from(new Set([...nextRolesWithoutSysAdmin, 'sysAdmin']))
      : nextRolesWithoutSysAdmin;
    const currentSorted = [...currentRoles].sort();
    const nextSorted = [...nextRoles].sort();

    if (JSON.stringify(currentSorted) === JSON.stringify(nextSorted)) {
      continue;
    }

    batch.set(userDoc.ref, { globalRoles: nextRoles }, { merge: true });
    batchCount++;
    usersUpdated++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  const allProjectIds = projectsSnapshot.docs.map((docSnap) => docSnap.id).sort();

  for (const projectDoc of projectsSnapshot.docs) {
    const data = asRecord(projectDoc.data()) ?? {};
    const payload = asRecord(data.payload) ?? {};
    const memberRoles = asRecord(data.memberRoles) ?? {};
    const currentOwnerRoles = Array.isArray(memberRoles[ownerUserId]) ? memberRoles[ownerUserId].map((role) => asString(role)).filter(Boolean) : [];
    const nextOwnerRoles = Array.from(new Set([...currentOwnerRoles, PROJECT_MANAGER_ROLE]));
    const nextMemberRoles = {
      ...memberRoles,
      [ownerUserId]: nextOwnerRoles,
    };
    const nextMemberIds = Object.keys(nextMemberRoles).filter((id) => asString(id) !== '').sort();
    const nextPayload = {
      ...payload,
      owner: ownerLabel,
      projectManager: ownerLabel,
    };
    const payloadChanged =
      asString(payload.owner) !== ownerLabel ||
      asString(payload.projectManager) !== ownerLabel;
    const rolesChanged = JSON.stringify(memberRoles) !== JSON.stringify(nextMemberRoles);
    const memberIdsChanged = JSON.stringify((Array.isArray(data.memberIds) ? data.memberIds : []).slice().sort()) !== JSON.stringify(nextMemberIds);

    if (!payloadChanged && !rolesChanged && !memberIdsChanged) {
      continue;
    }

    batch.set(
      projectDoc.ref,
      {
        memberRoles: nextMemberRoles,
        memberIds: nextMemberIds,
        payload: nextPayload,
        owner: ownerLabel,
        projectManager: ownerLabel,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    batchCount++;
    projectsUpdated++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  batch.set(superUserSnap.ref, { projectIds: allProjectIds }, { merge: true });
  batchCount++;
  batch.set(ownerUserSnap.ref, { projectIds: allProjectIds }, { merge: true });
  batchCount++;

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        superUser: { uid: superUserId, email: SUPER_USER_EMAIL },
        ownerUser: { uid: ownerUserId, email: OWNER_EMAIL, label: ownerLabel },
        usersUpdated,
        projectsUpdated,
        totalProjects: allProjectIds.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[seed-firestore-access-policy]', error.message);
  process.exit(1);
});
