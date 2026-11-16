import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, Vector3, type CatmullRomCurve3, type PerspectiveCamera } from 'three';
import type { RoomId } from '../content/schema.ts';
import { ease } from '../motion/easings.ts';
import { useStore } from '../state/store.ts';
import {
  CORRIDOR,
  FAR_JUMP,
  fovFor,
  pullbackFor,
  roomIndex,
  roomPose,
  travelDuration,
  travelPath,
} from './layout.ts';

/*
 * Caméra à bord, « avec de la masse » (DA Motion) :
 * - trajets ease-io porte → coursive → entrée, fov 45 → 55 → 45 dans la coursive ;
 * - saut lointain (> 2 salles) : sortie, coupe au noir dans la coursive, entrée ;
 * - au repos, légère parallaxe au pointeur ;
 * - « réduire les animations » : coupe et fondu de 200 ms.
 */

interface Travel {
  from: RoomId;
  to: RoomId;
  curves: CatmullRomCurve3[];
  start: number;
  duration: number;
}

const look = new Vector3();
const offset = new Vector3();
const corridorLook = new Vector3();
const restTarget = new Vector3();
const restPosition = new Vector3();

export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  const clock = useThree((s) => s.clock);
  const room = useStore((s) => s.room);
  const stage = useStore((s) => s.stage);
  const settled = useRef<RoomId>(room);
  const travel = useRef<Travel | null>(null);
  const target = useRef(roomPose(room).target.clone());
  const baseFov = fovFor(aspect);
  /** En portrait, on recule un peu pour garder la salle dans le cadre. */
  const back = pullbackFor(aspect);
  /** Zoom à la molette (0 → 1), remis à zéro à chaque changement de salle. */
  const zoom = useRef(0);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const { stage, panel, traveling, room: here, emit } = useStore.getState();
      if (stage !== 'aboard' || panel || traveling) return;
      zoom.current = MathUtils.clamp(zoom.current - e.deltaY * 0.0012, 0, 1);
      // « Spaghettification » : zoomer au maximum vers la Pupille, depuis le pont.
      if (zoom.current >= 0.98 && here === 'bridge') emit('blackhole.zoom');
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // Arrivée à bord : la caméra prend place dans la salle courante.
  useEffect(() => {
    if (stage !== 'aboard') return;
    const pose = roomPose(useStore.getState().room, back);
    settled.current = useStore.getState().room;
    travel.current = null;
    camera.up.set(0, 1, 0);
    camera.position.copy(pose.position);
    target.current.copy(pose.target);
    camera.lookAt(pose.target);
  }, [stage, camera, back]);

  useEffect(() => {
    if (stage !== 'aboard') return;
    camera.fov = baseFov;
    camera.updateProjectionMatrix();
  }, [camera, baseFov, stage]);

  useEffect(() => {
    if (stage !== 'aboard') return;
    if (room === settled.current && !travel.current) return;
    zoom.current = 0;
    const from = travel.current?.to ?? settled.current;
    const { setFade, setTraveling } = useStore.getState();
    if (reducedMotion) {
      // Coupe + fondu 200 ms.
      setFade(true);
      const timer = window.setTimeout(() => {
        const pose = roomPose(room, back);
        camera.position.copy(pose.position);
        target.current.copy(pose.target);
        settled.current = room;
        travel.current = null;
        setFade(false);
      }, 200);
      return () => window.clearTimeout(timer);
    }
    const far = Math.abs(roomIndex(room) - roomIndex(from)) > FAR_JUMP;
    const duration = Math.max(0.8, travelDuration(from, room));
    travel.current = {
      from,
      to: room,
      curves: travelPath(camera.position, room, far, back),
      start: clock.elapsedTime,
      duration,
    };
    setTraveling(true);
    if (!far) return;
    // Fondu au noir autour de la coupe (mi-parcours), calé sur l'horloge et non sur les images.
    const on = window.setTimeout(() => setFade(true), duration * 380);
    const off = window.setTimeout(() => setFade(false), duration * 620);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
      setFade(false);
    };
  }, [room, stage, reducedMotion, camera, clock, back]);

  useFrame(({ pointer }) => {
    if (useStore.getState().stage !== 'aboard') return;
    const tr = travel.current;
    if (tr) {
      const k = Math.min(1, (clock.elapsedTime - tr.start) / tr.duration);
      const e = ease.io(k);
      const [first, second] = tr.curves;
      if (second) {
        // Deux segments ; la coupe tombe à mi-parcours, masquée par le fondu.
        camera.position.copy(e < 0.5 ? first!.getPointAt(e * 2) : second.getPointAt(e * 2 - 1));
      } else {
        camera.position.copy(first!.getPointAt(e));
      }

      // Regard : salle de départ, axe de la coursive, salle d'arrivée.
      const dir = Math.sign(roomPose(tr.to).position.x - roomPose(tr.from).position.x) || 1;
      corridorLook.set(camera.position.x + dir * 6, 1.7, CORRIDOR.z);
      look
        .copy(roomPose(tr.from).target)
        .lerp(corridorLook, MathUtils.smoothstep(e, 0.12, 0.32))
        .lerp(roomPose(tr.to).target, MathUtils.smoothstep(e, 0.68, 0.88));
      camera.lookAt(look);
      target.current.copy(look);

      // Coursive : le champ s'ouvre puis se referme (45 → 55 → 45).
      camera.fov = baseFov + 10 * Math.sin(Math.PI * MathUtils.smoothstep(k, 0.25, 0.75));
      camera.updateProjectionMatrix();

      if (k >= 1) {
        travel.current = null;
        settled.current = tr.to;
        camera.fov = baseFov;
        camera.updateProjectionMatrix();
        useStore.getState().setTraveling(false);
      }
      return;
    }

    // Au repos : parallaxe douce au pointeur.
    const pose = roomPose(settled.current, back);
    restTarget.copy(pose.target).add(offset.set(pointer.x * 0.9, pointer.y * 0.45, 0));
    restPosition.copy(pose.position).add(offset.set(pointer.x * -0.15, pointer.y * -0.08, 0));
    const damp = reducedMotion ? 1 : 0.06;
    target.current.lerp(restTarget, damp);
    camera.position.lerp(restPosition, damp);
    camera.lookAt(target.current);
    // Zoom : on resserre le champ (jusqu'à 18°) vers la baie.
    const fov = MathUtils.lerp(baseFov, 18, zoom.current);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = MathUtils.lerp(camera.fov, fov, reducedMotion ? 1 : 0.12);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
