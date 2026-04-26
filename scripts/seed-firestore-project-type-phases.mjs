import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Canonical Firestore seed:
// derive and persist phases directly on projectTypes/{projectTypeId}.phases
// using activitiesDefault from the same document.

const PHASE_FALLBACKS = {
  PMBOK: [
    { id: 'Phase1', label: 'Phase 1', sequence: 1 },
    { id: 'Phase2', label: 'Phase 2', sequence: 2 },
    { id: 'Phase3', label: 'Phase 3', sequence: 3 },
    { id: 'Phase4', label: 'Phase 4', sequence: 4 },
    { id: 'Phase5', label: 'Phase 5', sequence: 5 },
    { id: 'Phase6', label: 'Phase 6', sequence: 6 },
  ],
  AgilePM: [
    { id: 'pre_project', label: 'Pre-Project', sequence: 1 },
    { id: 'feasibility', label: 'Feasibility', sequence: 2 },
    { id: 'foundations', label: 'Foundations', sequence: 3 },
    { id: 'exploration', label: 'Exploration', sequence: 4 },
    { id: 'engineering', label: 'Engineering', sequence: 5 },
    { id: 'deployment', label: 'Deployment', sequence: 6 },
    { id: 'post_project', label: 'Post-Project', sequence: 7 },
  ],
  Prince2: [
    { id: 'su', label: 'Starting up a Project (SU)', sequence: 1 },
    { id: 'ip', label: 'Initiating a Project (IP)', sequence: 2 },
    { id: 'cs', label: 'Controlling a Stage (CS)', sequence: 3 },
    { id: 'mp', label: 'Managing Product Delivery (MP)', sequence: 4 },
    { id: 'sb', label: 'Managing a Stage Boundary (SB)', sequence: 5 },
    { id: 'dp', label: 'Directing a Project (DP)', sequence: 6 },
    { id: 'cp', label: 'Closing a Project (CP)', sequence: 7 },
  ],
};

function usage() {
  console.error(
    'Usage: node scripts/seed-firestore-project-type-phases.mjs [service-account.json] [--force]',
  );
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return String(value ?? '').trim();
}

function defaultPhaseLabel(phaseId) {
  const match = /^Phase\s*([0-9]+)$/i.exec(phaseId.trim());
  return match ? `Phase ${match[1]}` : phaseId;
}

function deriveFromRows(rows) {
  const seen = new Set();
  const phases = [];
  for (const item of rows) {
    const row = asRecord(item) ?? {};
    const phaseId = asString(row.phaseId);
    if (!phaseId || seen.has(phaseId)) continue;
    seen.add(phaseId);
    phases.push({
      id: phaseId,
      label: asString(row.label) || defaultPhaseLabel(phaseId),
      sequence: phases.length + 1,
    });
  }
  return phases;
}

function normalizePhases(rows) {
  return asArray(rows)
    .map((item) => {
      const row = asRecord(item) ?? {};
      const id = asString(row.id);
      if (!id) return null;
      const sequence = Number(row.sequence);
      return {
        id,
        label: asString(row.label) || defaultPhaseLabel(id),
        sequence: Number.isFinite(sequence) ? sequence : null,
      };
    })
    .filter(Boolean);
}

function resolveFallbackByName(name) {
  return PHASE_FALLBACKS[asString(name)] ?? [];
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

  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = asRecord(docSnap.data()) ?? {};
    const currentPhases = normalizePhases(data.phases);
    const activityDefaults = asArray(data.activitiesDefault);
    const derivedPhases = deriveFromRows(activityDefaults);
    const name =
      asString(asRecord(data.projectType)?.name) ||
      asString(data.name) ||
      asString(docSnap.id);
    const fallbackPhases = resolveFallbackByName(name);

    const merged = currentPhases.length > 0 ? [...currentPhases] : [];
    const seenIds = new Set(merged.map((item) => item.id));
    for (const row of (derivedPhases.length > 0 ? derivedPhases : fallbackPhases)) {
      if (!row.id || seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      merged.push(row);
    }
    for (const row of fallbackPhases) {
      if (!row.id || seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      merged.push(row);
    }

    merged.sort((left, right) => (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER));

    const unchanged = JSON.stringify(currentPhases) === JSON.stringify(merged);
    if (unchanged && !force) {
      skipped++;
      continue;
    }

    batch.set(docSnap.ref, { phases: merged }, { merge: true });
    batchCount++;
    updated++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        updated,
        skipped,
        force,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('[seed-firestore-project-type-phases]', error.message);
  process.exit(1);
});
