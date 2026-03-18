import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { cert, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

function usage() {
  console.error('Usage: node scripts/import-firestore-export.mjs <export.json> [service-account.json]');
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

function normalizeDateToTimestamp(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return Timestamp.fromDate(parsed);
}

function sanitize(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = sanitize(item);
    }
    return output;
  }
  return value;
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

  initializeApp({
    credential: cert(serviceAccount),
  });

  const db = getFirestore();
  const raw = JSON.parse(await readFile(exportPath, 'utf8'));
  const collections = raw?.collections ?? {};
  const operations = [];
  const projectRows = Array.isArray(collections.projects) ? collections.projects : [];
  const allProjectIds = projectRows
    .map((row) => String(row?.id ?? '').trim())
    .filter((id) => id !== '');
  const userProjectIds = new Map();

  for (const row of projectRows) {
    const projectId = String(row?.id ?? '').trim();
    if (!projectId) continue;
    const memberRoles = row?.memberRoles && typeof row.memberRoles === 'object' ? row.memberRoles : {};
    for (const userId of Object.keys(memberRoles)) {
      const normalizedUserId = String(userId ?? '').trim();
      if (!normalizedUserId) continue;
      if (!userProjectIds.has(normalizedUserId)) {
        userProjectIds.set(normalizedUserId, new Set());
      }
      userProjectIds.get(normalizedUserId).add(projectId);
    }
  }

  for (const user of collections.users ?? []) {
    const id = String(user?.id ?? '').trim();
    if (!id) continue;
    const globalRoles = Array.isArray(user?.globalRoles) ? user.globalRoles : [];
    const isSysAdmin = globalRoles.some((role) => ['sysadmin', 'sysAdmin'].includes(String(role ?? '').trim()));
    const {
      passwordHash,
      passwordHashAlgorithm,
      ...safeUser
    } = user ?? {};
    operations.push({
      ref: db.collection('users').doc(id),
      data: {
        ...sanitize(safeUser),
        projectIds: Array.from(
          isSysAdmin
            ? new Set(allProjectIds)
            : (userProjectIds.get(id) ?? new Set()),
        ).sort(),
        createdAt: normalizeDateToTimestamp(user.createdAt),
        updatedAt: normalizeDateToTimestamp(user.updatedAt),
      },
    });
    if (operations.length >= 400) await flushBatch(db, operations);
  }

  for (const row of collections.healthDefaults ?? []) {
    const docId = String(row?.healthId ?? row?.shortName ?? '').trim().toLowerCase();
    if (!docId) continue;
    operations.push({
      ref: db.collection('healthDefaults').doc(docId),
      data: {
        ...sanitize(row),
        dateCreated: normalizeDateToTimestamp(row.dateCreated),
        dateLastUpdated: normalizeDateToTimestamp(row.dateLastUpdated),
      },
    });
    if (operations.length >= 400) await flushBatch(db, operations);
  }

  for (const row of collections.projectTypes ?? []) {
    const docId = String(row?.projectType?.id ?? '').trim();
    if (!docId) continue;
    operations.push({
      ref: db.collection('projectTypes').doc(docId),
      data: sanitize(row),
    });
    if (operations.length >= 400) await flushBatch(db, operations);
  }

  for (const row of projectRows) {
    const docId = String(row?.id ?? '').trim();
    if (!docId) continue;
    const memberRoles = sanitize(row?.memberRoles ?? {});
    const memberIds = memberRoles && typeof memberRoles === 'object'
      ? Object.keys(memberRoles).filter((id) => String(id ?? '').trim() !== '')
      : [];
    operations.push({
      ref: db.collection('projects').doc(docId),
      data: {
        id: docId,
        name: String(row?.name ?? docId).trim() || docId,
        description: String(row?.description ?? '').trim(),
        status: String(row?.status ?? '').trim(),
        memberIds,
        memberRoles,
        payload: sanitize(row?.payload ?? {}),
        createdAt: normalizeDateToTimestamp(row.createdAt),
        updatedAt: normalizeDateToTimestamp(row.updatedAt) ?? Timestamp.now(),
      },
    });
    if (operations.length >= 400) await flushBatch(db, operations);
  }

  await flushBatch(db, operations);

  console.log(JSON.stringify({
    ok: true,
    importedAt: new Date().toISOString(),
    counts: raw?.counts ?? {},
  }, null, 2));
}

main().catch((error) => {
  console.error('[import-firestore-export]', error.message);
  process.exit(1);
});
