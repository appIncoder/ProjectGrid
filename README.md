# ProjectGrid

ProjectGrid est maintenant une application Angular en mode Firebase-only.

## Stack active

- Firebase Auth pour l'authentification et la session
- Cloud Firestore pour les projets, types de projet, accès, risques et états de santé
- Aucun backend PHP/MySQL actif dans le runtime applicatif

## Modèle Firestore canonique

Le modèle canonique est désormais centré sur les documents eux-mêmes, sans sous-collections legacy métier.

### `users/{userId}`

- `username`
- `label`
- `email`
- `globalRoles`
- `projectIds`
- `currentProjectId`

### `projectTypes/{projectTypeId}`

- `projectType`
- `phases`
- `activities`
- `activitiesDefault`
- `tasks`
- `workflow`
- `displayInteractions`

### `projects/{projectId}`

- `id`
- `name`
- `description`
- `projectTypeId`
- `memberIds`
- `memberRoles`
- `payload`
- `createdAt`
- `updatedAt`

### `projects/{projectId}.payload`

- `id`
- `name`
- `description`
- `owner`
- `projectManager`
- `phases`
- `activities`
- `activityMatrix`
- `projectTasksMatrix`
- `ganttDependencies`
- `projectHealth`
- `projectRisks`
- `workflow`
- `displayInteractions`

## Règles de persistance actuelles

- Les paramètres d'affichage projet sont stockés dans `projects/{projectId}.payload.displayInteractions`
- Le workflow des statuts projet est stocké dans `projects/{projectId}.payload.workflow`
- Les defaults de type sont stockés dans `projectTypes/{projectTypeId}`
- Les risques projet sont stockés dans `projects/{projectId}.payload.projectRisks`

## Ce qui a été retiré

- API PHP
- dump SQL / schéma MariaDB actifs
- backend REST sélectionnable au runtime
- fallbacks Firestore vers sous-collections legacy comme:
  - `projects/{projectId}/risks`
  - `projectTypes/{projectTypeId}/activityDefaults`

## Scripts utiles

```bash
npm run migrate:auth:import
npm run migrate:firestore:import
npm run migrate:firestore:access
npm run seed:firestore:display-interactions
npm run seed:firestore:project-display-interactions
npm run seed:firestore:project-type-phases
npm run seed:firestore:access-policy
```

## Développement

```bash
npm install
npm run start
```

## Vérification TypeScript

```bash
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
```
