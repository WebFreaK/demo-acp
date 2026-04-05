// test-scenarios.js — Run 10 validation scenarios against the Matério chat API
// Captures: products recommended, tool calls, categories covered, response text

const SCENARIOS = [
  { id: 1, msg: "Je veux refaire ma toiture, maison 30×40 pieds, 2 versants" },
  { id: 2, msg: "Je construis une terrasse 12×16 en bois traité, hauteur 2 pieds" },
  { id: 3, msg: "Je finis mon sous-sol, 600 pi², plafond 8 pieds" },
  { id: 4, msg: "Je refais ma salle de bain au complet, douche en céramique 3×5" },
  { id: 5, msg: "Je veux construire un cabanon 10×12" },
  { id: 6, msg: "Je dois refaire ma clôture, 80 pieds linéaires, 6 pieds de haut" },
  { id: 7, msg: "Je peins l'intérieur de ma maison, 1200 pi² de murs" },
  { id: 8, msg: "Je change mon plancher de cuisine pour du vinyle, 150 pi²" },
  { id: 9, msg: "Je remplace 5 fenêtres et 1 porte patio" },
  { id: 10, msg: "Je refais le revêtement extérieur, 1500 pi², canexel" },
];

const BASE_URL = "http://localhost:3001";

async function runScenario(scenario) {
  const startTime = Date.now();
  
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: scenario.msg }],
    }),
  });

  const text = await res.text();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Parse SSE events
  const events = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      const eventLine = text.split("\n")[text.split("\n").indexOf(line) - 1];
      const eventType = eventLine?.startsWith("event: ") ? eventLine.slice(7) : "unknown";
      try {
        events.push({ type: eventType, data: JSON.parse(line.slice(6)) });
      } catch {}
    }
  }

  // Parse SSE more carefully
  const parsed = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("event: ")) {
      const evtType = lines[i].slice(7).trim();
      if (i + 1 < lines.length && lines[i + 1].startsWith("data: ")) {
        try {
          parsed.push({ type: evtType, data: JSON.parse(lines[i + 1].slice(6)) });
        } catch {}
      }
    }
  }

  // Extract metrics
  let responseText = "";
  let productsShown = [];
  let complementsShown = [];
  let toolCalls = [];
  let servicesShown = [];
  let financingShown = false;
  let estimationShown = false;
  let searchCatalogCalls = 0;

  for (const evt of parsed) {
    if (evt.type === "delta" && evt.data.content) {
      responseText += evt.data.content;
    }
    if (evt.type === "products" && evt.data.products) {
      productsShown.push(...evt.data.products);
    }
    if (evt.type === "complements" && evt.data.products) {
      complementsShown.push(...evt.data.products);
    }
    if (evt.type === "service") {
      servicesShown.push(evt.data.service_type);
    }
    if (evt.type === "financing") {
      financingShown = true;
    }
    if (evt.type === "estimation") {
      estimationShown = true;
    }
  }

  // Count search_catalog from response text patterns (it's internal, not an SSE event)
  // We can infer from the number of distinct product categories recommended

  return {
    id: scenario.id,
    question: scenario.msg,
    elapsed: `${elapsed}s`,
    responseLength: responseText.length,
    responseWords: responseText.split(/\s+/).length,
    productsCount: productsShown.length,
    complementsCount: complementsShown.length,
    totalProducts: productsShown.length + complementsShown.length,
    productIds: productsShown.map(p => p.product_id),
    complementIds: complementsShown.map(p => p.product_id),
    services: servicesShown,
    financing: financingShown,
    estimation: estimationShown,
    responseExcerpt: responseText.slice(0, 500),
  };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  VALIDATION DES 10 SCÉNARIOS — Matério MVP (post-amélioration)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const results = [];

  for (const scenario of SCENARIOS) {
    console.log(`\n📋 Scénario ${scenario.id}: "${scenario.msg}"`);
    console.log("─".repeat(70));
    
    try {
      const result = await runScenario(scenario);
      results.push(result);
      
      console.log(`  ⏱  Temps: ${result.elapsed}`);
      console.log(`  📦 Produits recommandés: ${result.productsCount}`);
      console.log(`  🔗 Compléments auto: ${result.complementsCount}`);
      console.log(`  📊 Total produits: ${result.totalProducts}`);
      console.log(`  🔧 Services: ${result.services.length > 0 ? result.services.join(', ') : 'aucun'}`);
      console.log(`  💰 Financement: ${result.financing ? 'oui' : 'non'}`);
      console.log(`  📋 Estimation: ${result.estimation ? 'oui' : 'non'}`);
      console.log(`  📝 Réponse: ${result.responseWords} mots`);
      console.log(`  IDs produits: ${result.productIds.join(', ') || 'aucun'}`);
      console.log(`  IDs compléments: ${result.complementIds.join(', ') || 'aucun'}`);
      console.log(`\n  Extrait réponse:`);
      console.log(`  ${result.responseExcerpt.slice(0, 300).replace(/\n/g, '\n  ')}...`);
    } catch (err) {
      console.error(`  ❌ Erreur: ${err.message}`);
      results.push({ id: scenario.id, error: err.message });
    }
  }

  // Summary table
  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("  RÉSUMÉ DES RÉSULTATS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("| # | Scénario (abrégé) | Produits | Compléments | Total | Services | Financement | Temps |");
  console.log("|---|-------------------|----------|-------------|-------|----------|-------------|-------|");
  
  let totalProducts = 0, totalComplements = 0, totalAll = 0;
  
  for (const r of results) {
    if (r.error) {
      console.log(`| ${r.id} | ERREUR | - | - | - | - | - | - |`);
      continue;
    }
    const shortQ = r.question.slice(0, 40) + (r.question.length > 40 ? '…' : '');
    console.log(`| ${r.id} | ${shortQ} | ${r.productsCount} | ${r.complementsCount} | ${r.totalProducts} | ${r.services.join(',') || '-'} | ${r.financing ? '✅' : '-'} | ${r.elapsed} |`);
    totalProducts += r.productsCount;
    totalComplements += r.complementsCount;
    totalAll += r.totalProducts;
  }

  const validResults = results.filter(r => !r.error);
  const avgProducts = (totalProducts / validResults.length).toFixed(1);
  const avgComplements = (totalComplements / validResults.length).toFixed(1);
  const avgTotal = (totalAll / validResults.length).toFixed(1);

  console.log(`|---|-------------------|----------|-------------|-------|----------|-------------|-------|`);
  console.log(`| MOY | — | ${avgProducts} | ${avgComplements} | ${avgTotal} | — | — | — |`);

  console.log(`\n\n📊 MÉTRIQUES CIBLES vs RÉSULTATS:`);
  console.log(`  Produits/projet: ${avgTotal} (cible: ≥ 8)`);
  console.log(`  Résultat: ${parseFloat(avgTotal) >= 8 ? '✅ ATTEINT' : '❌ SOUS LA CIBLE'}`);
  
  // Write JSON results
  const fs = await import('fs');
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  console.log(`\n💾 Résultats détaillés sauvegardés dans test-results.json`);
}

main().catch(console.error);
