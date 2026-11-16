import type { Content } from './build.ts';

/*
 * Référencement, généré au build depuis content/site/profile.yaml (FR, langue par défaut) :
 * balises <head> (description, Open Graph, carte X, données structurées), robots.txt et sitemap.xml.
 * Fonctions pures : testées dans tests/seo.test.ts, branchées par seoPlugin (vite-plugin.ts).
 */

/** Adresse publique du site, avec la barre finale. */
export const DEFAULT_SITE_URL = 'https://pinkoune.github.io/Portfolio-overpowered/';

export const normalizeSiteUrl = (url: string) => (url.endsWith('/') ? url : `${url}/`);

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Personne décrite pour les moteurs (schema.org) : nom, rôle, ville, profils publics. Pas d'email. */
export function personJsonLd(content: Content, siteUrl: string) {
  const { profile } = content;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    alternateName: profile.alias,
    jobTitle: profile.role.fr,
    description: profile.seo.description.fr,
    url: siteUrl,
    image: `${siteUrl}og.jpg`,
    address: { '@type': 'PostalAddress', addressLocality: profile.location, addressCountry: 'FR' },
    sameAs: profile.links.map((l) => l.url),
  };
}

export function seoHead(content: Content, siteUrl: string) {
  const { seo, name } = content.profile;
  const title = escapeHtml(seo.title.fr);
  const description = escapeHtml(seo.description.fr);
  const image = `${siteUrl}og.jpg`;
  // « </ » est neutralisé pour qu'aucun texte ne puisse fermer la balise <script>.
  const jsonLd = JSON.stringify(personJsonLd(content, siteUrl)).replace(/<\//g, '<\\/');
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="author" content="${escapeHtml(name)}" />`,
    `<link rel="canonical" href="${siteUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="PK-01 · Pinkoune" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${siteUrl}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeHtml(content.ui['hero.imageAlt'].fr)}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:locale:alternate" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ');
}

/** Le futur mode éditeur (/admin, phase 7) n'a rien à faire dans les résultats de recherche. */
export const robotsTxt = (siteUrl: string) =>
  `User-agent: *\nAllow: /\nDisallow: ${new URL(siteUrl).pathname}admin/\n\nSitemap: ${siteUrl}sitemap.xml\n`;

export const sitemapXml = (siteUrl: string, lastmod: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`;
