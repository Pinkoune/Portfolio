# CLAUDE.md — PK-01, portfolio de Pinkoune

Mémoire des décisions du projet. À tenir à jour à chaque phase.

## Projet

Portfolio 3D gamifié de Jérémy Barcelo (Pinkoune), alternant DevOps / plateforme. On y visite un vaisseau
low-poly en orbite autour d'un trou noir (« la Pupille »), guidé par un pingouin rose. Cible : recruteurs
(après le diplôme de septembre 2027) et visiteurs curieux. Un **mode classique** (page scrollable, même
contenu, sans 3D) est toujours disponible.

## Références

- `design/` : export Claude Design, **référence visuelle à respecter**. `Pinkoune DA.dc.html` (identité,
  tokens), `Pinkoune #U00c9crans.dc.html` (maquettes), `Pinkoune HUD.dc.html`, `Pinkoune Motion.dc.html`,
  `pinkoune-3d.js` (trou noir, pingouin, vaisseau en three.js), `pk-motion.js` (timings).
  À ignorer : `support.js`, `.thumbnail`, `github.md`, `shots/`.
  Pour voir les maquettes : `python3 -m http.server` dans `design/` (les CDN unpkg sont bloqués dans le
  bac à sable cloud ; servir react/three depuis node_modules via `page.route` Playwright).
- Plan validé : 8 phases (voir plus bas).

## Décisions validées

- **Salles** (codes PK-01 → 07) : `bridge` Pont · `starmap` Carte stellaire · `arsenal` Arsenal ·
  `machines` Salle des machines · `logbook` Journal de bord · `quarters` Quartiers · `comms` Comms.
  Les noms de salle des maquettes (Labo, Armurerie, Archives, Hangar, Com) sont remplacés par ceux-ci.
  **Trophées** = écran récapitulatif des succès, ouvert depuis le compteur du HUD, toujours accessible
  (pas de verrou de rang).
- Brief prioritaire sur les maquettes : pas d'email de contact, pas de borne d'arcade ni de mini-jeu,
  vrais projets à la place des projets fictifs.
- **CMS** : Sveltia CMS sur `/admin` (phase 7), connexion GitHub sans serveur (PKCE ou token fin).
- **Niveaux Arsenal** : échelle de 1 à 5 proposée par Claude, marquée `TODO` dans `content/skills/*.yaml`,
  à valider par Jérémy.
- **Livraison** : on développe sur la branche de session, une PR vers `main` par phase, Jérémy merge
  (ce qui déploie). Chaque commit porte
  `Co-authored-by: Jérémy Barcelo <76524822+Pinkoune@users.noreply.github.com>` (adresse noreply pour ne
  pas exposer d'email), et la PR est assignée à `Pinkoune`.
- **i18n maison** (`src/i18n/`) au lieu de react-i18next : tous les textes vivent dans les YAML en
  `{ fr, en }` ; `useT()` expose `t()`, `ui(key, params)`, `name()`, `date()`. FR par défaut ; détection =
  première langue supportée dans `navigator.languages`.
- **Polices auto-hébergées** via `@fontsource-variable` (Archivo `wdth.css`, Martian Mono `wdth.css`,
  Instrument Sans `wght.css`). Familles CSS : `'Archivo Variable'`, `'Martian Mono Variable'`,
  `'Instrument Sans Variable'`.
- **Son** (phase 5) : Web Audio maison (`src/audio/sound.ts`), **tout est synthétisé** (aucun fichier tiers,
  donc rien à créditer), coupé par défaut, réglage `soundOn` persisté. Riff `public/audio/bass-riff.mp3`
  joué à la place de la note de basse s'il existe (vérifié par `content-type` audio, le serveur de dev
  renvoie index.html). `SoundDirector` (monté avec la 3D seulement : le classique reste muet) relie le
  store aux sons ; la montée de rang joue son accord depuis `RankUp`. `sound.on(name)` permet aux visuels
  de réagir même son coupé (cordes de la basse).
- **TypeScript 6.0.x** (et non 7) : typescript-eslint ne supporte pas encore TS ≥ 6.1.
- **Mode au démarrage** (`src/app/capabilities.ts`) : 3D par défaut ; classique d'office sans WebGL ou sur
  appareil faible = rendu WebGL logiciel (SwiftShader, llvmpipe…) ou `deviceMemory` ≤ 2. **Ne pas utiliser
  `hardwareConcurrency`** : Safari iOS, Firefox anti-pistage et Brave le plafonnent à 2 (bug corrigé après
  la phase 3 : des machines récentes arrivaient en classique). Le choix explicite du visiteur
  (`preferredMode`, persisté) l'emporte toujours : le bouton « Embarquer en 3D » n'est jamais désactivé.
  Si la 3D ne démarre pas (contexte WebGL refusé, chunk introuvable), `Failsafe` (error boundary) remet le
  classique pour la visite (`threeFailed`) avec un bandeau explicatif. La 3D est un `lazy()` : three.js
  n'est téléchargé qu'à l'embarquement.
- **Pas de drei** : `Html` de drei crée une racine React par hotspot (erreurs `removeChild` au démontage).
  Les hotspots sont des boutons DOM dans l'arbre principal (`HotspotLayer`), positionnés à chaque image
  par `HotspotProjector` depuis un registre d'ancres 3D (`three/hotspots.ts`).
- **Rendu** : `<Canvas flat>` (pas de tone mapping, comme la DA), DPR ≤ 1,75 desktop / 1,5 mobile.
- **Post-traitement** : bibliothèque `postprocessing` utilisée directement (`objects/PostFx.tsx`,
  EffectComposer en `useFrame` priorité 1), pas `@react-three/postprocessing` (dépendances n8ao/maath
  inutiles). Bloom seuil 0,62, allégé sur mobile. Conséquence : tout passe par un rendu linéaire réencodé
  en sRGB à la sortie — un ShaderMaterial maison doit sortir des couleurs **linéaires** (le shader de la
  Pupille fait `pow(col, 2.2)` en sortie).
- **Arrivée à bord** (`state.stage` : `boot` → `aboard`) : `BootScreen` (DOM, maquette A) au-dessus du
  canvas pendant l'approche (`IntroDirector` + `ExteriorShip`, timeline dans `three/intro.ts`) ; « Embarquer »
  (Entrée) → flash rose 300 ms → pont. Espace = passer. Visiteur connu (`introSeen`, persisté) ou lien
  profond `#/salle` : plan final 2 s puis embarquement automatique. Mouvement réduit : embarquement
  immédiat avec fondu 600 ms. Les salles sont masquées pendant l'approche, le vaisseau extérieur après.
- ESLint : `react-hooks/immutability` désactivée dans `src/three/` (muter les objets three dans
  `useFrame` est l'idiome R3F).

## Architecture

```
content/          YAML bilingues (site/, projects/, journey/, skills/, achievements/)
public/media/     captures des projets (référencées par `media[].src`, ex. media/projects/x.webp)
src/content/      schema.ts (Zod, source de vérité) · build.ts (assemblage pur + références croisées)
                  read.ts (Node : lecture YAML) · vite-plugin.ts (module virtuel `virtual:content`)
                  placement.ts (orbites auto des projets) · index.ts (accès typé côté client)
src/i18n/         lang.ts (pur) · useT.ts (hook)
src/state/        store.ts (Zustand + persist) · safeStorage.ts (localStorage protégé)
src/design/       tokens.css (DA) · tokens.ts (miroir pour la 3D)
src/motion/       easings.ts (courbes et `seg()` de pk-motion.js)
src/ui/           primitives.tsx (Diamond, Button, Tags, LevelGauge, LangSwitch…) · HoloPanel ·
                  panels/PanelHost (+ ShipTerminal) · hud/ · game/ (rang, toasts, rang+, trophées) · Hotspot · BootScreen
src/classic/      mode classique (Header, sections/, SectionHeader)
src/three/        scène R3F chargée en lazy :
                  ShipExperience (Canvas + HUD + panneaux, clavier, balayage, #/salle) · Scene · CameraRig
                  layout.ts (plan : salles alignées sur X, coursive en z ≈ 7,4, Pupille en (6, 20, -340))
                  intro.ts + IntroDirector (approche) · TransitionOverlay (flash, fondu, vitesse, carton)
                  objects/ (BlackHole + shader porté, Starfield avec lentille, RoomShell + Corridor,
                  Penguin, Box, ExteriorShip, PostFx) · models/ (penguin, ship, materials : portages de pinkoune-3d.js)
                  rooms/ (une salle par fichier + RoomDoors + Companions) · Hotspot / HotspotLayer / hotspots.ts
src/app/          App (aiguillage classique / 3D) · capabilities.ts · hashRoom.ts
src/audio/        sound.ts (Web Audio synthétisé) · SoundDirector.tsx (store → sons)
src/game/         engine.ts (XP, rangs, succès — TS pur) · rules.ts · konami.ts
scripts/          validate-content.ts · check-size.ts · og/og.html (image Open Graph)
tests/            Vitest (contenu, i18n, navigation, cadrage de l'intro, moteur de jeu, SEO, étiquettes)
e2e/              Playwright (classique, vaisseau, SEO ; audit axe)
```

Règles d'indépendance (vérifiées par ESLint `no-restricted-imports`) : `src/classic/` n'importe jamais
`three/` ni `@react-three/*`, et `src/three/` n'importe jamais `classic/`. Les deux partagent `src/ui/`.

### Contenu

- Le navigateur reçoit du JSON déjà validé (`virtual:content`) : ni YAML ni Zod dans le bundle.
- Contenu invalide = build en échec + `npm run validate:content` en échec, avec un message du type
  `content/projects/x.yaml › summary.en : traduction EN manquante`.
- `localized` est un `strictObject` : une virgule non protégée dans `{ fr: a, b, en: c }` crée une clé
  parasite et fait échouer la validation. **Mettre des guillemets** dès qu'un texte en flow-map contient
  une virgule ou deux-points.
- Microcopie : `content/site/ui.yaml`, clés listées dans `UI_KEYS` (schema.ts). Ajouter une clé = l'ajouter
  aux deux endroits.
- Projets : un fichier par projet, `order` pour l'ordre, `archived: true` pour la ceinture d'archives,
  `todo: [demo, media, year, repo]` pour les badges TODO, `planet:` pour surcharger le placement.
- Succès : `trigger.event` ∈ `GAME_EVENTS`, `count` = nombre ou `all`.

### Navigation à bord

- Salle courante dans le store (`room`), reflétée dans l'adresse `#/starmap` (`replaceState`).
  En revenant au classique, la page défile jusqu'à la section de la salle quittée.
- Panneau ouvert = `state.panel` (`{ kind: 'project', id }`, `profile`, `pupil`, `skills`, `pipeline`,
  `journey`, `passion`, `games`, `contact`). `PanelHost` le rend en `placement="side"` à bord,
  `"center"` en classique.
- Raccourcis : 1–7, ← →, C (classique), T (trophées), S (son), Échap (panneau). Mobile : balayage horizontal + flèches du HUD.
- Trajet caméra : spline porte arrière → coursive → salle, ease-io, 1,6 s entre voisines (1,9 s pour
  2 salles), fov +10° au milieu de la coursive, traits de vitesse et carton de salle (TransitionOverlay).
  Saut > 2 salles : deux segments, coupe au noir (fondu 38 % → 62 %, minuteries, pas d'images).
  Mouvement réduit : coupe + fondu 200 ms.
- Panneau holo (Motion III) : projecteur (losange + faisceau), cadre qui se déplie, contenu en cascade,
  titre tapé (texte complet pour les lecteurs d'écran), balayage ; fermeture inverse 0,6 s
  (Échap intercepté via `cancel`).

### Gamification (phase 4)

- Moteur pur `src/game/engine.ts` : `applyEvent(progress, rules, { type, value, at })` compte les valeurs
  **distinctes** vues par événement, donne l'XP (première visite de salle, première fiche projet) et
  débloque les succès (`count` ou `all` = total de `rules.totals`). « Zéro downtime » est dérivé (7 salles
  en < 2 min depuis la première visite). Renvoie le même objet si rien ne change.
- `src/game/rules.ts` construit les règles depuis le contenu ; `konami.ts` (fenêtre glissante).
- Store : `progress` persisté, `emit(type, value)`, `toasts` (3 max), `rankUp` (rang à célébrer).
  Émetteurs : `goTo` (room.visit, à bord), `openPanel` (project/archive.open, skill.inspect, journey.open,
  blackhole.click, bass.play, helmet.click), `finishEmbark` (ship.board), `setLang` (lang.switch),
  `setPreferredMode` (classic.roundtrip), liens LinkedIn/GitHub (link.open), pingouin du pont, molette
  (blackhole.zoom, `CameraRig`), immobilité 10 s sur le pont (blackhole.stare, `ShipExperience`),
  terminal de la salle des machines (machines.apply, machines.oldest-commit), Konami (`App`).
  En classique, la section active compte comme salle visitée.
  `penguin.hidden` (astronaute derrière la baie du Journal de bord), `sound.mute` (`toggleSound` vers off).
- UI : `ui/game/` — RankBadge + AchievementCounter (HUD), ToastStack (3D et classique), RankUp (3D
  seulement, attend qu'aucun panneau ne soit ouvert, célèbre le rang le plus récent), Trophies (panneau
  `{ kind: 'trophies' }`, touche T, compteur du HUD, bande de progression du classique).
- Build : `__BUILD__` (commit déployé, premier commit) injecté par `vite.config.ts` ; la CI clone tout
  l'historique (`fetch-depth: 0`).

### Pingouin, quartiers, son (phase 5)

- `objects/Penguin.tsx` : pose de base, réaction à l'arrivée dans sa salle (`active` + `arrival` : salut au
  pont, pointe ailleurs), clic = salut, célébration (`celebre`) tant que `rankUp` est en attente, clignement
  toutes les 4 s, cape au rang 06 et couronne au rang 07 (`makeCape` / `makeCrown` dans `models/penguin.ts`).
- `rooms/Companions.tsx` : un pingouin par salle (placements dans `PLACES`), et `HiddenPenguin` qui dérive
  dehors, derrière la baie du Journal de bord, sans repère.
- Quartiers : la basse se joue au clic (note + cordes qui vibrent + `bass.play`), le casque tourne,
  couchette superposée et tapis hexagonal.
- Bulle du HUD : réplique de salle à l'arrivée, conseil après 30 s sans panneau (`welcome` au pont,
  `hints` en rotation ailleurs), félicitations après la fermeture de l'écran de rang.
- Son : bouton égaliseur du HUD (touche S, `aria-pressed`), bascule sur l'écran d'embarquement.

### Polish (phase 6)

- **Mobile portrait** : la caméra recule (`pullbackFor(aspect)`, jusqu'à 1,3 m) et le champ monte à 76°
  (`fovFor`). `HotspotProjector` ramène les repères dans l'écran (étiquette retournée vers l'intérieur) et
  écarte verticalement les étiquettes qui se chevauchent (`three/labels.ts`, testé ; marge d'arrondi
  indispensable, sinon une étiquette posée pile sous une autre reste « en contact »). Voile sombre sous le
  HUD mobile (le champ large montre le plafonnier rose).
- **Perf** : bibliothèques en morceaux séparés (`react`, `three`, `r3f`, via `codeSplitting.groups` de
  rolldown, priorités pour que React ne parte pas dans `r3f`). Budget gzip vérifié en CI par
  `npm run size` (`scripts/check-size.ts`) : initial JS 115 ko, CSS 14 ko, vaisseau 330 ko.
  Préchargement des trois polices latin et de `hero.webp` (`preloadPlugin`, vite.config.ts).
  Qualité adaptative (`PerfGuard`, Scene.tsx) : < 40 i/s pendant 3 s à bord → DPR 1 et bloom allégé.
- **SEO** : `src/content/seo.ts` (pur, testé) + `seoPlugin` : `<!-- pk:seo -->` d'index.html remplacé par
  titre, description, canonical, Open Graph, carte X et JSON-LD `Person` (sans email) ; robots.txt et
  sitemap.xml générés. Adresse publique : `VITE_SITE_URL` (défaut GitHub Pages). Image `public/og.jpg`
  rendue depuis `scripts/og/og.html` (capture 1200 × 630).
- **A11y** : audit axe (WCAG 2.1 AA) dans les tests e2e ; corps des panneaux focusable (zone défilante),
  canvas `aria-hidden` (tout ce qui s'y active a un bouton DOM), bouton « Saluer Pinkoune » dans la bulle
  (équivalent clavier du clic sur le pingouin).
- **Tests e2e** : Playwright (`e2e/`, `npm run e2e`, bureau + Pixel 7, build de production via preview).
  `PW_CHROMIUM` = Chromium déjà installé (bac à sable : `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`).
  La CI installe le sien. **Lighthouse CI** (`lighthouserc.json`) : a11y, bonnes pratiques et SEO ≥ 0,95
  bloquants, performance ≥ 0,9 en avertissement ; mesure le mode classique (rendu logiciel en CI).
  Le déploiement attend `check` et `e2e`.

### Base path

`VITE_BASE` sinon `/Portfolio-overpowered/` pour `build` et `preview`, `/` pour `dev`.

## Tokens (DA vérifiée)

void #07060D · hull-900 #0D0C17 · hull-800 #151426 · hull-700 #201F36 · hull-600 #2E2C4A · line #3B3960 ·
line-soft #22213A · text #EEECF5 · text-dim #A29FBD · pink #FF5FA2 / soft #FFB8D5 / deep #B8286A ·
amber #FFB547 · core #FFF2DC · holo #5CE1E6. Rose = identité/XP, ambre = récompense/trou noir,
cyan = hologrammes/focus/liens ; jamais deux accents sur un même composant.
Rayon 0, bordures 1 px, coins coupés 8–12 px, grille 8 px, losange = repère.
Easings : out (.16,1,.3,1) · io (.65,0,.35,1) · back (.34,1.56,.64,1) losanges seulement.
Durées : 140 / 280 / 560 / 1800 ms.

## Commandes

`npm run dev` · `npm run build` · `npm run preview` · `npm run check` (lint, format, types, contenu, tests) ·
`npm run size` (budget, après build) · `npm run e2e` (Playwright, après build).

## Phases

1. ✅ Squelette : contenu, i18n, mode classique, CI + Pages.
2. ✅ Hub 3D : trou noir, vaisseau, salles, caméra, panneaux.
3. ✅ Ambiance : post-processing, intro, transitions.
4. ✅ Gamification : HUD, XP, rangs, succès, toasts, persistance.
5. ✅ Pingouin, quartiers, son.
6. ✅ Polish : perf, mobile, a11y, SEO, tests.
7. Mode éditeur (Sveltia sur /admin) + README « Mettre à jour le site ».
8. Hébergement homelab (Docker, GHCR, compose ou k3s + ArgoCD).

## Points ouverts (à reprendre)

- Mobile portrait : les pingouins compagnons (placés à droite) sortent du cadre ; les étiquettes écartées
  s'éloignent parfois de leur ancre sur la carte stellaire.
- three.js entier (~187 ko gzip) : R3F importe tout l'espace de noms, pas d'arbre élagué possible sans
  quitter R3F.
- Le rendu logiciel (CI, Playwright + SwiftShader) tourne à ~1 image/s : les étapes intermédiaires des
  trajets ne sont pas capturables, seuls les états finaux et les bascules d'état le sont.
- `hero.webp` (mode classique) : rendu une fois en phase 1 depuis le code three.js de `design/` (élément
  `pk-blackhole` + `pk-penguin` de la maquette G, servi par `python3 -m http.server`). À refaire de la même
  façon si la DA change.

## À faire côté Jérémy

- Settings › Pages › Source = « GitHub Actions » (avant le premier merge sur main).
- Valider les niveaux de compétences, statuts et années des projets (`# TODO` dans les YAML).
- Fournir captures / démos (dossier `public/media/projects/`).
