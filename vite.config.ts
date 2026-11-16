import { execSync } from 'node:child_process';
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { contentPlugin, seoPlugin } from './src/content/vite-plugin.ts';

const git = (args: string) => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
};

/** Commit déployé et tout premier commit du dépôt (la CI clone tout l'historique). */
function buildInfo() {
  const root = git('rev-list --max-parents=0 HEAD').split('\n').pop() ?? '';
  return {
    commit: git('rev-parse --short HEAD') || 'dev',
    root: root ? root.slice(0, 7) : '5f79f78',
    rootMessage: (root && git(`log -1 --format=%s ${root}`)) || 'Initial commit',
    date: new Date().toISOString(),
  };
}

/**
 * Précharge ce que la première image affiche : les trois polices (sous-ensemble latin) et le rendu
 * du mode classique. Sans ça, le navigateur ne les découvre qu'après avoir lu le CSS et le JS.
 */
function preloadPlugin(): Plugin {
  let base = '/';
  const wanted = [
    { test: /archivo-latin-wdth-normal-.*\.woff2$/, as: 'font', type: 'font/woff2' },
    { test: /instrument-sans-latin-wght-normal-.*\.woff2$/, as: 'font', type: 'font/woff2' },
    { test: /martian-mono-latin-wdth-normal-.*\.woff2$/, as: 'font', type: 'font/woff2' },
    { test: /hero-.*\.webp$/, as: 'image', type: 'image/webp' },
  ];
  return {
    name: 'pk-preload',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const files = Object.keys(ctx.bundle ?? {});
        return wanted.flatMap(({ test, as, type }): HtmlTagDescriptor[] => {
          const file = files.find((f) => test.test(f));
          if (!file) return [];
          const attrs = { rel: 'preload', href: base + file, as, type };
          return [{ tag: 'link', attrs: as === 'font' ? { ...attrs, crossorigin: '' } : attrs }];
        });
      },
    },
  };
}

// GitHub Pages sert le site sous /Portfolio-overpowered/ ; le dev local et l'image Docker sous /.
// VITE_BASE permet de surcharger (ex. VITE_BASE=/ npm run build pour le homelab).
export default defineConfig(({ command, isPreview }) => ({
  base:
    process.env.VITE_BASE ?? (command === 'build' || isPreview ? '/Portfolio-overpowered/' : '/'),
  plugins: [react(), contentPlugin(), seoPlugin(), preloadPlugin()],
  define: { __BUILD__: JSON.stringify(buildInfo()) },
  build: {
    // three.js seul pèse ~700 ko : le budget réel est vérifié par scripts/check-size.ts.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        // Bibliothèques à part : un déploiement qui ne touche que le site garde leur cache navigateur.
        codeSplitting: {
          groups: [
            { name: 'three', priority: 2, test: /node_modules[\\/]three[\\/]/ },
            {
              name: 'r3f',
              priority: 1,
              test: /node_modules[\\/](@react-three|postprocessing|its-fine|suspend-react)/,
            },
            {
              name: 'react',
              priority: 3,
              test: /node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/,
            },
          ],
        },
      },
    },
  },
}));
