import { readFileSync } from 'fs';

const res = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'Je refais ma salle de bain au complet, douche en céramique 3×5' }], storeId: 'laurentides' })
});
const text = await res.text();
const blocks = text.split('\n\n');
let allPids = [];
for (const block of blocks) {
  const ev = block.match(/^event:\s*(.+)/m);
  const d = block.match(/^data:\s*(.+)/m);
  if (!ev || !d) continue;
  if (ev[1].trim() === 'products' || ev[1].trim() === 'complements') {
    try {
      const parsed = JSON.parse(d[1]);
      allPids.push(...(parsed.products || []).map(p => p.product_id));
    } catch {}
  }
}

const cat = JSON.parse(readFileSync('data/catalog-materio.json', 'utf8'));
console.log('Products returned for bathroom scenario:');
for (const pid of allPids) {
  const p = cat.products.find(x => x.pid === pid);
  const hasCuisine = p && (p.title.toLowerCase().includes('cuisine') || p.category.toLowerCase().includes('evier de cuisine'));
  const flag = hasCuisine ? '❌ CUISINE' : '✅';
  console.log(flag + ' ' + pid + ' | ' + (p ? p.title.substring(0, 70) : 'NOT FOUND'));
}
const kitchenCount = allPids.filter(pid => {
  const p = cat.products.find(x => x.pid === pid);
  return p && (p.title.toLowerCase().includes('cuisine') || p.category.toLowerCase().includes('evier de cuisine'));
}).length;
console.log('\nKitchen products: ' + kitchenCount + '/' + allPids.length);
const hasTile = allPids.some(pid => {
  const p = cat.products.find(x => x.pid === pid);
  return p && (p.title.toLowerCase().includes('tuile') || p.title.toLowerCase().includes('céramique') || p.title.toLowerCase().includes('ceramique'));
});
console.log('Has tiles/ceramics: ' + (hasTile ? '✅ YES' : '❌ NO'));
