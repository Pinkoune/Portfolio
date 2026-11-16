import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

type Saved = { preferredMode?: '3d' | 'classic'; introSeen?: boolean; soundOn?: boolean };

/** Prépare le stockage local avant le chargement (le rendu logiciel choisirait le classique). */
export async function boot(page: Page, state: Saved, hash = '') {
  await page.addInitScript((s) => {
    if (!localStorage.getItem('pk-01')) {
      localStorage.setItem('pk-01', JSON.stringify({ state: s, version: 1 }));
    }
  }, state);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`./${hash}`);
  return errors;
}

/** Audit axe (WCAG 2.1 A et AA) ; le canvas 3D est décoratif et exclu. */
export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('canvas')
    .analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}) : ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

export const progress = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('pk-01') ?? '{}').state?.progress);
