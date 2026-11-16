import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { HotspotButton } from '../ui/Hotspot.tsx';
import { hotspotElements, useHotspots } from './hotspots.ts';
import { spreadLabels, type LabelBox } from './labels.ts';
import s from './ShipExperience.module.css';

const v = new Vector3();
/** Marges de l'écran : côtés, HUD du haut, plan du vaisseau en bas. */
const EDGE = 12;
const TOP = 72;
const BOTTOM = 100;
/** Distance entre le bord du bouton et l'ancre (centre du losange). */
const PIN = 17;

interface Placed extends LabelBox {
  el: HTMLElement;
  side: 'left' | 'right';
  x: number;
  y: number;
}

/** Écart minimal entre deux étiquettes. */
const GAP = 4;

/**
 * Dans le Canvas : projette chaque ancre à l'écran et déplace son bouton. Un repère proche du bord
 * (fréquent en portrait) est ramené dans l'écran, son étiquette retournée vers l'intérieur ; deux
 * étiquettes qui se chevauchent sont écartées verticalement (carte stellaire, arsenal en portrait).
 */
export function HotspotProjector() {
  const camera = useThree((st) => st.camera);
  const size = useThree((st) => st.size);
  useFrame(() => {
    const { width, height } = size;
    const placed: Placed[] = [];
    // Lectures (tailles) d'abord, écritures ensuite : pas de recalcul de mise en page en boucle.
    for (const { id, anchor, props } of useHotspots.getState().entries) {
      const el = hotspotElements.get(id);
      if (!el) continue;
      v.setFromMatrixPosition(anchor.matrixWorld).project(camera);
      if (!(v.z < 1 && Math.abs(v.x) < 1.6 && Math.abs(v.y) < 1.3)) {
        el.style.visibility = 'hidden';
        continue;
      }
      const inner = el.firstElementChild as HTMLElement | null;
      const w = inner?.offsetWidth ?? 0;
      const h = inner?.offsetHeight ?? 0;
      let x = ((v.x + 1) / 2) * width;
      const y = MathUtils.clamp(((1 - v.y) / 2) * height, TOP, height - BOTTOM);
      let side = props.side ?? 'right';
      const fitsRight = x - PIN + w <= width - EDGE;
      const fitsLeft = x + PIN - w >= EDGE;
      if (side === 'right' && !fitsRight && fitsLeft) side = 'left';
      else if (side === 'left' && !fitsLeft && fitsRight) side = 'right';
      x =
        side === 'right'
          ? MathUtils.clamp(x, EDGE + PIN, Math.max(EDGE + PIN, width - EDGE - w + PIN))
          : MathUtils.clamp(x, Math.min(width - EDGE - PIN, EDGE + w - PIN), width - EDGE - PIN);
      const left = side === 'right' ? x - PIN : x + PIN - w;
      placed.push({ el, side, x, y, left, right: left + w, h });
    }

    spreadLabels(placed, GAP);

    for (const { el, side, x, y } of placed) {
      el.style.visibility = 'visible';
      if (el.dataset.side !== side) el.dataset.side = side;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });
  return null;
}

/** Hors du Canvas : un bouton DOM par hotspot enregistré. */
export function HotspotLayer() {
  const entries = useHotspots((st) => st.entries);
  return (
    <div className={s.hotspots}>
      {entries.map(({ id, props }) => (
        <div
          key={id}
          className={s.hotspot}
          data-side={props.side ?? 'right'}
          ref={(el) => {
            if (el) hotspotElements.set(id, el);
            else hotspotElements.delete(id);
          }}
        >
          <div className={s.hotspotInner}>
            <HotspotButton {...props} />
          </div>
        </div>
      ))}
    </div>
  );
}
