# Handoff: Refonte look-and-feel ProjectGrid — "Executive Slate"

## Overview
Nouvelle direction visuelle pour l'application Angular ProjectGrid (gestion de projets). Direction retenue : **Executive Slate** — sobre, dense, à dominante tableaux, inspirée des outils de gestion de projet d'entreprise (type MS Project). Remplace le look Bootstrap par défaut actuel (navbar noire, cards blanches génériques) par un système typographique et de couleurs plus affirmé.

## About the Design Files
Les fichiers de ce dossier sont des **références de design en HTML statique** — des maquettes montrant l'apparence et la structure visées, pas du code à copier tel quel. La tâche consiste à **recréer ces designs dans l'environnement Angular existant du projet** (composants, templates Angular, SCSS), en respectant les patterns déjà en place (Bootstrap grid, ng-bootstrap dropdowns, composants `app-*` partagés), pas à injecter du HTML brut.

## Fidelity
**Haute fidélité (hifi)** : couleurs, typographie, espacements et structure sont définitifs. Recrée l'UI au pixel près avec les outils déjà utilisés dans le repo (SCSS + classes Bootstrap existantes), sans ajouter de nouvelle dépendance UI.

## Design Tokens

### Couleurs (oklch → hex approximatif fourni pour référence rapide)
- Navy header / texte fort : `oklch(0.2 0.025 250)` ≈ `#1a2332`
- Accent ambre (soulignement onglet actif, badges super-user, barre navbar) : `oklch(0.65 0.13 75)` ≈ `#c98a2e`
- Fond page : `#ffffff`
- Bordures / séparateurs : `oklch(0.88 0.005 260)` ≈ `#dcdfe3`, `oklch(0.92 0.003 260)` ≈ `#e7e9eb`
- Texte secondaire : `oklch(0.5 0.01 260)` ≈ `#7c8288`, `oklch(0.55 0.01 260)` ≈ `#8a9096`
- Statuts :
  - En cours : `oklch(0.42 0.1 255)` texte / fond `oklch(0.94 0.03 255)` ≈ bleu `#2f5fa8` sur `#e9f0fb`
  - Terminé/OK : `oklch(0.5 0.14 145)` / `oklch(0.94 0.06 145)` ≈ vert `#2f8a52` sur `#e5f5ea`
  - Attention/En revue : `oklch(0.5 0.13 75)` / `oklch(0.95 0.05 75)` ≈ ambre `#a8752f` sur `#faf1e0`
  - Alerte/En pause/Critique : `oklch(0.55 0.18 25)` / `oklch(0.94 0.06 25)` ≈ rouge `#b8452f` sur `#fbe8e2`

### Typographie
- Titres (h1–h4, libellés projet) : **Source Serif 4**, weight 600–700
- Corps / UI / tableaux : **Source Sans 3**, weight 400–700
- Google Fonts : `Source Sans 3:wght@400;500;600;700` + `Source Serif 4:wght@600;700`
- Labels de colonnes/tableaux : uppercase, letter-spacing 0.4px, ~11px, weight 700

### Structure & forme
- Border-radius global : **2px** (tables, boutons, champs, badges, chips) — volontairement carré, pas de coins très arrondis
- Navbar : hauteur 56px, fond navy, **bordure basse 3px ambre**
- Onglet actif : texte navy bold + soulignement 3px ambre
- Boutons primaires : fond navy `#1a2332`, texte blanc, uppercase, letter-spacing 0.4px
- Boutons secondaires : fond blanc, bordure grise, texte gris foncé
- Tables : header gris clair `#f0f1f2` avec bordures haut/bas, lignes zébrées optionnelles (`#fafbfb`), padding cellule ~11px/12px

## Screens / Views
Toutes les captures sont dans `Refonte ProjectGrid.dc.html`, ancres `#1b`, `#2a`, `#2b`, `#3a`→`#3h`.

1. **Nav + Mes projets** (`#1b`) — navbar, header page + boutons Rafraîchir/Nouveau projet, filtres (recherche, statut, santé), table projets avec colonnes Projet/Propriétaire/Phase/Statut/Santé/Actions.
2. **Espace projet — Board** (`#2a`) — header projet (nom, phase, sélecteur santé), barre d'onglets (Scorecard/Risques/Budget/Roadmap/Board/Ressources + groupe "Gestion détaillée"), toolbar sprint + bouton ajouter activité, filtres phases en chips, 4 colonnes kanban (À faire/En cours/En revue/Terminé) avec cartes (avatar initiales, titre, tag).
3. **Espace projet — Scorecard** (`#2b`) — même header/onglets, KPIs (activités/types/phases), tableau croisé activités × phases avec badges de statut.
4. **Accueil / Tableau de bord** (`#3a`) — infos générales projet (PM/CM/BM/TM, sponsor, phase, statut, santé), avancement par activité (barres de progression), risques prioritaires, échéances proches.
5. **Roadmap** (`#3b`) — grille Gantt simplifiée : colonne activité + 12 mois, barres horizontales positionnées en %.
6. **Gestion des risques** (`#3c`) — matrice impact × probabilité (grille 4×4 avec pastilles), tableau risques prioritaires.
7. **Gestion du budget** (`#3d`) — 4 cartes KPI (budget initial/engagé/dépensé/prévision), tableau détail par poste.
8. **Ressources** (`#3e`) — onglets Ressources humaines/Autres, tableau disponibilité par semaine (colonnes S28-S31, cellules chargées en ambre clair si réduites).
9. **Paramètres** (`#3f`) — sélecteur de projet, onglets Paramètres du projet/Droits d'accès/Roles, sections "Affichage & interactions" (selects + toggles) et "Workflow des statuts" (liste éditable avec pastilles de couleur).
10. **Admin page** (`#3g`) — badge "Super user only", cartes Session active / Contexte applicatif, formulaire création projectType, liste des projectTypes.
11. **Mon compte** (`#3h`) — carte Profil (avatar, champs username/prénom/nom/email/rôle/type profil), carte Sécurité (changer mot de passe), actions Réinitialiser/Enregistrer.

## Interactions & Behavior
Ce lot ne change pas la logique/comportement de l'app (aucun nouveau flow) — uniquement l'habillage visuel des écrans et composants existants. Conserver tous les handlers Angular existants (`(click)`, `[(ngModel)]`, etc.); ne modifier que les classes/styles.

## Composants partagés à mettre à jour en priorité
- `src/app/shared/design-system/button/button.scss` — recolorer les variantes (`--pg-button-*` custom properties) selon les tokens ci-dessus ; passer `border-radius` à 2px ; `text-transform: uppercase` + `letter-spacing: 0.4px` sur variant primary/secondary.
- `src/app/app.scss` / `src/app/app.html` — navbar : fond navy `#1a2332`, ajouter `border-bottom: 3px solid #c98a2e`, police des liens en uppercase avec letter-spacing.
- `src/styles.scss` — statuts globaux (`.status-done`, `.status-inprogress`, etc.) à remapper sur la nouvelle palette de statuts ci-dessus.
- Chaque page (`projects-page`, `project-page`, `settings-page`, `admin-page`, `account-page`) : ajouter les polices Google Fonts, remplacer `.card`/`.table` Bootstrap par les styles définis (radius 2px, headers gris clair, bordures fines).

## Assets
Aucun asset image. Police Google Fonts à ajouter dans `index.html` ou `styles.scss` :
`https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap`

## Files
- `Refonte ProjectGrid.dc.html` — toutes les maquettes (HTML/CSS inline), ancres listées ci-dessus.
