import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogData = JSON.parse(readFileSync(join(__dirname, 'data/catalog-materio.json'), 'utf-8'));
const projectTemplates = JSON.parse(readFileSync(join(__dirname, 'data/project-templates.json'), 'utf-8'));

function searchCatalogInternal(query, category) {
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = q.split(/\s+/).filter(w => w.length > 1 || /\d/.test(w));
  if (!words.length) return [];
  const catFilter = (category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let pool = catalogData.products;
  if (catFilter) pool = pool.filter(p => (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(catFilter));
  const _txt = (p) => (p.title + ' ' + p.category + ' ' + (p.brand || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let results = pool.filter(p => _txt(p).includes(q)).slice(0, 10);
  if (!results.length) results = pool.filter(p => words.every(w => _txt(p).includes(w))).slice(0, 10);
  if (!results.length && words.length > 1) {
    results = pool.map(p => ({ p, score: words.filter(w => _txt(p).includes(w)).length })).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10).map(s => s.p);
  }
  return results.map(p => ({ pid: p.pid, title: p.title, price: (p.price.amount / 100).toFixed(2) + '$', price_cents: p.price.amount, category: p.category, brand: p.brand || '' }));
}

function testProject(name, type, surface, length, width, linear) {
  const template = projectTemplates.projects[type];
  console.log(`\n=== ${name} ===`);
  console.log(`Categories in template: ${template.categories.length}`);
  let found = 0, total$ = 0;
  for (const cat of template.categories) {
    const results = searchCatalogInternal(cat.search.query, cat.search.category);
    let qty = 1;
    try {
      if (cat.quantity_formula.type === 'fixed') qty = cat.quantity_formula.quantity;
      else if (cat.quantity_formula.calculate) {
        const fn = new Function('surface', 'length', 'width', 'linear', 'return ' + cat.quantity_formula.calculate + ';');
        qty = Math.max(1, Math.round(fn(surface, length, width, linear)));
      }
    } catch (e) { qty = 1; }
    const match = results.length > 0 ? results[0] : null;
    const status = match ? '✅' : '❌';
    const cost = match ? (match.price_cents * qty / 100) : 0;
    total$ += cost;
    if (match) found++;
    console.log(`  ${status} ${cat.role.padEnd(13)} ${cat.name.padEnd(32)} qty=${String(qty).padEnd(5)} ${match ? match.title.slice(0, 45) + ' ' + match.price : 'NOT FOUND'}`);
  }
  console.log(`  SCORE: ${found}/${template.categories.length} categories found | Subtotal: ${total$.toFixed(2)}$`);
}

testProject('TOITURE 1200 pi²', 'toiture', 1200, 35, 35, 0);
testProject('TERRASSE 12x16', 'terrasse', 192, 16, 12, 0);
testProject('SOUS-SOL 600 pi²', 'sous_sol', 600, 25, 25, 0);
testProject('SALLE DE BAIN 5x8', 'salle_de_bain', 40, 8, 5, 0);
testProject('CABANON 10x12', 'cabanon', 120, 12, 10, 0);
testProject('GARAGE 24x28', 'garage', 672, 28, 24, 0);
testProject('CLÔTURE 60 pi lin', 'cloture', 360, 60, 6, 60);
testProject('PEINTURE 1000 pi²', 'peinture', 1000, 32, 32, 0);
