import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { ROOM_IDS, type RoomId } from '../content/schema.ts';
import { useStore } from '../state/store.ts';
import { CameraRig } from './CameraRig.tsx';
import { HotspotProjector } from './HotspotLayer.tsx';
import { IntroDirector } from './IntroDirector.tsx';
import { roomX } from './layout.ts';
import { BlackHole } from './objects/BlackHole.tsx';
import { ExteriorShip } from './objects/ExteriorShip.tsx';
import { PostFx } from './objects/PostFx.tsx';
import { Corridor, RoomShell } from './objects/RoomShell.tsx';
import { Starfield } from './objects/Starfield.tsx';
import { Arsenal } from './rooms/Arsenal.tsx';
import { Bridge } from './rooms/Bridge.tsx';
import { Comms } from './rooms/Comms.tsx';
import { HiddenPenguin, RoomPenguin } from './rooms/Companions.tsx';
import { Logbook } from './rooms/Logbook.tsx';
import { Machines } from './rooms/Machines.tsx';
import { Quarters } from './rooms/Quarters.tsx';
import { RoomDoors } from './rooms/RoomDoors.tsx';
import { StarMap } from './rooms/StarMap.tsx';

type RoomProps = { active: boolean; reducedMotion: boolean };

const ROOMS: Record<RoomId, (props: RoomProps) => React.ReactNode> = {
  bridge: Bridge,
  starmap: StarMap,
  arsenal: Arsenal,
  machines: Machines,
  logbook: Logbook,
  quarters: Quarters,
  comms: Comms,
};

const doorsX = ROOM_IDS.map(roomX);

/** Cadence mesurée à bord sous laquelle on allège le rendu (images par seconde). */
const MIN_FPS = 40;

/**
 * Qualité adaptative : pendant les 3 premières secondes à bord (hors trajets), on mesure la cadence.
 * Trop lente : résolution ramenée à 1 et bloom allégé, une seule fois, pour toute la visite.
 */
function PerfGuard({ onSlow }: { onSlow: () => void }) {
  const setDpr = useThree((st) => st.setDpr);
  const probe = useRef({ frames: 0, time: 0, done: false });
  useFrame((_, delta) => {
    const p = probe.current;
    const { stage, traveling } = useStore.getState();
    if (p.done || stage !== 'aboard' || traveling) return;
    p.frames += 1;
    p.time += Math.min(delta, 0.25);
    if (p.time < 3) return;
    p.done = true;
    if (p.frames / p.time < MIN_FPS) {
      setDpr(1);
      onSlow();
    }
  });
  return null;
}

/** Lumière de la DA : clé blanche, contre-jours rose et ambre venus de la Pupille. */
function Lights() {
  return (
    <>
      <hemisphereLight args={[0xb9b6e8, 0x24122a, 0.85]} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      <directionalLight position={[-4, 2, -4]} intensity={2.2} color={0xff5fa2} />
      <directionalLight position={[4, 1, -3]} intensity={1.4} color={0xffb547} />
    </>
  );
}

export function Scene({
  reducedMotion,
  shortIntro,
  lite,
}: {
  reducedMotion: boolean;
  shortIntro: boolean;
  lite: boolean;
}) {
  const room = useStore((s) => s.room);
  const traveling = useStore((s) => s.traveling);
  const aboard = useStore((s) => s.stage === 'aboard');
  const [slow, setSlow] = useState(false);

  return (
    <>
      <CameraRig reducedMotion={reducedMotion} />
      <HotspotProjector />
      <BlackHole reducedMotion={reducedMotion} />
      <Starfield />
      <PostFx lite={lite || slow} />
      <PerfGuard onSlow={() => setSlow(true)} />

      {/* Approche : le vaisseau vu de l'extérieur ; les salles sont masquées. */}
      {!aboard && (
        <>
          <IntroDirector short={shortIntro || reducedMotion} reducedMotion={reducedMotion} />
          <ExteriorShip />
          <hemisphereLight args={[0xb9b6e8, 0x24122a, 0.6]} />
        </>
      )}

      <group visible={aboard}>
        <Lights />
        <Corridor length={doorsX[doorsX.length - 1]!} doorsX={doorsX} />
        {ROOM_IDS.map((id) => {
          const Room = ROOMS[id];
          const active = aboard && id === room && !traveling;
          return (
            <group key={id} position={[roomX(id), 0, 0]}>
              <RoomShell />
              <RoomDoors room={id} active={active} />
              <Room active={active} reducedMotion={reducedMotion} />
              <RoomPenguin room={id} active={active} />
              {id === 'logbook' && <HiddenPenguin />}
            </group>
          );
        })}
      </group>
    </>
  );
}
