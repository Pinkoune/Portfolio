import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useT } from '../i18n/useT.ts';
import { Diamond, HoloCorners } from './primitives.tsx';
import { ui } from './styles.ts';
import s from './HoloPanel.module.css';

export interface Pager {
  index: number;
  total: number;
  onNavigate: (delta: -1 | 1) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Durée de fermeture (Motion III : ordre inverse, 0,6 s au total). */
const CLOSE_MS = 600;
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Titre « tapé » (760 – 1 060 ms) ; le texte complet reste lisible par les lecteurs d'écran. */
function useTyped(text: string) {
  const [typed, setTyped] = useState({ text, count: 0 });
  useEffect(() => {
    if (reduced()) return;
    let frame = 0;
    const start = performance.now() + 760;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / 300));
      setTyped({ text, count: Math.floor(k * text.length) });
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text]);
  if (reduced()) return text;
  return typed.text === text ? text.slice(0, typed.count) : '';
}

/**
 * Panneau holographique (DA « Panneau holo · anatomie ») : en-tête cyan avec le code de salle,
 * titre, contenu défilant, pied avec actions et pagination.
 * Dialogue modal natif : piège le focus, se ferme avec Échap, rend le focus au déclencheur.
 * placement = 'center' (mode classique) ou 'side' (à bord, la scène reste visible).
 */
export function HoloPanel({
  code,
  title,
  subtitle,
  placement = 'center',
  pager,
  actions,
  onClose,
  children,
}: {
  code: string;
  title: string;
  subtitle?: string;
  placement?: 'center' | 'side';
  pager?: Pager;
  actions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const { ui: u } = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const typed = useTyped(title);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  /** Ferme avec l'animation inverse, puis rend la main au dialogue natif. */
  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => ref.current?.close(), reduced() ? 150 : CLOSE_MS);
  };

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      data-placement={placement}
      data-closing={closing}
      aria-labelledby="holo-panel-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      onKeyDown={(e) => {
        if (!pager) return;
        if (e.key === 'ArrowRight') pager.onNavigate(1);
        if (e.key === 'ArrowLeft') pager.onNavigate(-1);
      }}
    >
      {placement === 'side' && (
        <span className={s.projector} aria-hidden="true">
          <Diamond size={10} variant="outline" color="var(--pk-holo)" />
          <span className={s.beam} />
        </span>
      )}
      <article className={s.panel}>
        <HoloCorners />
        <header className={s.head}>
          <span className={`${ui.label} ${s.room}`}>
            <Diamond size={7} color="var(--pk-holo)" />
            {code}
          </span>
          <button type="button" className={`${ui.label} ${s.close}`} onClick={close}>
            {u('dialog.close')} · <span aria-hidden="true">Échap</span>
          </button>
        </header>
        <div className={s.rule} />

        {/* Zone défilante atteignable au clavier (flèches), même sans lien à l'intérieur. */}
        <div className={s.body} tabIndex={0} aria-labelledby="holo-panel-title" role="region">
          <div className={s.titles}>
            <h2 id="holo-panel-title" className={`${ui.display} ${s.title}`}>
              <span className="visually-hidden">{title}</span>
              <span aria-hidden="true">
                {typed}
                {typed.length < title.length && <span className={s.caret}>_</span>}
              </span>
            </h2>
            {subtitle && <p className={`${ui.label} ${s.tagline}`}>{subtitle}</p>}
          </div>
          {children}
        </div>

        {(actions || pager) && (
          <footer className={s.foot}>
            <div className={s.links}>{actions}</div>
            {pager && pager.total > 1 && (
              <div className={`${ui.label} ${s.pager}`}>
                <button
                  type="button"
                  onClick={() => pager.onNavigate(-1)}
                  aria-label={u('panel.prev')}
                >
                  ‹
                </button>
                <span>
                  {pad(pager.index + 1)} / {pad(pager.total)}
                </span>
                <button
                  type="button"
                  onClick={() => pager.onNavigate(1)}
                  aria-label={u('panel.next')}
                >
                  ›
                </button>
              </div>
            )}
          </footer>
        )}
      </article>
    </dialog>
  );
}
