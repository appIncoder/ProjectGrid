import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DEFAULT_PROJECT_TYPE_RULES = {
  proposePhaseActivityReportWhenPhaseReady: true,
  proposePhaseChangeWhenAllActivitiesDoneAfterGo: true,
  proposeParentActivityClosureWhenAllChildTasksDone: true,
};

function usage() {
  console.error('Usage: node scripts/seed-firestore-project-type-rules.mjs [service-account.json] [--force]');
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
  if (pathArg) return loadJsonFile(pathArg);

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

function normalizeRules(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    proposePhaseActivityReportWhenPhaseReady:
      source.proposePhaseActivityReportWhenPhaseReady !== undefined
        ? Boolean(source.proposePhaseActivityReportWhenPhaseReady)
        : DEFAULT_PROJECT_TYPE_RULES.proposePhaseActivityReportWhenPhaseReady,
    proposePhaseChangeWhenAllActivitiesDoneAfterGo:
      source.proposePhaseChangeWhenAllActivitiesDoneAfterGo !== undefined
        ? Boolean(source.proposePhaseChangeWhenAllActivitiesDoneAfterGo)
        : DEFAULT_PROJECT_TYPE_RULES.proposePhaseChangeWhenAllActivitiesDoneAfterGo,
    proposeParentActivityClosureWhenAllChildTasksDone:
      source.proposeParentActivityClosureWhenAllChildTasksDone !== undefined
        ? Boolean(source.proposeParentActivityClosureWhenAllChildTasksDone)
        : DEFAULT_PROJECT_TYPE_RULES.proposeParentActivityClosureWhenAllChildTasksDone,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) usage();
  const force = args.includes('--force');
  const positionalArgs = args.filter((arg) => arg !== '--force' && arg !== '--help' && arg !== '-h');
  if (positionalArgs.length > 1) usage();

  const serviceAccount = await resolveServiceAccount(positionalArgs[0]);
  ensureAdminApp(serviceAccount);

  const db = getFirestore();
  const snapshot = await db.collection('projectTypes').get();

  if (snapshot.empty) {
    console.log(JSON.stringify({ ok: true, updated: 0, skipped: 0, reason: 'no-project-types' }, null, 2));
    return;
  }

  const batch = db.batch();
  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const current = docSnap.data()?.rules;
    const normalized = normalizeRules(current);
    const unchanged = JSON.stringify(current ?? null) === JSON.stringify(normalized);

    if (unchanged && !force) {
      skipped++;
      continue;
    }

    batch.set(docSnap.ref, { rules: normalized }, { merge: true });
    updated++;
  }

  if (updated > 0) {
    await batch.commit();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        updated,
        skipped,
        force,
        defaults: DEFAULT_PROJECT_TYPE_RULES,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[seed-firestore-project-type-rules]', error.message);
  process.exit(1);
});
