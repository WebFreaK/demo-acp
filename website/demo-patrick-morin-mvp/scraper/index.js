// ═══════════════════════════════════════════════════════════════
// Patrick Morin — Catalog Scraper via Bloomreach Discovery API
// Outputs catalog-acp.json in OpenAI Commerce (ACP) format
// ═══════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

// ─── Bloomreach Config (from patrickmorin.com source) ───────

const BR_CONFIG = {
  account_id: '7570',
  domain_key: 'patrickmorin_fr',
  endpoint: 'https://core.dxpapi.com/api/v1/core/',
  ref_url: 'https://patrickmorin.com/fr/',
  rows_per_page: 200,       // Max rows per API call
  fields: [
    'pid', 'title', 'brand', 'price', 'sale_price',
    'thumb_image', 'url', 'description', 'categories',
    'is_livraison_par_colis', 'availshipping', 'banner',
    'is_salable', 'entity_id', 'type_id', 'hover_image',
    'web_can_qc', 'isachatwebnonpermis', 'prix_map',
    'donotshowprice',
  ],
};

// Inventory field IDs per store
const STORE_IDS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','25'];

// Load store name mapping
const storesData = JSON.parse(readFileSync(join(DATA_DIR, 'stores.json'), 'utf-8'));
const STORE_MAP = storesData.store_map;

// ─── Bloomreach API Fetcher ─────────────────────────────────

async function fetchPage(query, start, rows) {
  const inventoryFields = STORE_IDS.map(id => `inventory_${id}`).join(',');
  const priceFields = STORE_IDS.map(id => `price_${id},specialprice_${id}`).join(',');
  const fl = [...BR_CONFIG.fields, inventoryFields, priceFields].join(',');

  const params = new URLSearchParams({
    account_id: BR_CONFIG.account_id,
    domain_key: BR_CONFIG.domain_key,
    request_type: 'search',
    search_type: 'keyword',
    q: query,
    fl,
    rows: String(rows),
    start: String(start),
    ref_url: BR_CONFIG.ref_url,
    url: BR_CONFIG.ref_url,
    _br_uid_2: `uid=${Date.now()}`,
  });

  const url = `${BR_CONFIG.endpoint}?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Bloomreach API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ─── Transform to ACP Format ────────────────────────────────

function toAcpProduct(doc) {
  const price = doc.sale_price || doc.price || 0;
  const originalPrice = (doc.sale_price && doc.price && doc.price > doc.sale_price)
    ? doc.price : null;

  // Build per-store inventory
  const quantityByStore = {};
  for (const storeId of STORE_IDS) {
    const inv = doc[`inventory_${storeId}`];
    if (inv !== undefined && inv !== null) {
      const storeName = STORE_MAP[storeId]?.name || `Store ${storeId}`;
      quantityByStore[storeName] = Math.max(0, Math.floor(inv));
    }
  }

  // Parse categories
  let categoryPath = '';
  try {
    if (doc.categories) {
      const cats = JSON.parse(doc.categories);
      if (Array.isArray(cats) && cats.length > 0) {
        const chain = Array.isArray(cats[0]) ? cats[0] : cats;
        categoryPath = chain.map(c => c.name).join(' > ');
      }
    }
  } catch { /* ignore parse errors */ }

  // Image URL
  const imageUrl = doc.thumb_image
    ? (doc.thumb_image.startsWith('http')
        ? doc.thumb_image
        : `https://patrickmorin.com/${doc.thumb_image}`)
    : null;

  // Total stock across all stores
  const totalStock = Object.values(quantityByStore).reduce((sum, v) => sum + v, 0);

  return {
    id: `PM-${doc.pid}`,
    pid: doc.pid,
    title: doc.title || '',
    description: (doc.description || '').replace(/\\n/g, '\n').slice(0, 2000),
    url: doc.url || '',
    image_url: imageUrl,
    price: {
      amount: Math.round(price * 100),
      currency: 'CAD',
      display: `${price.toFixed(2)} $`,
      ...(originalPrice ? {
        original_amount: Math.round(originalPrice * 100),
        original_display: `${originalPrice.toFixed(2)} $`,
      } : {}),
    },
    brand: doc.brand || '',
    category: categoryPath,
    availability: {
      in_stock: totalStock > 0 || doc.is_salable === 'true',
      total_stock: totalStock,
      quantity_by_store: quantityByStore,
    },
    shipping: {
      colis_available: doc.is_livraison_par_colis === 'true' || doc.availshipping === 'true',
      pickup_in_store: true,
      free_above_cents: 10000,
    },
    attributes: {
      ...(doc.web_can_qc ? { provenance: doc.web_can_qc } : {}),
      ...(doc.type_id ? { type: doc.type_id } : {}),
    },
    banner: Array.isArray(doc.banner)
      ? doc.banner.filter(b => b && b !== 'No Banner').join(', ')
      : (doc.banner && doc.banner !== 'No Banner' ? doc.banner : ''),
    web_only: doc.isachatwebnonpermis === 'true',
    locale: 'fr_CA',
  };
}

// ─── Main Scrape Function ───────────────────────────────────

export async function scrapeFullCatalog({ onProgress } = {}) {
  const startTime = Date.now();
  const log = (msg) => {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  log('Starting full catalog scrape from Bloomreach API...');

  // First call: get total count
  const firstPage = await fetchPage('*', 0, 1);
  const totalProducts = firstPage.response.numFound;
  log(`Total products in catalog: ${totalProducts}`);

  const allProducts = [];
  const rows = BR_CONFIG.rows_per_page;
  const totalPages = Math.ceil(totalProducts / rows);

  for (let page = 0; page < totalPages; page++) {
    const start = page * rows;
    const retries = 3;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const data = await fetchPage('*', start, rows);
        const docs = data.response?.docs || [];

        for (const doc of docs) {
          try {
            allProducts.push(toAcpProduct(doc));
          } catch (e) {
            log(`Warning: Failed to convert product ${doc.pid}: ${e.message}`);
          }
        }

        log(`Page ${page + 1}/${totalPages} — fetched ${docs.length} products (total: ${allProducts.length})`);
        break; // Success, exit retry loop
      } catch (err) {
        if (attempt === retries) {
          log(`ERROR: Failed page ${page + 1} after ${retries} attempts: ${err.message}`);
        } else {
          log(`Retry ${attempt}/${retries} for page ${page + 1}: ${err.message}`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    // Rate limit: small delay between pages
    if (page < totalPages - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`Scrape complete: ${allProducts.length} products in ${elapsed}s`);

  // Build ACP catalog
  const catalog = {
    merchant: {
      name: 'Patrick Morin',
      domain: 'patrickmorin.com',
      locale: 'fr_CA',
      currency: 'CAD',
    },
    metadata: {
      scraped_at: new Date().toISOString(),
      total_products: allProducts.length,
      source: 'Bloomreach Discovery API',
      scrape_duration_seconds: parseFloat(elapsed),
    },
    stores: Object.entries(STORE_MAP).map(([id, store]) => ({
      id: `pm-${store.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      retailer_id: id,
      name: store.name,
      address: store.address,
      phone: store.phone,
      latitude: store.lat,
      longitude: store.lon,
    })),
    products: allProducts,
  };

  // Write to data directory
  const outputPath = join(DATA_DIR, 'catalog-acp.json');
  writeFileSync(outputPath, JSON.stringify(catalog, null, 2), 'utf-8');
  log(`Catalog written to ${outputPath} (${(JSON.stringify(catalog).length / 1024 / 1024).toFixed(1)} MB)`);

  return catalog;
}

// ─── CLI Entry Point ────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrapeFullCatalog()
    .then(catalog => {
      console.log(`\n✅ Done: ${catalog.products.length} products scraped`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Scrape failed:', err);
      process.exit(1);
    });
}
