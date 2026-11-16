/** Boîte d'une étiquette de hotspot à l'écran : bords horizontaux, centre vertical, hauteur. */
export interface LabelBox {
  left: number;
  right: number;
  y: number;
  h: number;
}

/**
 * Écarte les étiquettes qui se chevauchent : du haut vers le bas, chacune descend sous celles,
 * déjà placées, qu'elle toucherait. Modifie `y` sur place et renvoie la liste triée.
 */
export function spreadLabels<T extends LabelBox>(boxes: T[], gap = 4): T[] {
  const sorted = [...boxes].sort((a, b) => a.y - b.y);
  const done: T[] = [];
  for (const box of sorted) {
    for (let pass = 0; pass <= done.length; pass++) {
      const hit = done.find(
        (q) =>
          box.left < q.right + gap &&
          q.left < box.right + gap &&
          // Marge d'arrondi : une étiquette posée pile sous une autre ne la touche plus.
          Math.abs(box.y - q.y) < (box.h + q.h) / 2 + gap - 0.01,
      );
      if (!hit) break;
      box.y = hit.y + (box.h + hit.h) / 2 + gap;
    }
    done.push(box);
  }
  return sorted;
}
