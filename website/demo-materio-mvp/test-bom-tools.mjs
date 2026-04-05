import { readFileSync } from 'fs';

// Load catalog
const catalogData = JSON.parse(readFileSync('data/catalog-materio.json', 'utf8'));
const templates = JSON.parse(readFileSync('data/project-templates.json', 'utf8'));

// Replicate searchCatalogInternal
function searchCatalogInternal(query, categoryFilter) {
  if (!catalogData) return [];
  const terms = query.toLowerCase().split(/\s+/);
  let results = catalogData.products.filter(p => {
    const searchable = `${p.title} ${p.category} ${p.brand}`.toLowerCase();
    return terms.every(t => searchable.includes(t));
  });
  if (categoryFilter) {
    const catLower = categoryFilter.toLowerCase();
    const catFiltered = results.filter(p => p.category.toLowerCase().includes(catLower));
    if (catFiltered.length > 0) results = catFiltered;
  }
  return results.slice(0, 5).map(p => ({
    pid: p.pid, title: p.title, price: (p.price.amount / 100).toFixed(2) + '$',
    price_cents: p.price.amount, category: p.category, brand: p.brand
  }));
}

// Simulate analyzeProject for toiture 1200 pi²
const projectType = 'toiture';
const template = templates.projects[projectType];
const surface = 1200;
const length = 0, width = 0, linear = 0;

const bom = { principal: [], quincaillerie: [], accessoire: [], outil: [] };
for (const cat of template.categories) {
  const results = searchCatalogInternal(cat.search.query, cat.search.category);
  if (results.length === 0) continue;
  const bestMatch = results[0];
  let quantity = 1;
  try {
    const formula = cat.quantity_formula;
    if (formula.type === 'fixed') quantity = formula.quantity;
    else if (formula.calculate) {
      const fn = new Function('surface', 'length', 'width', 'linear', `return ${formula.calculate};`);
      quantity = Math.max(1, Math.round(fn(surface, length, width, linear)));
    }
  } catch (e) { quantity = 1; }
  
  const item = {
    product_id: bestMatch.pid, title: bestMatch.title, price: bestMatch.price,
    price_cents: bestMatch.price_cents, category_name: cat.name, quantity,
    quantity_formula: cat.quantity_formula.description, brand: bestMatch.brand,
    importance: cat.importance || 0, importance_label: cat.importance_label || '',
    explanation: cat.explanation || ''
  };
  bom[cat.role].push(item);
}

// Format tools section
let toolsText = `### 🔧 Outils recommandés (par ordre d'importance)\n`;
for (const item of bom.outil) {
  const badge = item.importance === 1 ? '🔴 Essentiel' : item.importance === 2 ? '🟡 Très utile' : '🟢 Recommandé';
  toolsText += `- **${badge}** — ${item.category_name}: ${item.title} — ${item.price} [pid: ${item.product_id}]\n`;
  toolsText += `  _${item.explanation}_\n`;
}

console.log(toolsText);
