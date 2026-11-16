import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

/*
 * Budget de performance, vérifié en CI après le build (gzip, en ko) :
 * - chargement initial : ce que index.html télécharge avant d'afficher quoi que ce soit ;
 * - vaisseau : le JS chargé à l'embarquement (three.js, R3F, salles).
 * Un dépassement fait échouer la CI ; augmenter un budget doit être une décision assumée.
 */
const BUDGET_KB = { initialJs: 115, initialCss: 14, shipJs: 330 };

const dist = resolve(import.meta.dirname, '../dist');
const assets = resolve(dist, 'assets');
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const gz = (file: string) =>
  gzipSync(readFileSync(resolve(assets, file)), { level: 9 }).length / 1024;

const referenced = [...html.matchAll(/(?:src|href)="[^"]*assets\/([^"]+)"/g)].map((m) => m[1]!);
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js'));
const initialJs = referenced.filter((f) => f.endsWith('.js'));
const initialCss = referenced.filter((f) => f.endsWith('.css'));
const shipJs = js.filter((f) => !initialJs.includes(f));

const sum = (list: string[]) => list.reduce((total, f) => total + gz(f), 0);
const rows = [
  ['Chargement initial (JS)', sum(initialJs), BUDGET_KB.initialJs, initialJs],
  ['Chargement initial (CSS)', sum(initialCss), BUDGET_KB.initialCss, initialCss],
  ['Vaisseau 3D (JS, à la demande)', sum(shipJs), BUDGET_KB.shipJs, shipJs],
] as const;

let failed = false;
const lines = ['| Lot | gzip | Budget | Fichiers |', '| --- | ---: | ---: | --- |'];
for (const [label, size, budget, list] of rows) {
  const ok = size <= budget;
  failed ||= !ok;
  const names = list.map((f) => basename(f).replace(/-[\w-]{8}\./, '.')).join(', ');
  lines.push(`| ${ok ? '✓' : '✗'} ${label} | ${size.toFixed(1)} ko | ${budget} ko | ${names} |`);
}
console.log(lines.join('\n'));
if (failed) {
  console.error('\n✗ Budget de taille dépassé.');
  process.exit(1);
}
