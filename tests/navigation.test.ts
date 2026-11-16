import { describe, expect, it } from 'vitest';
import { chooseMode } from '../src/app/capabilities.ts';
import { parseRoomHash, roomHash } from '../src/app/hashRoom.ts';
import { ROOM_IDS } from '../src/content/schema.ts';
import {
  fovFor,
  pullbackFor,
  ROOM,
  roomPose,
  travelDuration,
  travelPath,
} from '../src/three/layout.ts';

const capable = { webgl: true, lowEnd: false, reducedMotion: false };

describe('choix du mode', () => {
  it('embarque en 3D par défaut sur un appareil capable', () => {
    expect(chooseMode(capable, null)).toBe('3d');
  });

  it('reste en classique par défaut sans WebGL', () => {
    expect(chooseMode({ ...capable, webgl: false }, null)).toBe('classic');
  });

  it('propose le classique d’office sur un appareil faible', () => {
    expect(chooseMode({ ...capable, lowEnd: true }, null)).toBe('classic');
  });

  it('respecte le choix explicite du visiteur', () => {
    expect(chooseMode(capable, 'classic')).toBe('classic');
    expect(chooseMode({ ...capable, lowEnd: true }, '3d')).toBe('3d');
  });

  it('tente la 3D demandée même si la détection doute de WebGL', () => {
    expect(chooseMode({ ...capable, webgl: false }, '3d')).toBe('3d');
  });

  it('revient au classique si la 3D a échoué pendant la visite', () => {
    expect(chooseMode(capable, '3d', true)).toBe('classic');
  });
});

describe('adresse des salles', () => {
  it('fait l’aller-retour pour chaque salle', () => {
    for (const id of ROOM_IDS) expect(parseRoomHash(roomHash(id))).toBe(id);
  });

  it('ignore les ancres du mode classique et les salles inconnues', () => {
    expect(parseRoomHash('#starmap')).toBeNull();
    expect(parseRoomHash('#/hangar')).toBeNull();
    expect(parseRoomHash('')).toBeNull();
  });
});

describe('trajets caméra', () => {
  it('relie la position de départ au point de vue de la salle d’arrivée', () => {
    const from = roomPose('bridge').position;
    const [path] = travelPath(from, 'arsenal');
    expect(path!.getPointAt(0).distanceTo(from)).toBeLessThan(1e-6);
    expect(path!.getPointAt(1).distanceTo(roomPose('arsenal').position)).toBeLessThan(1e-6);
  });

  it('passe par la coursive, derrière les salles', () => {
    const [path] = travelPath(roomPose('bridge').position, 'starmap');
    expect(path!.getPointAt(0.5).z).toBeGreaterThan(ROOM.halfDepth);
  });

  it('coupe un saut lointain en deux segments, sortie puis entrée', () => {
    const segments = travelPath(roomPose('bridge').position, 'comms', true);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.getPointAt(1).z).toBeCloseTo(segments[1]!.getPointAt(0).z);
    expect(segments[1]!.getPointAt(1).distanceTo(roomPose('comms').position)).toBeLessThan(1e-6);
  });

  it('garde la salle dans le cadre en portrait, sans dépasser 76°', () => {
    expect(fovFor(16 / 9)).toBe(45);
    expect(fovFor(0.45)).toBeLessThanOrEqual(76);
    expect(fovFor(0.45)).toBeGreaterThan(45);
  });

  it('recule la caméra en portrait sans traverser la cloison arrière', () => {
    expect(pullbackFor(16 / 9)).toBe(0);
    expect(pullbackFor(0.45)).toBeGreaterThan(1);
    expect(roomPose('bridge', pullbackFor(0.3)).position.z).toBeLessThan(ROOM.halfDepth);
    const [path] = travelPath(roomPose('bridge', 1.3).position, 'starmap', false, 1.3);
    expect(path!.getPointAt(1).distanceTo(roomPose('starmap', 1.3).position)).toBeLessThan(1e-6);
  });

  it('dure 1,6 s entre voisines, plus longtemps pour un saut lointain', () => {
    expect(travelDuration('bridge', 'bridge')).toBe(0);
    expect(travelDuration('bridge', 'starmap')).toBeCloseTo(1.6);
    expect(travelDuration('bridge', 'arsenal')).toBeCloseTo(1.9);
    expect(travelDuration('bridge', 'comms')).toBeCloseTo(1.6); // coupe au noir
  });
});
