// ═══════════════════════════════════════════════════════════════
// Matério — Catalog Scraper for Magento 2 e-commerce
// 3-tier: REST API → GraphQL → HTML scraping (Cheerio)
// Outputs catalog-materio.json in ACP format
// ═══════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

const BASE_URL = 'https://www.materio.ca';
const ROWS_PER_PAGE = 50;

// ─── Magento 2 REST API Fetcher ─────────────────────────────

async function fetchRestApi(page = 1, pageSize = ROWS_PER_PAGE) {
  const params = new URLSearchParams({
    'searchCriteria[currentPage]': String(page),
    'searchCriteria[pageSize]': String(pageSize),
    'searchCriteria[filterGroups][0][filters][0][field]': 'status',
    'searchCriteria[filterGroups][0][filters][0][value]': '1',
  });

  const url = `${BASE_URL}/rest/V1/products?${params}`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'MaterioACP-Scraper/1.0',
    },
  });

  if (!res.ok) throw new Error(`REST API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Magento 2 GraphQL Fetcher ──────────────────────────────

async function fetchGraphQL(page = 1, pageSize = ROWS_PER_PAGE) {
  const query = `{
    products(
      filter: { }
      pageSize: ${pageSize}
      currentPage: ${page}
    ) {
      total_count
      items {
        sku
        name
        url_key
        price_range {
          minimum_price {
            regular_price { value currency }
            final_price { value currency }
          }
        }
        small_image { url label }
        description { html }
        categories { name breadcrumbs { category_name } }
        stock_status
      }
    }
  }`;

  const res = await fetch(`${BASE_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'MaterioACP-Scraper/1.0',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL errors: ${json.errors.map(e => e.message).join(', ')}`);
  return json.data.products;
}

// ─── HTML Scraper Fallback (requires cheerio) ───────────────

let cheerio;
try {
  cheerio = await import('cheerio');
} catch {
  cheerio = null;
}

const CATEGORIES_TO_SCRAPE = [
  '/materiaux',
  '/quincaillerie-et-outillage',
  '/plomberie',
  '/peinture',
  '/couvre-plancher',
  '/electricite',
  '/saisonnier',
  '/decoration',
  '/poeles-et-foyers',
  '/poutrelles',
];

async function scrapeHtmlCategory(categoryPath, log) {
  if (!cheerio) {
    log('Warning: cheerio not installed, skipping HTML scraping. Run: npm i cheerio');
    return [];
  }

  const products = [];
  let page = 1;
  const maxPages = 5; // Limit per category to avoid overloading

  while (page <= maxPages) {
    const url = `${BASE_URL}${categoryPath}?p=${page}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'MaterioACP-Scraper/1.0' },
      });
      if (!res.ok) break;

      const html = await res.text();
      const $ = cheerio.load(html);

      const items = $('.product-item');
      if (items.length === 0) break;

      items.each((_, el) => {
        try {
          const $el = $(el);
          const title = $el.find('.product-item-link').text().trim();
          const productUrl = $el.find('.product-item-link').attr('href') || '';
          const imageUrl = $el.find('.product-image-photo').attr('src') || '';
          const priceText = $el.find('.price').first().text().trim();
          const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
          const sku = $el.find('[data-product-id]').attr('data-product-id') || '';

          if (title) {
            products.push({
              sku: sku || `MAT-HTML-${products.length}`,
              title,
              url: productUrl,
              image_url: imageUrl,
              price,
              category: categoryPath.replace('/', '').replace(/-/g, ' '),
              source: 'html',
            });
          }
        } catch { /* skip malformed product */ }
      });

      log(`  HTML ${categoryPath} page ${page}: ${items.length} items`);
      page++;
      await new Promise(r => setTimeout(r, 500)); // polite delay
    } catch (err) {
      log(`  HTML ${categoryPath} page ${page} error: ${err.message}`);
      break;
    }
  }

  return products;
}

// ─── Transform to ACP Format ────────────────────────────────

function restProductToAcp(item) {
  const price = item.price || 0;
  const sku = item.sku || '';
  const name = item.name || '';
  const desc = (item.custom_attributes || []).find(a => a.attribute_code === 'description');
  const img = (item.custom_attributes || []).find(a => a.attribute_code === 'image');
  const urlKey = (item.custom_attributes || []).find(a => a.attribute_code === 'url_key');
  const catIds = (item.custom_attributes || []).find(a => a.attribute_code === 'category_ids');

  return {
    id: `MAT-${sku}`,
    pid: sku,
    title: name,
    description: desc?.value?.replace(/<[^>]*>/g, '').slice(0, 2000) || '',
    url: urlKey ? `${BASE_URL}/${urlKey.value}.html` : '',
    image_url: img ? `${BASE_URL}/media/catalog/product${img.value}` : null,
    price: {
      amount: Math.round(price * 100),
      currency: 'CAD',
      display: `${price.toFixed(2)} $`,
    },
    brand: '',
    category: catIds?.value ? `cat:${Array.isArray(catIds.value) ? catIds.value.join(',') : catIds.value}` : '',
    availability: { in_stock: true, total_stock: 0, quantity_by_store: {} },
    shipping: { colis_available: false, pickup_in_store: true },
    locale: 'fr_CA',
  };
}

function graphqlProductToAcp(item) {
  const priceInfo = item.price_range?.minimum_price || {};
  const finalPrice = priceInfo.final_price?.value || 0;
  const regularPrice = priceInfo.regular_price?.value || finalPrice;

  const categories = (item.categories || []).map(c => c.name).join(' > ');

  return {
    id: `MAT-${item.sku}`,
    pid: item.sku,
    title: item.name || '',
    description: item.description?.html?.replace(/<[^>]*>/g, '').slice(0, 2000) || '',
    url: item.url_key ? `${BASE_URL}/${item.url_key}.html` : '',
    image_url: item.small_image?.url || null,
    price: {
      amount: Math.round(finalPrice * 100),
      currency: 'CAD',
      display: `${finalPrice.toFixed(2)} $`,
      ...(regularPrice > finalPrice ? {
        original_amount: Math.round(regularPrice * 100),
        original_display: `${regularPrice.toFixed(2)} $`,
      } : {}),
    },
    brand: '',
    category: categories,
    availability: {
      in_stock: item.stock_status === 'IN_STOCK',
      total_stock: 0,
      quantity_by_store: {},
    },
    shipping: { colis_available: false, pickup_in_store: true },
    locale: 'fr_CA',
  };
}

function htmlProductToAcp(item) {
  return {
    id: `MAT-${item.sku}`,
    pid: item.sku,
    title: item.title,
    description: '',
    url: item.url,
    image_url: item.image_url || null,
    price: {
      amount: Math.round(item.price * 100),
      currency: 'CAD',
      display: `${item.price.toFixed(2)} $`,
    },
    brand: '',
    category: item.category || '',
    availability: { in_stock: true, total_stock: 0, quantity_by_store: {} },
    shipping: { colis_available: false, pickup_in_store: true },
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

  log('Starting Matério catalog scrape...');
  let allProducts = [];
  let source = 'unknown';

  // ── Tier 1: Try Magento 2 REST API ──────────────────────
  try {
    log('Trying Magento 2 REST API...');
    const firstPage = await fetchRestApi(1, 1);
    const total = firstPage.total_count || 0;
    log(`REST API available — ${total} products found`);
    source = 'Magento 2 REST API';

    const totalPages = Math.ceil(total / ROWS_PER_PAGE);
    for (let page = 1; page <= totalPages; page++) {
      try {
        const data = await fetchRestApi(page, ROWS_PER_PAGE);
        const items = data.items || [];
        for (const item of items) {
          try { allProducts.push(restProductToAcp(item)); } catch { /* skip */ }
        }
        log(`REST page ${page}/${totalPages} — ${items.length} items (total: ${allProducts.length})`);
      } catch (err) {
        log(`REST page ${page} error: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (restErr) {
    log(`REST API not available: ${restErr.message}`);

    // ── Tier 2: Try Magento 2 GraphQL ───────────────────
    try {
      log('Trying Magento 2 GraphQL...');
      const first = await fetchGraphQL(1, 1);
      const total = first.total_count || 0;
      log(`GraphQL available — ${total} products found`);
      source = 'Magento 2 GraphQL';

      const totalPages = Math.ceil(total / ROWS_PER_PAGE);
      for (let page = 1; page <= totalPages; page++) {
        try {
          const data = await fetchGraphQL(page, ROWS_PER_PAGE);
          const items = data.items || [];
          for (const item of items) {
            try { allProducts.push(graphqlProductToAcp(item)); } catch { /* skip */ }
          }
          log(`GraphQL page ${page}/${totalPages} — ${items.length} items (total: ${allProducts.length})`);
        } catch (err) {
          log(`GraphQL page ${page} error: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (gqlErr) {
      log(`GraphQL not available: ${gqlErr.message}`);

      // ── Tier 3: HTML scraping ─────────────────────────
      log('Falling back to HTML scraping...');
      source = 'HTML scraping';

      for (const catPath of CATEGORIES_TO_SCRAPE) {
        log(`Scraping category: ${catPath}`);
        const items = await scrapeHtmlCategory(catPath, log);
        for (const item of items) {
          try { allProducts.push(htmlProductToAcp(item)); } catch { /* skip */ }
        }
      }
    }
  }

  // Deduplicate by SKU
  const seen = new Set();
  allProducts = allProducts.filter(p => {
    if (seen.has(p.pid)) return false;
    seen.add(p.pid);
    return true;
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`Scrape complete: ${allProducts.length} products via ${source} in ${elapsed}s`);

  // Load store data
  const storesData = JSON.parse(readFileSync(join(DATA_DIR, 'stores.json'), 'utf-8'));

  // Build ACP catalog
  const catalog = {
    merchant: {
      name: 'Matério',
      domain: 'materio.ca',
      locale: 'fr_CA',
      currency: 'CAD',
    },
    metadata: {
      scraped_at: new Date().toISOString(),
      total_products: allProducts.length,
      source,
      scrape_duration_seconds: parseFloat(elapsed),
    },
    stores: storesData.stores.map(s => ({
      id: s.id,
      name: s.name,
      address: s.address,
      phone: s.phone,
      latitude: s.coordinates?.lat,
      longitude: s.coordinates?.lon,
    })),
    products: allProducts,
  };

  const outputPath = join(DATA_DIR, 'catalog-materio.json');
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
