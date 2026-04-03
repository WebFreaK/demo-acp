// ═══════════════════════════════════════════════════════════════
// Matério — Hourly Catalog Scraper Scheduler
// Runs scrapeFullCatalog() on startup + every hour
// ═══════════════════════════════════════════════════════════════

import { scrapeFullCatalog } from './index.js';

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let isRunning = false;

async function runScrape() {
  if (isRunning) {
    console.log('[scheduler] Scrape already in progress, skipping...');
    return;
  }

  isRunning = true;
  try {
    const catalog = await scrapeFullCatalog();
    console.log(`[scheduler] ✅ Catalog updated: ${catalog.products.length} products`);
  } catch (err) {
    console.error('[scheduler] ❌ Scrape failed:', err.message);
  } finally {
    isRunning = false;
  }
}

console.log(`
╔══════════════════════════════════════════════════════╗
║  Matério — Catalog Scraper Scheduler                 ║
║  Interval: every ${INTERVAL_MS / 60000} minutes                          ║
╚══════════════════════════════════════════════════════╝
`);

runScrape();
setInterval(runScrape, INTERVAL_MS);

process.on('SIGINT', () => {
  console.log('\n[scheduler] Stopping...');
  process.exit(0);
});
