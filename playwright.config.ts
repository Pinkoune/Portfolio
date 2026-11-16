import { defineConfig, devices } from '@playwright/test';

/*
 * Tests de bout en bout sur le build de production (npm run build, puis preview).
 * La 3D tourne en WebGL logiciel (SwiftShader) : lent (~1 image/s) mais suffisant pour vérifier les
 * états. PW_CHROMIUM permet d'utiliser un Chromium déjà installé (bac à sable, poste sans téléchargement).
 */
const PORT = 4173;
const BASE = `http://localhost:${PORT}/Portfolio-overpowered/`;

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE,
    locale: 'fr-FR',
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM || undefined,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
  },
});
