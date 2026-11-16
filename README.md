# PK-01 · Portfolio de Pinkoune

Portfolio de **Jérémy Barcelo** (Pinkoune), alternant DevOps / plateforme à Toulouse.
Un vaisseau low-poly en orbite autour d'un trou noir, un pingouin rose aux commandes, et un mode classique
pour qui préfère une page web toute simple.

**En ligne :** https://pinkoune.github.io/Portfolio-overpowered/

> État : **phase 6** — vaisseau 3D complet (salles, Pinkoune, progression, son) et mode classique, optimisés pour le mobile, accessibles (WCAG 2.1 AA vérifié en CI), référencés (Open Graph, données structurées) et sous budget de performance.

## Stack

| Rôle      | Outils                                                             |
| --------- | ------------------------------------------------------------------ |
| App       | Vite, React 19, TypeScript strict                                  |
| 3D        | three.js, React Three Fiber (chargés à la demande)                 |
| État      | Zustand (persistance localStorage protégée)                        |
| Contenu   | YAML bilingues validés par Zod, exposés au build en module virtuel |
| Qualité   | ESLint, Prettier, Vitest, Playwright + axe, Lighthouse CI          |
| Livraison | GitHub Actions → GitHub Pages (phase B : Docker → homelab)         |

## Démarrer

```bash
nvm use            # Node 22
npm ci
npm run dev        # http://localhost:5173/
npm run check      # lint, format, types, contenu, tests
npm run build && npm run preview   # http://localhost:4173/Portfolio-overpowered/
npm run size       # budget de taille (après build)
npm run e2e        # tests de bout en bout (après build ; npx playwright install chromium la 1re fois)
```

## Organisation

```
content/        tout le texte du site, en YAML { fr, en }
public/media/   captures des projets
src/content/    schémas Zod, assemblage, plugin Vite
src/classic/    mode classique (sans 3D)
src/three/      vaisseau 3D (salles, caméra, trou noir, modèles)
src/ui/         composants partagés (losanges, boutons, panneau holo…)
src/i18n/       langue courante et formatage
design/         direction artistique de référence (export Claude Design)
```

La 3D, l'interface, la gamification et le contenu sont indépendants : le mode classique n'importe
jamais la 3D (règle ESLint), et le contenu ne contient aucun code.

## Mettre à jour le site

Tout le contenu est dans `content/`. Chaque texte affiché a ses deux langues côte à côte :

```yaml
tagline:
  fr: RPG textuel multijoueur dans le navigateur
  en: Multiplayer text RPG in the browser
```

Après une modification, `npm run validate:content` vérifie tout (champs manquants, traduction absente,
lien invalide, référence cassée) et indique le fichier et le champ fautifs. La CI fait la même chose et
bloque le déploiement en cas d'erreur.

> **Attention aux virgules** : dans la forme courte `{ fr: …, en: … }`, un texte qui contient une virgule
> ou deux-points doit être entre guillemets : `{ fr: "Un, deux", en: "One, two" }`.

### Ajouter un projet

1. Copier un fichier de `content/projects/` (ex. `rptext.yaml`) sous un nouveau nom en minuscules
   avec des tirets : `mon-projet.yaml`. Le nom du fichier est l'identifiant du projet.
2. Remplir les champs. `order` fixe la position dans la liste ; `archived: true` le range dans les
   Archives ; `todo: [demo, media]` affiche un badge discret tant qu'un élément manque.
3. Sa planète sur la carte stellaire est placée automatiquement. Pour la forcer :
   `planet: { orbit: 5, angle: 1.2, size: 0.4, color: '#5CE1E6' }`.
4. Captures : déposer l'image dans `public/media/projects/` et l'ajouter dans `media:`.

### Ajouter une compétence

Ajouter une ligne dans la catégorie voulue de `content/skills/` :
`- { name: Kubernetes, level: 4 }` (niveau de 1 à 5, optionnel). Nouvelle catégorie = nouveau fichier.

### Ajouter une étape de parcours

Un fichier par étape dans `content/journey/` ; `start` / `end` au format `2025` ou `2025-01`,
`end: present` pour une étape en cours. Le tri du plus récent au plus ancien est automatique.

### Modifier un texte de l'interface

Les libellés (boutons, menus…) sont dans `content/site/ui.yaml`. Les textes de présentation sont dans
`content/site/profile.yaml`, ceux des salles dans `content/site/rooms.yaml`.

### Ajouter un succès

Un fichier par succès dans `content/achievements/`. `trigger.event` doit être un événement connu
(liste `GAME_EVENTS` dans `src/content/schema.ts`), `count` un nombre ou `all`. Un nouveau type
d'événement demande de l'émettre dans le code (`useStore.getState().emit('mon.evenement')`).
Les rangs et l'XP des visites sont dans `content/site/ranks.yaml`.

### Répliques de Pinkoune

`content/site/rooms.yaml` (`penguin:`) pour la réplique de chaque salle, `content/site/penguin.yaml` pour
les félicitations de rang et les conseils qu'il glisse après 30 s d'immobilité. Deux lignes maximum.

### Riff de basse

Déposer un enregistrement court (quelques secondes, MP3) sous `public/audio/bass-riff.mp3` : il sera joué
à la place de la note synthétisée quand on clique la basse des Quartiers.

Le mode éditeur (CMS sur `/admin`) arrive en phase 7.

## CI/CD

`.github/workflows/ci.yml`, à chaque pull request et push, deux jobs en parallèle :

- **check** : lint → format → typecheck → validation du contenu → tests → build → budget de taille
  (tableau dans le résumé du job) ;
- **e2e** : Playwright sur bureau et mobile (mode classique et vaisseau 3D en WebGL logiciel, audit
  d'accessibilité axe), puis Lighthouse (accessibilité, bonnes pratiques, SEO ≥ 95). Rapports en artefact.

Sur `main`, si les deux jobs passent, le build est publié sur GitHub Pages (job `deploy`, environnement
`github-pages`).

Prérequis (une fois) : _Settings › Pages › Build and deployment › Source_ = **GitHub Actions**.

Le base path de Vite vaut `/Portfolio-overpowered/` en build et en preview, `/` en dev.
`VITE_BASE=/ npm run build` produit un build servi à la racine (homelab, phase B) ; `VITE_SITE_URL`
donne l'adresse publique utilisée par les balises de partage, robots.txt et sitemap.xml.

## Crédits

Voir [CREDITS.md](CREDITS.md).
