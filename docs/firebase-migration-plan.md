# Firebase Architecture

## Status

ProjectGrid is now Firebase-only.

The legacy PHP API, MariaDB schema, SQL dump, and MySQL migration scripts have been decommissioned from the repository. The Angular app no longer selects a REST backend at runtime.

## Active backend

- Firebase Auth for login/session
- Cloud Firestore for project data, project type defaults, risks, health, and access metadata

## Current application flow

- [src/app/services/auth.service.ts](/Users/glcpcregie2/Documents/GitHub/ProjectGrid/src/app/services/auth.service.ts) uses [firebase-auth-backend.service.ts](/Users/glcpcregie2/Documents/GitHub/ProjectGrid/src/app/services/firebase-auth-backend.service.ts:1)
- [src/app/services/project-data.service.ts](/Users/glcpcregie2/Documents/GitHub/ProjectGrid/src/app/services/project-data.service.ts:1) uses [firebase-project-data-backend.service.ts](/Users/glcpcregie2/Documents/GitHub/ProjectGrid/src/app/services/firebase-project-data-backend.service.ts:1)

## Firestore model

The canonical model is now document-centric. Legacy fallback reads from Firestore subcollections have been removed from the active backend.

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
- `memberIds`
- `memberRoles`
- `payload`
- `createdAt`
- `updatedAt`

`projects/{projectId}.payload`

- `phases`
- `activities`
- `activityMatrix`
- `projectTasksMatrix`
- `ganttDependencies`
- `displayInteractions`
- `workflow`
- `projectRisks`
- `projectHealth`
- `activeHealthShortName`

`projectTypes/{projectTypeId}`

- `name`
- `description`
- `phases`
- `activities`
- `activitiesDefault`
- `tasks`
- `workflow`
- `displayInteractions`

## Operational scripts

- `npm run migrate:auth:import`
- `npm run migrate:firestore:import`
- `npm run migrate:firestore:access`
- `npm run seed:firestore:display-interactions`

These scripts target Firebase only. No PHP or SQL script remains in the active backend path.

## Canonical storage rules

- Project display settings are stored in `projects/{projectId}.payload.displayInteractions`
- Project workflow is stored in `projects/{projectId}.payload.workflow`
- Project risks are stored in `projects/{projectId}.payload.projectRisks`
- Project type defaults are stored directly in `projectTypes/{projectTypeId}`
