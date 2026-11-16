import { useEffect, useState } from 'react';
import { content } from '../../content/index.ts';
import type { Localized, RoomId } from '../../content/schema.ts';
import { useT } from '../../i18n/useT.ts';
import { useStore } from '../../state/store.ts';
import { AchievementCounter, RankBadge } from '../game/RankBadge.tsx';
import { Button, Diamond, LangSwitch } from '../primitives.tsx';
import { ui } from '../styles.ts';
import s from './Hud.module.css';
import { SoundToggle } from './SoundToggle.tsx';

/*
 * HUD à bord (design/Pinkoune HUD.dc.html, anatomie D) : rang et XP, salle courante, succès, son,
 * langue, mode classique, plan du vaisseau, bulle de Pinkoune.
 */

function RoomTitle() {
  const { t } = useT();
  const roomId = useStore((st) => st.room);
  const room = content.rooms.find((r) => r.id === roomId)!;
  return (
    <p className={`${ui.label} ${s.title} ${s.fades}`} aria-live="polite">
      <span className={s.rule} aria-hidden="true" />
      <span className={s.dim}>{room.code}</span>
      <span>{t(room.name)}</span>
      <span className={s.rule} aria-hidden="true" />
    </p>
  );
}

/** Plan du vaisseau : 7 losanges reliés ; plein = ici, contour = visité, gris = jamais vu. */
function ShipMap() {
  const { t, ui: u } = useT();
  const current = useStore((st) => st.room);
  const visited = useStore((st) => st.visited);
  const goTo = useStore((st) => st.goTo);
  const index = content.rooms.findIndex((r) => r.id === current);
  const room = content.rooms[index]!;
  const step = (delta: number) => {
    const next = content.rooms[index + delta];
    if (next) goTo(next.id);
  };

  return (
    <nav className={s.map} aria-label={u('hud.map')}>
      <button
        type="button"
        className={s.arrow}
        onClick={() => step(-1)}
        disabled={index === 0}
        aria-label={u('hud.prev')}
      >
        ‹
      </button>
      <ol className={s.track}>
        {content.rooms.map((r) => {
          const here = r.id === current;
          const seen = visited.includes(r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                className={s.stop}
                aria-current={here ? 'location' : undefined}
                onClick={() => goTo(r.id)}
              >
                <span className={s.marker} data-state={here ? 'here' : seen ? 'seen' : 'new'}>
                  <Diamond
                    size={here ? 11 : 10}
                    variant={here ? 'filled' : seen ? 'outline' : 'locked'}
                  />
                </span>
                <span className={`${ui.label} ${s.name}`}>
                  <span className="visually-hidden">{r.code} · </span>
                  {t(r.name)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className={`${ui.label} ${s.mobileName}`} aria-hidden="true">
        {room.code} · {t(room.name)}
      </p>
      <button
        type="button"
        className={s.arrow}
        onClick={() => step(1)}
        disabled={index === content.rooms.length - 1}
        aria-label={u('hud.next')}
      >
        ›
      </button>
    </nav>
  );
}

/** Délai d'immobilité avant que Pinkoune glisse un conseil. */
const HINT_AFTER_MS = 30_000;
const SHOW_MS = 6000;

type Line = { text: Localized; key: string };

let hintIndex = 0;
const nextHint = (room: RoomId): Localized => {
  // Sur le pont, Pinkoune rappelle de ne pas trop fixer la Pupille ; ailleurs, il tourne ses conseils.
  if (room === 'bridge') return content.penguin.lines.welcome;
  const hints = content.penguin.lines.hints;
  return hints[hintIndex++ % hints.length]!;
};

/**
 * Bulle de Pinkoune : 2 lignes max, se ferme seule après 6 s (DA, HUD n° 8). Réplique de la salle à
 * l'arrivée, félicitations après une montée de rang, conseil après 30 s sans bouger.
 */
function Companion() {
  const { t, ui: u } = useT();
  const roomId = useStore((st) => st.room);
  const traveling = useStore((st) => st.traveling);
  const panelOpen = useStore((st) => st.panel !== null);
  const [line, setLine] = useState<Line | null>(null);

  // Arrivée dans une salle : sa réplique, puis un conseil si le visiteur reste sans rien ouvrir.
  useEffect(() => {
    if (traveling) return;
    const room = content.rooms.find((r) => r.id === roomId)!;
    const show = window.setTimeout(() => setLine({ text: room.penguin, key: roomId }), 0);
    return () => window.clearTimeout(show);
  }, [roomId, traveling]);

  useEffect(() => {
    if (traveling || panelOpen) return;
    const hint = window.setTimeout(
      () => setLine({ text: nextHint(roomId), key: `hint-${Date.now()}` }),
      HINT_AFTER_MS,
    );
    return () => window.clearTimeout(hint);
  }, [roomId, traveling, panelOpen]);

  // Après la célébration d'un rang, Pinkoune en remet une couche.
  useEffect(
    () =>
      useStore.subscribe((st, prev) => {
        if (prev.rankUp !== null && st.rankUp === null) {
          setLine({ text: content.penguin.lines.rankUp, key: `rank-${prev.rankUp}` });
        }
      }),
    [],
  );

  useEffect(() => {
    if (!line) return;
    const hide = window.setTimeout(() => setLine(null), SHOW_MS);
    return () => window.clearTimeout(hide);
  }, [line]);

  if (traveling || !line) return null;
  return (
    <aside className={s.companion} key={line.key}>
      <p className={`${ui.label} ${s.who}`}>
        {/* Équivalent clavier du clic sur le pingouin 3D (succès « Bonjour toi »). */}
        <button
          type="button"
          className={s.wave}
          onClick={() => useStore.getState().emit('penguin.click')}
          aria-label={u('hud.wave')}
          title={u('hud.wave')}
        >
          <Diamond size={7} />
          {content.penguin.name}
        </button>
        · {u('hud.pilot')}
      </p>
      <p className={s.line}>{t(line.text)}</p>
      <button
        type="button"
        className={s.dismiss}
        onClick={() => setLine(null)}
        aria-label={u('hud.dismiss')}
      >
        ×
      </button>
    </aside>
  );
}

export function Hud() {
  const { ui: u } = useT();
  const setPreferredMode = useStore((st) => st.setPreferredMode);
  const traveling = useStore((st) => st.traveling);
  return (
    <div className={s.hud} data-traveling={traveling}>
      <p className="visually-hidden">{u('hud.keys')}</p>
      <div className={`${s.brand} ${s.fades}`}>
        <RankBadge />
      </div>
      <RoomTitle />
      <div className={`${s.controls} ${s.fades}`}>
        <AchievementCounter />
        <SoundToggle />
        <LangSwitch />
        <Button onClick={() => setPreferredMode('classic')} kbd="C" aria-label={u('hud.classic')}>
          <span className={s.long} aria-hidden="true">
            {u('hud.classic')}
          </span>
          <span className={s.short} aria-hidden="true">
            {u('hud.classicShort')}
          </span>
        </Button>
      </div>
      <Companion />
      <ShipMap />
    </div>
  );
}
