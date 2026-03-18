# Firebase Migration Plan

## Objective

Replace the current PHP + MariaDB backend with a Firebase-based backend while keeping the Angular application usable during the transition.

## Current State

The current backend is centered around [src/api/index.php](/Users/glcpcregie2/Documents/GitHub/ProjectGrid/src/api/index.php) and relies on MariaDB for:

- authentication against `users`
- project access control through `users_roles_projects` and `roles`
- project persistence in `projects`
- relational project sub-data in dedicated tables such as:
  - `project_risks`
  - `project_health`
  - `project_changes`
  - `project_tasks`
  - `project_task_comments`
  - `project_activities_links`
  - `project_phases`

The frontend consumes that backend through REST in:

- [src/app/services/auth.service.ts](/Users/glcpcregie2/Documents/GitHub/ProjectGrid/src/app/services/auth.service.ts)
- [src/app/services/project-data.service.ts](/Users/glcpcregie2/Documents/GitHub/ProjectGrid/src/app/services/project-data.service.ts)

## Target Firebase Architecture

### Firebase products

- Firebase Auth
  - replaces `/auth/login`
  - becomes the source of identity
- Cloud Firestore
  - replaces MariaDB tables for operational data
- Cloud Functions
  - replaces privileged PHP write endpoints
  - performs validation and server-side mutations
- Firebase Security Rules
  - replaces most SQL-based access checks for reads/writes

### Recommended Firestore model

`users/{userId}`

- `username`
- `label`
- `email`
- `globalRoles`
- `projectIds`
- `status`

`projects/{projectId}`

- `name`
- `description`
- `projectTypeId`
- `phases`
- `phaseDefinitions`
- `activities`
- `activityMatrix`
- `projectTasksMatrix`
- `ganttDependencies`
- `activeHealthShortName`
- `memberIds`
- `memberRoles`
- `createdAt`
- `updatedAt`

`projects/{projectId}/risks/{riskId}`

- `shortName`
- `longName`
- `description`
- `probability`
- `criticity`
- `status`
- `remainingRiskId`
- `createdAt`
- `updatedAt`

`projects/{projectId}/health/{healthId}`

- `shortName`
- `longName`
- `description`
- `status`
- `createdAt`
- `updatedAt`

`projects/{projectId}/changes/{changeId}`

- `changeType`
- `source`
- `payload`
- `createdAt`

`projectTypes/{projectTypeId}`

- `name`
- `description`
- `phases`
- `activities`
- `activitiesDefault`

### Access model

Do not recreate `users_roles_projects` as a join table in Firestore.

Prefer:

- `users/{userId}.globalRoles`
- `users/{userId}.projectIds = ['projectA', 'projectB']`
- `projects/{projectId}.memberIds = ['uidA', 'uidB']`
- `projects/{projectId}.memberRoles.{userId} = ['projectAdmin', 'projectTeamMember']`

This allows:

- simple rule evaluation
- direct fetch of project permissions
- a reliable "list my projects" path without querying the whole `projects` collection

## Route Mapping

### Replace with Firebase Auth

Current REST:

- `POST /auth/login`

Target:

- Angular authenticates directly with Firebase Auth
- if username/password must be preserved, use email/password or a custom auth flow via Cloud Functions

### Replace with Firestore direct reads or callable Functions

Current REST reads:

- `GET /projects`
- `GET /projects/{id}`
- `GET /projects/{id}/risks`
- `GET /users`
- `GET /project-types`
- `GET /project-types/{id}/defaults`
- `GET /project-health-defaults`

Target:

- Firestore reads directly from Angular when rules are sufficient
- callable Functions only when derived data or privileged access is required

### Replace with Cloud Functions

Current REST writes:

- `POST /projects`
- `DELETE /projects/{id}`
- `POST /projects/{id}/health`
- `POST /projects/{id}/risks`
- `PUT /projects/{id}/risks/{riskId}`
- `POST /projects/{id}/procedure`
- `POST /projects/{id}/rebuild-payload`

Target:

- callable Functions for validated writes and complex mutations
- direct Firestore writes only for simple, rule-safe cases

## Data Mapping Notes

### Projects

The current backend already stores a large canonical JSON payload in `projects.payload`. That is the best bridge into Firestore.

Migration rule:

- treat `projects.payload` as the primary source for the initial Firestore project document
- enrich from relational tables only when payload is incomplete

### Risks

Current model splits risk data between `risks` and `project_risks`.

Target model:

- collapse the effective risk view into `projects/{projectId}/risks/{riskId}`
- do not keep a second global `risks` collection unless cross-project reuse is a real requirement

### Health

Current model has:

- defaults table
- project-specific rows with one active value

Target model:

- store defaults as static configuration or `healthDefaults/{healthId}`
- store project health rows under the project
- also store `activeHealthShortName` in the project document for list views

### Tasks and comments

The current relational shape is complex and highly normalized.

Target model:

- keep `activityMatrix` and `projectTasksMatrix` embedded in the project document if document size remains safe
- if project payload grows too large, split tasks into subcollections by phase or parent activity

## High-Risk Areas

### 1. Access control

Current authorization is relational and dynamic. It must be redesigned, not translated line by line.

### 2. Transactional saves

`save_project_detail()` currently updates multiple tables in one transaction. In Firebase:

- use Firestore transactions only for limited document sets
- use callable Functions for coordinated mutations

### 3. DDL auto-healing

Functions such as `ensure_project_risks_table()` and `ensure_access_project_fk()` have no Firebase equivalent. This logic disappears entirely after migration.

### 4. Delete cascade

`delete_project_everywhere()` currently deletes multiple dependent tables. In Firebase, cascade deletion must be explicit in a Cloud Function.

## Migration Phases

### Phase 1: Frontend decoupling

- add explicit backend provider config
- isolate auth and project access behind replaceable service boundaries
- keep provider on `rest` by default

### Phase 2: Firebase bootstrap

- add Firebase SDK dependencies
- configure Firebase app initialization
- add Firebase Auth integration

### Phase 3: Auth migration

- replace REST login with Firebase Auth
- replace `X-User-Id` header strategy with Firebase ID token handling

### Phase 4: Read migration

- migrate `project-types`
- migrate `project-health-defaults`
- migrate `projects`
- migrate `project detail`
- migrate `project risks`

### Phase 5: Write migration

- migrate risk create/update
- migrate project save
- migrate project delete
- migrate project health update

### Phase 6: Data migration

- export MariaDB data
- transform to Firestore import format
- backfill Firebase
- verify role assignments and project visibility

### Phase 7: PHP retirement

- remove REST endpoints no longer used
- archive SQL schema migration logic
- cut over frontend environment to Firebase

## First Concrete Implementation Slice

Recommended first slice:

1. Add Firebase configuration support in Angular.
2. Add service abstractions so REST and Firebase implementations can coexist.
3. Migrate authentication first.
4. Then migrate project listing and project detail reads.

This reduces risk because the current app is heavily centered on project reads and auth state.
