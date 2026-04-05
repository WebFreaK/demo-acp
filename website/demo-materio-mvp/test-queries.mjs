import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(readFileSync(join(__dirname, 'data/catalog-materio.json'), 'utf-8'));

function search(q, cat) {
  const ql = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cl = (cat || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let pool = d.products;
  if (cl) pool = pool.filter(p => (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(cl));
  const words = ql.split(/\s+/).filter(w => w.length > 1);
  let hits = pool.filter(p => (p.title + ' ' + p.category).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(ql));
  if (!hits.length) hits = pool.filter(p => { const t = (p.title + ' ' + p.category).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return words.every(w => t.includes(w)); });
  return hits;
}

// Check Papier-Membrane category
let pm = d.products.filter(p => (p.category || '').includes('Papier'));
console.log(`=== Papier cat (${pm.length}) first 10:`);
pm.slice(0, 10).forEach(p => console.log(`  ${p.title.slice(0, 60)} [${p.category}]`));

// Check Gypse category
let gp = d.products.filter(p => (p.category || '').includes('Gypse'));
console.log(`\n=== Gypse cat (${gp.length}) first 10:`);
gp.slice(0, 10).forEach(p => console.log(`  ${p.title.slice(0, 60)} [${(p.category || '').slice(0, 50)}]`));

const tests = [
  ['sous-couche synthétique', 'Papier'],
  ['membrane autocollante', 'Papier'],
  ['ruban masquage', ''],
  ['ruban adhesif', ''],
  ['ruban', 'Accessoires et outils de peinture'],
  ['panneau', 'Gypse'],
  ['pinceau angulaire', ''],
  ['toile protection', 'Accessoires et outils'],
  ['coulis alpha', ''],
  ['ciment-colle', ''],
  ['silicone salle bain', ''],
  ['planche cloture', ''],
  ['ancrage sol', ''],
  ['composite', 'Composite'],
  ['1 po x 3', 'Épinette'],
  ['teinture', 'Teinture'],
  ['peinture interieure', 'Peinture intérieure'],
];

console.log('\n=== Refined queries:');
tests.forEach(([q, cat]) => {
  const hits = search(q, cat);
  console.log(`[${q}${cat ? '|' + cat : ''}] ${hits.length} -> ${hits[0] ? hits[0].title.slice(0, 55) : 'NONE'}`);
});
