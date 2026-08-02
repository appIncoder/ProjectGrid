# Handoff: Refonte look-and-feel ProjectGrid — "Lumen"

## Overview
Nouvelle direction visuelle pour l'application Angular ProjectGrid (gestion de projets, Angular 21 + Bootstrap + Firestore). **Remplace intégralement la direction précédente "Executive Slate"** (navy `#1a2332` + ambre `#c98a2e`, Source Serif/Source Sans, radius 2px, navbar horizontale) actuellement en place dans `src/styles.scss`, `src/app/app.scss` et les SCSS de composants.

Lumen est clair, aéré, moderne, avec des codes ergonomiques empruntés aux réseaux sociaux : **sidebar verticale libellée**, recherche globale, avatars empilés, fil d'activité, mentions `@`, compteurs de commentaires, badges de notification, pills de filtres, anneaux de progression « stories ». **Aucune fonctionnalité n'est retirée** — tous les onglets, filtres et actions existants sont conservés.

## About the Design Files
Les fichiers de ce dossier sont des **références de design en HTML statique** — des maquettes montrant l'apparence et la structure visées, pas du code à copier tel quel. La tâche est de **recréer ces designs dans l'application Angular existante** (composants standalone, templates avec `@if`/`@for`, SCSS de composant), en respectant les conventions du repo (`.claude/CLAUDE.md` : signals, `input()`/`output()`, `OnPush`, class/style bindings — pas de `ngClass`/`ngStyle`).

## Fidelity
**Haute fidélité (hifi)** : couleurs, typographie, rayons, espacements et structure sont définitifs. Recrée l'UI au pixel près avec SCSS + les classes Bootstrap déjà utilisées ; n'ajoute aucune dépendance UI.

## Design Tokens

### Couleurs
| Rôle | oklch (source de vérité) | hex approx. |
| --- | --- | --- |
| Accent primaire (teal) | `oklch(0.45 0.13 195)` | `#1f7a86` |
| Accent hover / actif fort | `oklch(0.40 0.13 195)` | `#1a6b76` |
| Accent texte sur fond clair | `oklch(0.40 0.13 195)` | `#1a6b76` |
| Accent fond léger (chips, badges) | `oklch(0.95 0.03 195)` | `#dff1f3` |
| Texte principal | `oklch(0.22 0.03 200)` | `#1c2b2f` |
| Texte titres alternatif | `oklch(0.24 0.03 200)` | `#203034` |
| Texte secondaire | `oklch(0.53 0.02 200)` | `#718186` |
| Texte tertiaire / hints | `oklch(0.58 0.02 200)` | `#7e8d92` |
| Bordure standard | `oklch(0.93 0.006 195)` | `#e8eced` |
| Bordure fine (séparateurs internes) | `oklch(0.955 0.006 195)` | `#f0f3f4` |
| Fond sidebar / en-têtes de table | `oklch(0.975 0.006 195)` | `#f7f9f9` |
| Fond zone board | `oklch(0.985 0.004 195)` | `#fbfcfc` |
| Ligne zébrée de table | `oklch(0.988 0.004 195)` | `#fcfdfd` |
| Fond page | `#ffffff` | `#ffffff` |

### Statuts (fg / bg)
| Statut | Texte | Fond | Pastille |
| --- | --- | --- | --- |
| En cours (`inprogress`) | `oklch(0.40 0.13 195)` | `oklch(0.95 0.03 195)` | `oklch(0.55 0.16 195)` |
| Terminé / OK (`done`) | `oklch(0.42 0.13 150)` | `oklch(0.96 0.05 150)` | `oklch(0.60 0.16 150)` |
| En revue / Attention (`onhold`) | `oklch(0.50 0.13 75)` | `oklch(0.96 0.05 85)` | `oklch(0.75 0.15 85)` |
| Alerte / En pause (`notdone`) | `oklch(0.48 0.16 25)` | `oklch(0.96 0.05 25)` | `oklch(0.60 0.19 25)` |
| Neutre / À faire (`todo`) | `oklch(0.50 0.02 200)` | `oklch(0.96 0.006 195)` | `oklch(0.72 0.01 200)` |

### Couleurs d'avatars (rotation déterministe par utilisateur)
`oklch(0.55 0.16 195)` teal · `oklch(0.60 0.14 150)` vert · `oklch(0.72 0.14 60)` ambre · `oklch(0.65 0.15 320)` magenta · `oklch(0.55 0.18 25)` rouge. Initiales blanches, `font-weight: 700`.

### Typographie
- Police unique : **Space Grotesk** (400/500/600/700). Aucune serif.
- Import : `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap`
- Titre de page (h1/h2) : 26px, `font-weight: 700`, `letter-spacing: -0.7px`
- Titre d'écran projet : 20px, 700, `letter-spacing: -0.5px`
- Titre de carte (h3) : 15px, 700
- Corps / tableaux : 13–13.5px, 500–600
- Labels de colonnes / sur-titres : 10.5px, 700, uppercase, `letter-spacing: 0.5px`
- Métriques KPI : 24–26px, 700, `letter-spacing: -0.8px`
- Micro-texte (dates, compteurs) : 11.5–12px

### Formes & espacements (remplace radius 2px)
| Élément | Rayon |
| --- | --- |
| Conteneur d'écran / carte principale | 16px |
| Cartes kanban, lignes de risque, blocs internes | 12–14px |
| Boutons, champs, selects | 10–11px |
| Chips / pills / badges de statut | 8–9px |
| Avatars carrés (logo, tuiles) | 10–11px |
| Avatars ronds (personnes) | 50% |
- Ombres : très légères — `0 1px 2px rgba(20,40,50,0.07)` pour l'élément actif de sidebar et les cartes surélevées. Pas d'ombre sur les cartes bordées.
- Hauteur des contrôles : boutons/champs 36px (34px en secondaire compact), lignes de table ~44px.
- Padding cartes : 18px ; padding cellules de table 12–14px.
- `gap` flex/grid : 14–18px entre blocs, 8–10px entre éléments d'une liste.

## Structure de navigation (changement majeur)
La navbar horizontale Bootstrap (`.pg-navbar` dans `app.html`) est remplacée par :

1. **Sidebar verticale gauche, 232px**, fond `oklch(0.975 0.006 195)`, bordure droite `oklch(0.93 0.006 195)`, padding `20px 14px` :
   - logo (tuile teal 32px, radius 10px) + wordmark « ProjectGrid » 16px/700
   - liens : Accueil, Mes projets (badge compteur), Paramètres, Mon compte, Admin (label `super` quand super user). Item actif = fond blanc + radius 11px + ombre légère + icône teal + texte 700.
   - section « Épinglés » : projets favoris avec pastille de couleur
   - carte utilisateur en bas (avatar 34px + nom + rôle)
2. **Variante rail 76px** (icônes seules, sans libellés) pour les écrans projet denses (Board, Roadmap, Scorecard, Risques, Budget, Ressources) — mêmes items, item actif = tuile blanche à ombre légère.
3. **Topbar 62px** (écrans de liste/accueil) : champ de recherche 38px (radius 11px, bordure `oklch(0.92 0.006 195)`), cloche de notification avec badge rouge `oklch(0.6 0.19 25)`, boutons d'action à droite.
4. **En-tête projet** (écrans projet) : tuile projet 40–44px (initiales, fond `oklch(0.95 0.03 195)`, texte teal), titre, pills phase + santé, avatars empilés de l'équipe, bouton primaire ; puis **barre d'onglets** soulignés (actif : texte teal 700 + `border-bottom: 2.5px solid` teal) : Scorecard · Risques · Budget · Roadmap · Board · Ressources ; à droite, le groupe « Gestion » (Projet / Métier / Changement / Techno) en chips gris clair.

## Motifs d'interface réutilisables
- **Avatars empilés** : ronds 25–30px, `border: 2px solid #fff`, `margin-left: -7px` à partir du 2e, dernier item `+N` sur fond `oklch(0.95 0.006 195)`.
- **Pills de filtre** : conteneur `oklch(0.965 0.006 195)` radius 11px padding 4px ; item actif fond blanc radius 8px + ombre légère (ou fond teal + texte blanc pour les filtres de phase).
- **Barre de progression** : hauteur 6–8px, radius 99px, piste `oklch(0.95 0.006 195)`, remplissage teal (ou ambre/rouge selon la santé). Variante segmentée multi-couleurs pour l'avancement par statut.
- **Anneaux « stories »** (portefeuille projets) : cercle 58px, `padding: 2.5px`, `background: conic-gradient(<couleur> 0% <pct>%, oklch(0.93 0.006 195) <pct>% 100%)`, disque blanc interne, tuile d'initiales 46px au centre ; libellé + % dessous. Dernière tuile = `+ Ajouter` en pointillés.
- **Fil d'activité** : ligne = avatar 30–32px + phrase (nom en 700, entités en 700, statut coloré) + horodatage 11.5px ; commentaire = bulle fond `oklch(0.97 0.004 285→195)` radius 12px ; mentions `@Nom` en teal 700 ; actions « Répondre » + compteur de réactions.
- **Compteur de commentaires** : icône bulle 13–15px (stroke 1.9–2) + nombre, `oklch(0.5 0.02 200)`, 600.
- **Toggle** : piste 40×22px radius 99px (teal si actif, `oklch(0.9 0.006 195)` sinon) + pastille blanche 18px.
- **Cartes kanban** : fond blanc, bordure `oklch(0.93 0.006 195)`, radius 14px, padding 13–14px, tag catégorie en pill colorée en haut, titre 13.5px/600, pied = avatar + compteur commentaires + échéance/pill d'alerte. Carte de la colonne active : bordure `1.5px solid oklch(0.85 0.06 195)`. Cartes terminées : `opacity: 0.72` + titre `line-through`.
- **Tableaux** : conteneur bordé radius 16px `overflow: hidden` ; en-tête fond `oklch(0.975 0.006 195)` sans bordures dures ; lignes séparées par `1px solid oklch(0.955 0.006 195)` ; zébrage `oklch(0.988 0.004 195)`. Implémentables en CSS grid (comme les maquettes) ou en `.table` restylée.
- **Lignes de risque** : carte bordée avec `border-left: 4px solid <couleur de niveau>`, radius 14px.

## Screens / Views
Maquettes dans `Refonte ProjectGrid.dc.html` (turn 5, ancres `#5a`→`#5j`). La direction complète est également visible sur l'écran d'origine `#4b`.

| Ancre | Écran | Contenu |
| --- | --- | --- |
| `#4b` | Mes projets | Topbar + stories de phase + pills de filtre + grille 2 colonnes de cartes projet (3 métriques : avancement / budget / risques) |
| `#5a` | Accueil / Tableau de bord | En-tête projet, 4 KPI, équipe (PM/CM/BM/TM), avancement par activité, fil d'activité, échéances proches |
| `#5b` | Espace projet — Board | En-tête projet + onglets + groupe Gestion, filtres de phase, 4 colonnes kanban |
| `#5c` | Scorecard | Grille activités × phases avec badges de statut, légende, managers en avatars |
| `#5d` | Roadmap | Gantt 12 mois en barres arrondies avec % dans la barre, mois courant surligné, jalons en losanges |
| `#5e` | Gestion des risques | Matrice impact × probabilité (cellules teintées), 3 KPI, liste de risques avec bordure gauche colorée |
| `#5f` | Gestion du budget | 4 KPI (initial / engagé / dépensé / prévision en alerte), table détail par poste avec barres de consommation + ligne Total |
| `#5g` | Ressources | Pills RH / Autres, table de charge par semaine (S28–S31) avec pills de jours colorées par tension |
| `#5h` | Paramètres | Sélecteur de projet, onglets Projet / Droits d'accès / Rôles, « Affichage & interactions » (selects + toggles), « Workflow des statuts » (5 statuts éditables) |
| `#5i` | Admin page | Badge « Super user only », Session active, Contexte applicatif, création de projectType, liste des projectTypes |
| `#5j` | Mon compte | Profil (avatar 72px radius 22px + 6 champs), Sécurité, Notifications (3 toggles) |

## Interactions & Behavior
Ce lot est **purement visuel** : aucun nouveau flow, aucune logique modifiée. Conserver intégralement les handlers, signals, services et routes existants (`app.routes.ts` inchangé) ; ne toucher qu'aux classes, styles et structure de markup nécessaire au nouveau layout (sidebar au lieu de navbar).

Les éléments « sociaux » affichés dans les maquettes (fil d'activité, compteurs de commentaires, mentions) sont **des emplacements visuels**. Si les données ne sont pas encore en base, les câbler sur des données existantes (dernière modification, assignés) ou masquer le bloc — ne pas inventer de collection Firestore sans validation.

## Fichiers à mettre à jour en priorité
1. `src/index.html` ou `src/styles.scss` — remplacer l'import Google Fonts (Source Sans 3 / Source Serif 4) par **Space Grotesk**.
2. `src/styles.scss` — réécrire le bloc de tokens `:root` (`--pg-*`) avec les valeurs Lumen ci-dessus ; `--pg-radius` passe de `2px` à une échelle (`--pg-radius-sm: 9px`, `--pg-radius: 11px`, `--pg-radius-lg: 16px`) ; retirer `--pg-font-heading` serif ; remapper `.status-*` sur la nouvelle table de statuts ; adapter les overrides `.card` / `.table`.
3. `src/app/app.html` + `src/app/app.scss` — **remplacer la navbar horizontale par la sidebar 232px** (+ variante rail sur les routes projet) ; conserver les `routerLink`, `routerLinkActive`, le contrôle « Check access as » (sysadmin) et le bouton de logout (déplacés dans la carte utilisateur en bas de sidebar) ; footer conservé mais allégé.
4. `src/app/shared/design-system/button/button.scss` — variantes primaire (fond teal, texte blanc, radius 11px, 36px, **plus d'uppercase ni de letter-spacing**) et secondaire (fond blanc, bordure `oklch(0.92 0.006 195)`, texte `oklch(0.3 0.02 200)`), 13px/600–700.
5. `src/styles.scss` `.btn-add` — aligner sur la variante primaire teal (remplace le bleu `#0d6efd`).
6. Composants projet : `project-board`, `project-score-card`, `project-roadmap`, `project-risks`, `project-budget`, `project-ressources` — appliquer les motifs (cartes radius 14–16px, en-têtes de table `oklch(0.975 0.006 195)`, pills de statut, avatars empilés, barres de progression arrondies). Les blocs partagés `.scorecard-card-body` / `.roadmap-card-body` / `.board-card-body` et `.scorecard-kpi` / `.roadmap-kpi` / `.board-kpi` de `styles.scss` sont le bon point d'entrée mutualisé.
7. Pages : `projects-page`, `project-page` (barre d'onglets soulignés + groupe Gestion), `settings-page`, `admin-page`, `account-page`, `home-page`.
8. Modales et popovers (`project-task-edit-modal`, `project-kanban-task-modal`, `confirm-dialog`, `change-password-modal`, `task-assignment-popover`, `task-hover-tooltip`) — radius 16px, boutons teal, typo Space Grotesk.

## Assets
Aucun asset image. Icônes : SVG inline `stroke` 1.8–2, `viewBox="0 0 24 24"`, `stroke-linecap="round"`, taille 14–19px (voir les maquettes pour les tracés : accueil, grille, réglages, profil, bouclier, cloche, loupe, bulle, calendrier, alerte, tri).

## Files
- `Refonte ProjectGrid.dc.html` — toutes les maquettes. Direction Lumen : ancres `#4b` et `#5a`→`#5j` (les turns antérieurs contiennent les directions écartées, dont Executive Slate — les ignorer).
