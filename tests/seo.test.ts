import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/read.ts';
import {
  DEFAULT_SITE_URL,
  normalizeSiteUrl,
  personJsonLd,
  robotsTxt,
  seoHead,
  sitemapXml,
} from '../src/content/seo.ts';

const content = loadContent(resolve(import.meta.dirname, '../content')).content!;
const site = DEFAULT_SITE_URL;

describe('référencement', () => {
  const head = seoHead(content, site);

  it('reprend le titre et la description FR du profil, échappés', () => {
    expect(head).toContain('<title>Pinkoune · Jérémy Barcelo, DevOps &amp; plateforme</title>');
    expect(head).toMatch(/<meta name="description" content="Portfolio de Jérémy Barcelo[^"]+" \/>/);
  });

  it('annonce une image Open Graph absolue de 1200 × 630', () => {
    expect(head).toContain(`<meta property="og:image" content="${site}og.jpg" />`);
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it('décrit la personne sans aucune adresse email', () => {
    const person = personJsonLd(content, site);
    expect(person.sameAs).toEqual(content.profile.links.map((l) => l.url));
    expect(JSON.stringify(person)).not.toMatch(/@[a-z0-9-]+\.[a-z]/i);
    expect(head).not.toContain('mailto:');
  });

  it('ne laisse aucun texte fermer la balise de données structurées', () => {
    expect(head.match(/<\/script>/g)).toHaveLength(1);
  });

  it('robots et sitemap suivent l’adresse du site', () => {
    expect(robotsTxt(site)).toContain('Disallow: /Portfolio-overpowered/admin/');
    expect(robotsTxt(site)).toContain(`Sitemap: ${site}sitemap.xml`);
    expect(robotsTxt('https://pinkoune.example/')).toContain('Disallow: /admin/');
    expect(sitemapXml(site, '2026-10-05')).toContain(`<loc>${site}</loc>`);
    expect(normalizeSiteUrl('https://pinkoune.example')).toBe('https://pinkoune.example/');
  });
});
