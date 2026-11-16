import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { formatErrors } from './build.ts';
import { loadContent } from './read.ts';
import { DEFAULT_SITE_URL, normalizeSiteUrl, robotsTxt, seoHead, sitemapXml } from './seo.ts';

const VIRTUAL_ID = 'virtual:content';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Expose content/ validé sous forme de module virtuel JSON : le navigateur ne reçoit ni YAML ni Zod.
 * Un contenu invalide fait échouer le build (et affiche l'overlay d'erreur en dev).
 */
export function contentPlugin(): Plugin {
  let root = '';
  return {
    name: 'pk-content',
    configResolved(config) {
      root = resolve(config.root, 'content');
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const { content, errors } = loadContent(root);
      if (!content) throw new Error(`Contenu invalide :\n${formatErrors(errors)}`);
      return `export default ${JSON.stringify(content)};`;
    },
    configureServer(server) {
      server.watcher.add(root);
      const reload = (file: string) => {
        if (!file.startsWith(root)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', reload);
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

/**
 * Référencement : injecte les balises de <head> à la place de `<!-- pk:seo -->` dans index.html et
 * publie robots.txt et sitemap.xml. VITE_SITE_URL donne l'adresse publique (homelab, domaine perso).
 */
export function seoPlugin(): Plugin {
  let root = '';
  const siteUrl = normalizeSiteUrl(process.env.VITE_SITE_URL ?? DEFAULT_SITE_URL);
  return {
    name: 'pk-seo',
    configResolved(config) {
      root = resolve(config.root, 'content');
    },
    transformIndexHtml(html) {
      const { content, errors } = loadContent(root);
      if (!content) throw new Error(`Contenu invalide :\n${formatErrors(errors)}`);
      return html.replace('<!-- pk:seo -->', seoHead(content, siteUrl));
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(siteUrl) });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemapXml(siteUrl, new Date().toISOString().slice(0, 10)),
      });
    },
  };
}
