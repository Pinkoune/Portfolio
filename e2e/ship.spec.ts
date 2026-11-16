import { expect, test } from '@playwright/test';
import { boot, expectAccessible, progress } from './helpers.ts';

const map = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Plan du vaisseau' });

test.describe('vaisseau 3D', () => {
  test('embarque depuis l’écran d’approche', async ({ page }) => {
    const errors = await boot(page, { preferredMode: '3d' });
    const embark = page.getByRole('button', { name: /Embarquer/ });
    await expect(embark).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('[data-ready="true"]')).toBeAttached({ timeout: 120_000 });
    await expectAccessible(page);
    await page.keyboard.press('Enter');
    await expect(map(page)).toBeVisible({ timeout: 60_000 });
    expect((await progress(page)).unlocked).toContain('premier-contact');
    expect(errors).toEqual([]);
  });

  test('HUD accessible, navigation au clavier et trophées', async ({ page }) => {
    const errors = await boot(page, { preferredMode: '3d', introSeen: true }, '#/bridge');
    await expect(map(page)).toBeVisible({ timeout: 120_000 });
    await expectAccessible(page);
    await page.keyboard.press('2');
    await expect(page).toHaveURL(/#\/starmap$/);
    await expect(map(page).locator('[aria-current="location"]')).toContainText('Carte stellaire');
    await page.keyboard.press('t');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectAccessible(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('revient au mode classique', async ({ page }) => {
    await boot(page, { preferredMode: '3d', introSeen: true }, '#/arsenal');
    await expect(map(page)).toBeVisible({ timeout: 120_000 });
    await page
      .getByRole('button', { name: /classique/i })
      .first()
      .click();
    await expect(page.locator('#arsenal')).toBeInViewport();
  });
});
