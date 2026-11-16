import { expect, test } from '@playwright/test';
import { boot, expectAccessible } from './helpers.ts';

test.describe('mode classique', () => {
  test('affiche tout le contenu, sans erreur ni défaut d’accessibilité', async ({ page }) => {
    const errors = await boot(page, { preferredMode: 'classic' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const id of ['starmap', 'arsenal', 'machines', 'logbook', 'quarters', 'comms']) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
    await expectAccessible(page);
    expect(errors).toEqual([]);
  });

  test('change de langue', async ({ page }) => {
    await boot(page, { preferredMode: 'classic' });
    await page
      .getByRole('group', { name: /langue/i })
      .first()
      .getByRole('button', { name: 'EN' })
      .click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/DevOps & platform/);
  });

  test('ouvre et referme une fiche projet au clavier', async ({ page }) => {
    await boot(page, { preferredMode: 'classic' });
    const open = page.locator('#starmap').getByRole('button').first();
    await open.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expectAccessible(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });
});
