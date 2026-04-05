import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('data/catalog-materio.json','utf-8'));
const _txt = p => (p.title+' '+p.category+' '+(p.brand||'')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

function srch(query, cat) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let pool = data.products;
  if (cat) pool = pool.filter(p => (p.category||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
  let r = pool.filter(p => _txt(p).includes(q)).slice(0,3);
  if (!r.length) { const w=q.split(/\s+/); r = pool.filter(p => w.every(ww => _txt(p).includes(ww))).slice(0,3); }
  if (!r.length && q.split(/\s+/).length > 1) {
    const w=q.split(/\s+/);
    const scored = pool.map(p=>({p,s:w.filter(ww=>_txt(p).includes(ww)).length})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,3);
    r = scored.map(x=>x.p);
  }
  return r.length > 0 ? r[0] : null;
}

const queries = [
  ['ruban a mesurer', 'Ruban a mesurer'],
  ['ruban mesurer', ''],
  ['marteau', 'Marteau'],
  ['marteau', ''],
  ['barre', 'Barre'],
  ['pistolet', ''],
  ['scie onglet', ''],
  ['ensemble combo', 'Ensemble combo'],
  ['couteau utilitaire', 'Couteaux'],
  ['perceuse visseuse', 'Perceuse'],
  ['scie circulaire', 'Scie circulaire'],
  ['cloueuse', 'Cloueuse'],
  ['niveau', 'Niveaux'],
  ['truelle', 'Outils de pose'],
  ['rouleau peinture', 'Pinceaux'],
  ['agrafeuse', 'Agrafeuse'],
  ['escabeau', 'chelles'],
  ['papier sable', 'Papier'],
];

for (const [q, c] of queries) {
  const r = srch(q, c);
  console.log((r?'✅':'❌')+' '+q.padEnd(25)+' cat:'+c.padEnd(25)+' → '+(r ? r.title.slice(0,55)+' ('+((r.price.amount/100).toFixed(2))+'$)' : 'NO MATCH'));
}
