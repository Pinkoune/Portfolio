import { describe, expect, it } from 'vitest';
import { spreadLabels, type LabelBox } from '../src/three/labels.ts';

const overlaps = (a: LabelBox, b: LabelBox) =>
  a.left < b.right && b.left < a.right && Math.abs(a.y - b.y) < (a.h + b.h) / 2;

describe('étiquettes des hotspots', () => {
  it('écarte deux étiquettes à la même hauteur', () => {
    const homelab = { left: 469, right: 601, y: 283, h: 34 };
    const pk01 = { left: 505, right: 619, y: 283, h: 34 };
    spreadLabels([homelab, pk01]);
    expect(overlaps(homelab, pk01)).toBe(false);
  });

  it('écarte aussi deux étiquettes poussées par une troisième (arrondis flottants)', () => {
    // Valeurs où `y + écart − y` tombe juste sous l'écart en virgule flottante.
    const h = 34.18994866620711;
    const top = { left: 309, right: 700, y: 279.48529790390086, h };
    const a = { left: 500, right: 633, y: 290, h };
    const b = { left: 540, right: 654, y: 292, h };
    spreadLabels([b, top, a]);
    expect(overlaps(a, b)).toBe(false);
    expect(overlaps(a, top) || overlaps(b, top)).toBe(false);
  });

  it('ne touche pas aux étiquettes qui ne se gênent pas', () => {
    const a = { left: 0, right: 100, y: 100, h: 30 };
    const b = { left: 200, right: 300, y: 100, h: 30 };
    spreadLabels([a, b]);
    expect([a.y, b.y]).toEqual([100, 100]);
  });

  it('démêle une pile entière (arsenal en portrait)', () => {
    const boxes = Array.from({ length: 7 }, (_, i) => ({
      left: 20 + i * 30,
      right: 220 + i * 30,
      y: 380 + (i % 2) * 12,
      h: 34,
    }));
    spreadLabels(boxes);
    for (const a of boxes) for (const b of boxes) if (a !== b) expect(overlaps(a, b)).toBe(false);
  });
});
