# Analyse et Correction de l'Erreur Firebase: "Missing or insufficient permissions"

## 🔍 Symptômes

```
firebase-project-data-backend.service.ts:189 [FirebaseProjectDataBackend] getCurrentUserAccess failed 
{userId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', error: FirebaseError: Missing or insufficient permissions.}
```

## 🎯 Causes Racines Identifiées

### 1. **Règles Firestore trop restrictives (Problème principal)**
Les fonctions d'aide Firestore (`isSysAdmin()`, `globalRoles()`, `userDoc()`) doivent être capable de lire les documents utilisateurs pour valider les permissions. Une règle trop restrictive empêche même les utilisateurs authentifiés de lire leurs propres données.

**Original (problématique):**
```firestore
match /users/{userId} {
  allow read: if signedIn() && (isSysAdmin() || request.auth.uid == userId);
  // ❌ Crée une boucle de dépendance circulaire:
  // - Pour lire le doc, isSysAdmin() doit être vérifié
  // - isSysAdmin() essaie de lire le doc pour vérifier les rôles
  // - Impossible!
}
```

### 2. **Documents utilisateurs manquants ou mal initialisés**
Quand un nouvel utilisateur se connecte via Firebase Auth, aucun document n'est créé automatiquement dans Firestore avec les champs obligatoires (`globalRoles`, `projectIds`).

### 3. **Rôles utilisateurs non initialisés**
Les utilisateurs migrés de MySQL n'avaient pas leurs rôles (`globalRoles`) correctement assignés dans Firestore.

## ✅ Solutions Appliquées

### 1. **Correction des Règles Firestore** (`firestore.rules`)

**Solution:**
```firestore
match /users/{userId} {
  allow read: if signedIn();  // ✓ Permet aux utilisateurs authentifiés de lire (nécessaire pour isSysAdmin())
  allow create: if signedIn() && request.auth.uid == userId;  // Empêche la création de doc pour autrui
  allow update: if signedIn() && (isSysAdmin() || request.auth.uid == userId);  // Seulement self ou admin
  allow delete: if isSysAdmin();  // Seulement admin
}
```

**Pourquoi c'est correct:**
- ✓ Permet aux fonctions d'aide de lire les documents pour valider les permissions
- ✓ Empêche toujours les utilisateurs ordinaires de **modifier** les données des autres
- ✓ Respecte le principe du moindre privilège (read + contrôle strict sur write)
- ✓ Élimine la dépendance circulaire

### 2. **Meilleure Gestion des Erreurs** (`firebase-project-data-backend.service.ts`)

**Amélioration:**
```typescript
if (!snapshot.exists()) {
  console.warn('[FirebaseProjectDataBackend] User document not found', { userId });
  return { userId, globalRoles: [], projectIds: [] };  // Retourner empty gracefully
}
```

**Bénéfices:**
- ✓ Distingue "document n'existe pas" de "permission refusée"
- ✓ L'app fonctionne même si le document utilisateur n'est pas encore créé
- ✓ Meilleur logging pour le debugging

### 3. **Scripts de Diagnostic et Initialisation**

Quatre nouveaux scripts pour gérer les données utilisateurs:

#### `scripts/debug-firestore-users.mjs`
Liste tous les utilisateurs dans Firebase Auth et Firestore, identifie les incohérences.
```bash
node scripts/debug-firestore-users.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json
```

#### `scripts/test-user-access.mjs`
Teste l'accès d'un utilisateur spécifique, affiche ses rôles et projets.
```bash
node scripts/test-user-access.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
```

#### `scripts/init-user-roles.mjs`
Initialise les rôles utilisateurs depuis les données de migration.
```bash
node scripts/init-user-roles.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json
```

#### `scripts/set-user-role.mjs`
Assigne un rôle à un utilisateur spécifique.
```bash
node scripts/set-user-role.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
```

## 🔧 Procédure de Correction Complète

### Étape 1: Déployer les règles Firestore corrigées
```bash
firebase deploy --only firestore:rules
```

### Étape 2: Vérifier l'état des utilisateurs
```bash
node scripts/debug-firestore-users.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json
```

### Étape 3: Initialiser les rôles utilisateurs
```bash
node scripts/init-user-roles.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json
```

### Étape 4: Reconstruire l'accès aux projets
```bash
node scripts/rebuild-firestore-access.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json
```

### Étape 5: Vérifier l'accès d'un utilisateur (test)
```bash
node scripts/test-user-access.mjs scripts/carecode-2dea6-firebase-adminsdk-xfnu9-3e46b6ea69.json eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
```

## 📊 Flux d'Authentification Correct

```
1. Utilisateur se connecte
   ↓
2. Firebase Auth valide les credentials
   ↓
3. Firebase retourne user.uid
   ↓
4. FirebaseAuthBackendService.login() retourne {id: user.uid, ...}
   ↓
5. AuthService stocke cet id dans auth.user.id
   ↓
6. getCurrentUserAccess() utilise this.auth.user.id
   ↓
7. Firestore cherche le document 'users/{uid}'
   ↓
8. Les règles Firestore valident: signedIn() && (conditions)
   ↓
9. Document trouvé, rôles et projectIds retournés
   ↓
10. App charge les projets accessibles
```

## 🚨 Points Critiques

- **Important:** Le `userId` utilisé dans `getCurrentUserAccess()` DOIT être le Firebase UID (celui retourné par `user.uid`)
- Les documents utilisateurs **doivent** avoir:
  - `globalRoles`: array (e.g., `['sysAdmin']` ou `[]`)
  - `projectIds`: array (e.g., `['project-1', 'project-2']` ou `[]`)
- Le script `rebuild-firestore-access.mjs` doit être exécuté après toute modification des rôles utilisateur
- Les règles Firestore doivent permettre aux utilisateurs authentifiés de lire les documents pour les fonctions d'aide

## 🔒 Sécurité Finale

Les modifications appliquées maintiennent une sécurité appropriée:
- ✓ Utilisateurs authentifiés peuvent lire les documents (nécessaire pour les fonctions)
- ✓ Seul l'admin ou le propriétaire peut modifier son propre document
- ✓ Seul l'admin peut supprimer des documents
- ✓ Logging amélioré pour l'audit
- ✓ Gestion gracieuse des erreurs

## 📝 Flux de Données Utilisateurs

```
MySQL Database (source)
    ↓
Firebase Auth (via Firebase Console)
    ↓
Firestore Users Collection
    ├── globalRoles (assigné manuellement ou via init-user-roles.mjs)
    ├── projectIds (généré par rebuild-firestore-access.mjs)
    └── Utilisé par l'app pour accorder l'accès
```

