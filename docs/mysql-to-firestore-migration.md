# MySQL To Firestore Migration

## Objective

Move the current MariaDB data set into Firestore using the Firebase schema already wired in the Angular app.

## What gets migrated

- Firebase Auth users
- `users` -> `users/{userId}`
- `project_health_default` -> `healthDefaults/{healthId}`
- `project_type*` defaults -> `projectTypes/{projectTypeId}`
- `project_type_activities_default` rows -> `projectTypes/{projectTypeId}/activityDefaults/{activityDefaultId}`
- `projects` -> `projects/{projectId}`

For each project document, the migration embeds:

- the original `projects.payload`
- `projectHealth` merged from `project_health`
- `projectRisks` merged from `project_risks` and `risks`
- `memberRoles` merged from `users_roles_projects` and `roles`
- `memberIds` derived from `memberRoles`

For each user document, the migration also maintains:

- `globalRoles`
- `projectIds` derived from project memberships

This matches the Firebase read/write model now used by the app.

## Prerequisites

1. A Firebase service account JSON file downloaded from Firebase Console
2. Install the missing dependency:

```bash
npm install firebase-admin
```

## Commands

Export only from the local SQL dump:

```bash
php scripts/export-mysql-to-firestore.php > tmp/firestore-export.json
```

Import an existing export:

```bash
node scripts/import-auth-users.mjs tmp/firestore-export.json /chemin/vers/service-account.json
node scripts/import-firestore-export.mjs tmp/firestore-export.json /chemin/vers/service-account.json
node scripts/rebuild-firestore-access.mjs /chemin/vers/service-account.json
```

Full migration in one command:

```bash
node scripts/migrate-mysql-to-firestore.mjs /chemin/vers/service-account.json
```

Optional alternative:

```bash
export FIREBASE_SERVICE_ACCOUNT_JSON="$(jq -c . /chemin/vers/service-account.json)"
node scripts/migrate-mysql-to-firestore.mjs
```

## Notes

- The exporter now tries the live MariaDB connection first.
- If MariaDB is unavailable, it falls back automatically to [carec1650622_5ucp3q.sql](/Users/glcpcregie2/Documents/GitHub/ProjectGrid/src/db/carec1650622_5ucp3q.sql).
- Firebase Auth import uses the existing MySQL `password_hash` values as `MD5` hashes with `rounds: 1`.
- The importer writes with `merge: true`.
- `projects.updatedAt` is written as a Firestore `Timestamp` so `orderBy('updatedAt')` keeps working.
- The payload keeps project dates as strings because the Angular normalizer already expects that shape.
- Access is now indexed in both directions:
  - `projects/{id}.memberIds`
  - `users/{uid}.projectIds`
- Project type task defaults are stored separately under:
  - `projectTypes/{projectTypeId}/activityDefaults/{activityDefaultId}`
