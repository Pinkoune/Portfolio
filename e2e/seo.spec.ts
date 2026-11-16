import { expect, test } from '@playwright/test';

test('référencement : balises, robots et sitemap publiés', async ({ page, request }) => {
  await page.goto('./');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og\.jpg$/);
  await expect(page.locator('script[type="application/ld+json"]')).toBeAttached();
  expect((await request.get('robots.txt')).ok()).toBe(true);
  expect((await request.get('sitemap.xml')).ok()).toBe(true);
  expect((await request.get('og.jpg')).headers()['content-type']).toContain('image/jpeg');
});
