// Test script for Matério tool triggering fix validation
// Runs 10 scenarios against the local server and counts products returned

const scenarios = [
  "Je veux refaire ma toiture, maison 30×40 pieds, 2 versants",
  "Je construis une terrasse 12×16 en bois traité, hauteur 2 pieds",
  "Je finis mon sous-sol, 600 pi², plafond 8 pieds",
  "Je refais ma salle de bain au complet, douche en céramique 3×5",
  "Je veux construire un cabanon 10×12",
  "Je dois refaire ma clôture, 80 pieds linéaires, 6 pieds de haut",
  "Je peins l'intérieur de ma maison, 1200 pi² de murs",
  "Je change mon plancher de cuisine pour du vinyle, 150 pi²",
  "Je remplace 5 fenêtres et 1 porte patio",
  "Je refais le revêtement extérieur, 1500 pi², canexel"
];

async function testScenario(id, question) {
  const start = Date.now();
  let products = [];
  let complements = [];
  let textChunks = [];
  let toolCalls = [];

  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: question }],
        storeId: 'laurentides'
      })
    });

    const text = await res.text();
    // Parse SSE events (format: "event: type\ndata: json\n\n")
    const blocks = text.split('\n\n');
    for (const block of blocks) {
      const eventMatch = block.match(/^event:\s*(.+)/m);
      const dataMatch = block.match(/^data:\s*(.+)/m);
      if (!eventMatch || !dataMatch) continue;
      const eventType = eventMatch[1].trim();
      const data = dataMatch[1].trim();
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        if (eventType === 'products') {
          // Accumulate all product events (may have multiple search_catalog calls)
          products.push(...(parsed.products || []));
        } else if (eventType === 'complements') {
          complements.push(...(parsed.products || []));
        } else if (eventType === 'tool_call') {
          toolCalls.push(parsed.name);
        } else if (eventType === 'delta') {
          textChunks.push(parsed.content || '');
        }
      } catch (e) {}
    }
  } catch (err) {
    console.error(`  ❌ Scenario ${id} error: ${err.message}`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const responseText = textChunks.join('');
  const status = products.length > 0 ? '✅' : '❌';

  console.log(`${status} #${id}: ${products.length} produits, ${complements.length} compléments, tools:[${toolCalls.join(',')}] (${elapsed}s)`);
  console.log(`   Q: ${question.substring(0, 60)}...`);
  console.log(`   R: ${responseText.substring(0, 120)}...`);
  console.log();

  return {
    id,
    question,
    elapsed: `${elapsed}s`,
    productsCount: products.length,
    complementsCount: complements.length,
    totalProducts: products.length + complements.length,
    toolCalls,
    productIds: products.map(p => p.pid),
    complementIds: complements.map(p => p.pid),
    responseExcerpt: responseText.substring(0, 200)
  };
}

console.log('🧪 Testing Matério tool triggering — 10 scenarios\n');
console.log('=' .repeat(70));

const results = [];
for (let i = 0; i < scenarios.length; i++) {
  const result = await testScenario(i + 1, scenarios[i]);
  results.push(result);
}

console.log('=' .repeat(70));
const passed = results.filter(r => r.productsCount > 0).length;
console.log(`\n📊 RÉSULTAT: ${passed}/10 scénarios avec produits affichés`);
console.log(`   Avant fix: 1/10 | Objectif: ≥8/10`);

// Save results
import { writeFileSync } from 'fs';
writeFileSync('test-results-after-fix.json', JSON.stringify(results, null, 2));
console.log('\n💾 Résultats sauvegardés dans test-results-after-fix.json');
