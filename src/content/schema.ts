import { z } from 'zod';

/*
 * Schémas du contenu de content/. Source de vérité unique :
 * - validés au build (plugin Vite) et en CI (npm run validate:content) ;
 * - reflétés dans la config du CMS (public/admin/config.yml).
 * Tout texte affiché est un champ { fr, en } : une traduction manquante fait échouer la validation.
 */

const text = (lang: string) =>
  z
    .string({ error: `traduction ${lang} manquante` })
    .trim()
    .min(1, `traduction ${lang} vide`);

// strictObject : une clé en trop signale souvent une virgule mal placée dans un { fr: …, en: … }.
export const localized = z.strictObject(
  { fr: text('FR'), en: text('EN') },
  { error: 'champ { fr, en } attendu (pensez aux guillemets si le texte contient une virgule)' },
);
export type Localized = z.infer<typeof localized>;

/** Nom propre identique dans les deux langues, ou texte traduit. */
export const name = z.union([z.string().trim().min(1), localized]);
export type Name = z.infer<typeof name>;

const url = z.url({ error: 'URL invalide (https://…)' });
const slug = z.string().regex(/^[a-z0-9-]+$/, 'identifiant en minuscules, chiffres et tirets');
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'couleur #RRGGBB attendue');
/** Date de parcours : "2024" ou "2024-09". */
const yearMonth = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'date AAAA ou AAAA-MM attendue');

export const ROOM_IDS = [
  'bridge',
  'starmap',
  'arsenal',
  'machines',
  'logbook',
  'quarters',
  'comms',
] as const;
export const roomId = z.enum(ROOM_IDS);
export type RoomId = z.infer<typeof roomId>;

/* ---------- site/ ---------- */

export const profileSchema = z.object({
  name: z.string().min(1),
  alias: z.string().min(1),
  location: z.string().min(1),
  role: localized,
  tagline: localized,
  intro: localized,
  about: z.array(localized).min(1),
  facts: z.array(z.object({ label: localized, value: localized })),
  links: z
    .array(z.object({ id: slug, label: z.string().min(1), handle: z.string().min(1), url }))
    .min(1),
  seo: z.object({ title: localized, description: localized }),
});

export const roomsSchema = z.object({
  rooms: z
    .array(
      z.object({
        id: roomId,
        code: z.string().regex(/^PK-\d{2}$/, 'code PK-NN attendu'),
        name: localized,
        label: localized,
        intro: localized,
        penguin: localized,
      }),
    )
    .length(ROOM_IDS.length, `les ${ROOM_IDS.length} salles doivent être décrites`),
});

export const ranksSchema = z.object({
  xp: z.object({
    roomVisit: z.number().int().nonnegative(),
    projectOpen: z.number().int().nonnegative(),
  }),
  ranks: z
    .array(
      z.object({
        name: localized,
        xp: z.number().int().nonnegative(),
        reward: localized.optional(),
      }),
    )
    .min(1),
});

export const penguinSchema = z.object({
  name: z.string().min(1),
  lines: z.object({
    welcome: localized,
    rankUp: localized,
    hints: z.array(localized).min(1),
  }),
});

export const quartersSchema = z.object({
  intro: localized,
  games: z
    .array(
      z.object({
        name: z.string().min(1),
        genre: localized,
        note: localized.optional(),
        color: hexColor.optional(),
      }),
    )
    .min(1),
  passions: z.array(z.object({ id: slug, title: localized, text: localized })).min(1),
});

export const machinesSchema = z.object({
  intro: localized,
  projects: z.array(slug),
  pipeline: z
    .array(z.object({ id: slug, name: localized, tool: z.string().min(1), text: localized }))
    .min(1),
  hosting: z
    .array(
      z.object({
        id: slug,
        title: localized,
        text: localized,
        status: z.enum(['live', 'planned']),
      }),
    )
    .min(1),
});

/** Microcopie de l'interface : chaque clé utilisée par le code doit exister, en FR et en EN. */
export const UI_KEYS = [
  'nav.skip',
  'nav.primary',
  'nav.menu',
  'nav.close',
  'lang.label',
  'mode.board',
  'hero.ctaProjects',
  'hero.ctaContact',
  'hero.imageAlt',
  'projects.open',
  'projects.archives',
  'projects.archivesIntro',
  'projects.repo',
  'projects.demo',
  'projects.stack',
  'projects.highlights',
  'projects.team',
  'projects.year',
  'projects.capture',
  'projects.contextLabel',
  'projects.statusLabel',
  'projects.context.perso',
  'projects.context.epitech',
  'projects.context.pro',
  'projects.status.live',
  'projects.status.wip',
  'projects.status.poc',
  'projects.status.done',
  'todo.demo',
  'todo.media',
  'todo.year',
  'todo.repo',
  'skills.level',
  'machines.pipeline',
  'machines.hosting',
  'machines.featured',
  'machines.status.live',
  'machines.status.planned',
  'logbook.present',
  'logbook.kind.work',
  'logbook.kind.education',
  'logbook.kind.internship',
  'quarters.games',
  'quarters.passions',
  'comms.title',
  'comms.text',
  'footer.made',
  'footer.source',
  'dialog.close',
  'hud.rank',
  'hud.achievements',
  'trophies.title',
  'trophies.intro',
  'trophies.ranks',
  'trophies.list',
  'trophies.secret',
  'trophies.secretHow',
  'trophies.unlocked',
  'trophies.reset',
  'trophies.resetConfirm',
  'toast.unlocked',
  'toast.open',
  'rank.new',
  'rank.continue',
  'rank.next',
  'rank.max',
  'progress.rank',
  'progress.count',
  'progress.strip',
  'scope.ship',
  'scope.hud',
  'machines.terminal',
  'machines.build',
  'machines.gitlog',
  'panel.prev',
  'panel.next',
  'mode.unavailable',
  'mode.failed',
  'mode.failedHint',
  'hud.map',
  'hud.classic',
  'hud.classicShort',
  'hud.prev',
  'hud.next',
  'hud.loading',
  'boot.sequence',
  'boot.orbit',
  'boot.signal',
  'boot.subtitle',
  'boot.online',
  'boot.log1',
  'boot.log2',
  'boot.log3',
  'boot.log4',
  'boot.embark',
  'boot.enter',
  'boot.skip',
  'boot.classic',
  'hud.pilot',
  'hud.wave',
  'hud.dismiss',
  'hud.keys',
  'hotspot.profile',
  'hotspot.door',
  'pupil.name',
  'pupil.caption',
  'pupil.text',
  'sound.label',
  'sound.on',
  'sound.off',
] as const;
export type UiKey = (typeof UI_KEYS)[number];
export const uiSchema = z.record(z.enum(UI_KEYS), localized);

/* ---------- projects/ ---------- */

export const TODO_KINDS = ['demo', 'media', 'year', 'repo'] as const;

export const projectSchema = z.object({
  order: z.number().int(),
  title: z.string().min(1),
  tagline: localized,
  summary: localized,
  description: z.array(localized).min(1),
  highlights: z.array(localized).default([]),
  stack: z.array(z.string().min(1)).min(1),
  context: z.enum(['perso', 'epitech', 'pro']),
  team: localized.optional(),
  year: z.string().optional(),
  status: z.enum(['live', 'wip', 'poc', 'done']),
  links: z.object({ repo: url.optional(), demo: url.optional() }).default({}),
  media: z.array(z.object({ src: z.string().min(1), alt: localized })).default([]),
  /** Éléments à compléter, affichés en badge « TODO » discret. */
  todo: z.array(z.enum(TODO_KINDS)).default([]),
  /** Projets secondaires : ceinture « Archives » de la carte, plus discrète. */
  archived: z.boolean().default(false),
  /** Surcharge optionnelle du placement automatique sur la carte stellaire. */
  planet: z
    .object({
      orbit: z.number().positive().optional(),
      angle: z.number().optional(),
      size: z.number().positive().optional(),
      color: hexColor.optional(),
    })
    .optional(),
});

/* ---------- journey/ ---------- */

export const journeySchema = z.object({
  kind: z.enum(['work', 'education', 'internship']),
  start: yearMonth,
  end: z.union([yearMonth, z.literal('present')]).optional(),
  title: localized,
  organization: z.string().min(1),
  location: z.string().min(1).optional(),
  duration: localized.optional(),
  summary: localized,
  highlights: z.array(localized).default([]),
  tags: z.array(z.string().min(1)).default([]),
});

/* ---------- skills/ ---------- */

export const skillCategorySchema = z.object({
  order: z.number().int(),
  code: z.string().min(1),
  name: localized,
  description: localized,
  skills: z
    .array(
      z.object({
        name,
        /** Maîtrise de 1 (notions) à 5 (expert). Absent pour les soft skills. */
        level: z.number().int().min(1).max(5).optional(),
        note: localized.optional(),
      }),
    )
    .min(1),
});

/* ---------- achievements/ ---------- */

/**
 * Événements émis par le site. Un succès se déclenche quand l'événement a été vu `count` fois
 * (valeurs distinctes si `distinct`), ou `all` = autant que d'éléments concernés (salles, projets…).
 * Ajouter un événement ici demande de l'émettre dans le code (voir README).
 */
export const GAME_EVENTS = [
  'ship.board',
  'room.visit',
  'ship.speedrun',
  'project.open',
  'archive.open',
  'skill.inspect',
  'journey.open',
  'penguin.click',
  'penguin.hidden',
  'blackhole.click',
  'blackhole.stare',
  'blackhole.zoom',
  'machines.apply',
  'machines.oldest-commit',
  'bass.play',
  'helmet.click',
  'link.open',
  'sound.mute',
  'classic.roundtrip',
  'lang.switch',
  'konami',
] as const;

export const ACHIEVEMENT_SCOPES = [...ROOM_IDS, 'ship', 'hud'] as const;

export const achievementSchema = z.object({
  order: z.number().int(),
  scope: z.enum(ACHIEVEMENT_SCOPES),
  name: localized,
  how: localized,
  flavor: localized,
  xp: z.number().int().positive(),
  secret: z.boolean().default(false),
  trigger: z.object({
    event: z.enum(GAME_EVENTS),
    count: z.union([z.number().int().positive(), z.literal('all')]).default(1),
  }),
});
