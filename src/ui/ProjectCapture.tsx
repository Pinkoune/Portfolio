import type { Project } from '../content/index.ts';
import { useT } from '../i18n/useT.ts';
import { ui } from './styles.ts';
import s from './HoloPanel.module.css';

/** Visuel d'un projet : première capture, sinon emplacement hachuré de la DA. */
export function ProjectCapture({ project }: { project: Project }) {
  const { t, ui: u } = useT();
  const media = project.media[0];
  if (media) {
    return (
      <img
        className={s.capture}
        src={import.meta.env.BASE_URL + media.src}
        alt={t(media.alt)}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <div className={s.capture} data-empty aria-hidden="true">
      <span className={ui.label}>
        {u('projects.capture')} · {project.title}
      </span>
    </div>
  );
}
