import { readFileSync } from 'fs';

const catalog = JSON.parse(readFileSync('data/catalog-materio.json','utf8'));

const q = 'pelle bardeaux';
const cat = 'bardeau';
const results = catalog.products.filter(p => {
  const s = (p.title + ' ' + p.category).toLowerCase();
  const terms = q.toLowerCase().split(/\s+/);
  const matchTerms = terms.every(t => s.includes(t));
  const matchCat = !cat || p.category.toLowerCase().includes(cat.toLowerCase());
  return matchTerms && matchCat;
});
console.log('Query:', q, '| Category:', cat);
console.log('Results:', results.length);
results.forEach(p => console.log(' ', p.pid, '-', p.title, '-', (p.price.amount/100).toFixed(2) + '$'));
