# ✅ Checklist - Firebase Permissions Fix

## Problème Original
```
FirebaseError: Missing or insufficient permissions
userId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
```

## Cause Principale
Les règles Firestore créaient une **dépendance circulaire** :
- Pour lire un document, les règles appellent `isSysAdmin()`
- `isSysAdmin()` essaie de lire le même document
- → Impossible!

## Corrections Apportées

### 1. Code TypeScript
- ✅ `firebase-project-data-backend.service.ts` - Meilleure gestion des erreurs
- ✅ Ajout de logs pour faciliter le debugging
- ✅ Retour de valeurs par défaut si le document n'existe pas

### 2. Règles Firestore
- ✅ Permet aux utilisateurs authentifiés de lire les documents (nécessaire pour les fonctions d'aide)
- ✅ Restreint les modifications aux admins et propriétaires
- ✅ Élimine la dépendance circulaire

### 3. Scripts d'Administration
- ✅ `debug-firestore-users.mjs` - Liste tous les utilisateurs et identifie les incohérences
- ✅ `test-user-access.mjs` - Teste l'accès d'un utilisateur spécifique
- ✅ `init-user-roles.mjs` - Initialise les rôles utilisateurs
- ✅ `set-user-role.mjs` - Assigne un rôle à un utilisateur

## Commandes d'Exécution

### Étape 1: Déployer les règles
```bash
firebase deploy --only firestore:rules
```
✅ **Déployé** - Les règles corrigées permettent aux utilisateurs de lire les documents

### Étape 2: Vérifier l'état des utilisateurs
```bash
node scripts/debug-firestore-users.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json
```
✅ **Résultat** - 7 utilisateurs Firebase Auth avec 7 documents Firestore synchronisés

### Étape 3: Initialiser les rôles
```bash
node scripts/init-user-roles.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json
```
✅ **Résultat** - L'admin (eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee) a le rôle `sysAdmin`

### Étape 4: Reconstruire l'accès aux projets
```bash
node scripts/rebuild-firestore-access.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json
```
✅ **Résultat** - 6 projets mis à jour, 7 utilisateurs traités

### Étape 5: Vérifier l'accès (test)
```bash
node scripts/test-user-access.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
```
✅ **Résultat** - L'admin a accès à 6 projets avec le rôle `sysAdmin`

## État Final

| Utilisateur | Email | Rôles | Projets | Status |
|---|---|---|---|---|
| eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee | admin@local.invalid | sysAdmin | 6 | ✅ |
| aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa | alice.dupont@example.org | (none) | 1 | ✅ |
| bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb | bruno.martin@example.org | (none) | 1 | ✅ |
| cccccccc-cccc-cccc-cccc-cccccccccccc | claire.leroy@example.org | (none) | 1 | ✅ |
| dddddddd-dddd-dddd-dddd-dddddddddddd | david.lambert@example.org | (none) | 1 | ✅ |

## Fichiers Modifiés

- ✅ `firestore.rules` - Règles Firestore corrigées
- ✅ `src/app/services/firebase-project-data-backend.service.ts` - Meilleure gestion des erreurs
- ✅ `docs/firebase-permissions-fix.md` - Documentation complète
- ✅ `scripts/debug-firestore-users.mjs` - Nouveau script
- ✅ `scripts/test-user-access.mjs` - Nouveau script
- ✅ `scripts/init-user-roles.mjs` - Nouveau script
- ✅ `scripts/set-user-role.mjs` - Nouveau script

## Vérification de la Correction

Pour vérifier que l'erreur est résolue:

1. **Accédez à l'app** en tant que l'admin (admin@local.invalid)
2. **Vérifiez** que la page "Projets" charge sans erreur
3. **Cherchez** l'erreur dans la console : `getCurrentUserAccess failed`
4. ✅ **Attendu** : Pas d'erreur, les projets s'affichent

## Maintenance Future

### Ajouter un nouvel utilisateur
```bash
# L'utilisateur est créé dans Firebase Auth
# Son document Firestore est créé automatiquement par la fonction `onCreate` 
# (ou manuellement si nécessaire)

# Initialiser ses rôles (si nécessaire)
node scripts/set-user-role.mjs service-account.json <user-id>

# Reconstruire l'accès aux projets
node scripts/rebuild-firestore-access.mjs service-account.json
```

### Modifier les rôles d'un utilisateur
```bash
# Modifier les rôles dans Firestore (manuellement ou via script)
# Puis reconstruire l'accès
node scripts/rebuild-firestore-access.mjs service-account.json
```

## Notes de Sécurité

- 🔒 Les utilisateurs ne peuvent lire que les documents nécessaires aux vérifications de permissions
- 🔒 Seuls les admins peuvent modifier les documents utilisateurs d'autres personnes
- 🔒 Les rôles (`globalRoles`) déterminent l'accès global
- 🔒 Les accès par projet sont stockés dans `projectIds`
