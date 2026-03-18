import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

function run(command, args, options = {}) {
  const {
    captureStdout = true,
    ...spawnOptions
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: captureStdout ? ['ignore', 'pipe', 'inherit'] : ['ignore', 'inherit', 'inherit'],
      ...spawnOptions,
    });

    const chunks = [];
    if (captureStdout && child.stdout) {
      child.stdout.on('data', (chunk) => chunks.push(chunk));
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }
      resolve(captureStdout ? Buffer.concat(chunks) : Buffer.alloc(0));
    });
  });
}

async function main() {
  const serviceAccountPath = process.argv[2] ? path.resolve(process.argv[2]) : '';
  const exportPath = process.argv[2]
    ? path.resolve(process.argv[3] ?? path.resolve('tmp', `firestore-export-${Date.now()}.json`))
    : path.resolve('tmp', `firestore-export-${Date.now()}.json`);
  const sqlDumpPath = path.resolve('src/db/carec1650622_5ucp3q.sql');

  await mkdir(path.dirname(exportPath), { recursive: true });

  const exported = await run('php', ['scripts/export-mysql-to-firestore.php', sqlDumpPath]);
  await writeFile(exportPath, exported);

  console.log(`[migrate-mysql-to-firestore] export written to ${exportPath}`);

  const authImportArgs = ['scripts/import-auth-users.mjs', exportPath];
  if (serviceAccountPath) {
    authImportArgs.push(serviceAccountPath);
  }
  await run('node', authImportArgs, { captureStdout: false });

  const importArgs = ['scripts/import-firestore-export.mjs', exportPath];
  if (serviceAccountPath) {
    importArgs.push(serviceAccountPath);
  }

  await run('node', importArgs, { captureStdout: false });

  if (serviceAccountPath) {
    await run('node', ['scripts/rebuild-firestore-access.mjs', serviceAccountPath], { captureStdout: false });
  }
}

main().catch((error) => {
  console.error('[migrate-mysql-to-firestore]', error.message);
  process.exit(1);
});
