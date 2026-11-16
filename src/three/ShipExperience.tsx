import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { roomHash, parseRoomHash } from '../app/hashRoom.ts';
import { ROOM_IDS } from '../content/schema.ts';
import { SoundDirector } from '../audio/SoundDirector.tsx';
import { useStore } from '../state/store.ts';
import { RankUp } from '../ui/game/RankUp.tsx';
import { ToastStack } from '../ui/game/ToastStack.tsx';
import { Hud } from '../ui/hud/Hud.tsx';
import { PanelHost } from '../ui/panels/PanelHost.tsx';
import { HotspotLayer } from './HotspotLayer.tsx';
import { Scene } from './Scene.tsx';
import { TransitionOverlay } from './TransitionOverlay.tsx';
import s from './ShipExperience.module.css';

const step = (delta: -1 | 1) => {
  const { room, goTo } = useStore.getState();
  const next = ROOM_IDS[ROOM_IDS.indexOf(room) + delta];
  if (next) goTo(next);
};

/** Salle courante ↔ adresse (#/starmap) : liens profonds et bouton précédent du navigateur. */
function useRoomHash() {
  const room = useStore((st) => st.room);
  useEffect(() => {
    const { goTo } = useStore.getState();
    goTo(parseRoomHash(window.location.hash) ?? useStore.getState().room);
    const onHash = () => {
      const target = parseRoomHash(window.location.hash);
      if (target) useStore.getState().goTo(target);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (window.location.hash !== roomHash(room)) {
      history.replaceState(null, '', roomHash(room));
    }
  }, [room]);
}

/** Raccourcis du HUD (DA, anatomie D) : 1–7 salles, ← → voisines, C classique, T trophées, S son. */
function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { panel, goTo, setPreferredMode, stage } = useStore.getState();
      if (stage !== 'aboard' || panel || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= ROOM_IDS.length) goTo(ROOM_IDS[n - 1]!);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'c' || e.key === 'C') setPreferredMode('classic');
      else if (e.key === 't' || e.key === 'T') useStore.getState().openPanel({ kind: 'trophies' });
      else if (e.key === 's' || e.key === 'S') useStore.getState().toggleSound();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** « Horizon des événements » : fixer la Pupille 10 s depuis le pont sans bouger la souris. */
function useStare() {
  useEffect(() => {
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const { stage, room, panel, traveling, emit } = useStore.getState();
        if (stage === 'aboard' && room === 'bridge' && !panel && !traveling)
          emit('blackhole.stare');
        else arm();
      }, 10_000);
    };
    arm();
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    // Le compte repart de zéro à l'arrivée à bord, à chaque salle, panneau ou trajet.
    const unsubscribe = useStore.subscribe((st, prev) => {
      if (
        st.stage !== prev.stage ||
        st.room !== prev.room ||
        st.panel !== prev.panel ||
        st.traveling !== prev.traveling
      ) {
        arm();
      }
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, []);
}

/** Balayage horizontal sur mobile pour changer de salle (maquette H, règles mobile). */
function useSwipe() {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]!;
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (useStore.getState().stage !== 'aboard') return;
      const t = e.changedTouches[0]!;
      const from = start.current;
      start.current = null;
      if (!from) return;
      const dx = t.clientX - from.x;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(t.clientY - from.y) * 1.5) {
        step(dx < 0 ? 1 : -1);
      }
    },
  };
}

/** Le vaisseau : scène 3D, HUD et panneaux. Chargé à la demande (import dynamique). */
export default function ShipExperience({ reducedMotion }: { reducedMotion: boolean }) {
  // Visiteur connu ou lien profond (#/salle) : approche courte, embarquement automatique.
  const [shortIntro] = useState(
    () => useStore.getState().introSeen || parseRoomHash(window.location.hash) !== null,
  );
  const aboard = useStore((st) => st.stage === 'aboard');
  useRoomHash();
  useKeyboard();
  useStare();
  const swipe = useSwipe();
  const mobile = window.matchMedia?.('(max-width: 720px)').matches ?? false;

  return (
    <div className={s.ship} {...swipe}>
      {/* Décor : tout ce qui s'y active a son bouton dans le DOM (hotspots, HUD). */}
      <Canvas
        aria-hidden="true"
        className={s.canvas}
        flat
        dpr={[1, mobile ? 1.5 : 1.75]}
        camera={{ fov: 45, near: 0.1, far: 2000, position: [0, 1.65, 3.4] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Scene reducedMotion={reducedMotion} shortIntro={shortIntro} lite={mobile} />
      </Canvas>
      {aboard && (
        <>
          <HotspotLayer />
          <Hud />
          <PanelHost placement="side" />
          <ToastStack />
          <RankUp />
        </>
      )}
      <TransitionOverlay reducedMotion={reducedMotion} />
      <SoundDirector />
    </div>
  );
}
