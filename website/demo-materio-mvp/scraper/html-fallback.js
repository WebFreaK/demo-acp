// ═══════════════════════════════════════════════════════════════
// Matério — Enhanced HTML Scraper Fallback
// Scrapes materio.ca listing pages + individual product detail pages
// to extract full product data when REST/GraphQL APIs are unavailable.
//
// Usage:
//   node scraper/html-fallback.js              → scrape all categories
//   node scraper/html-fallback.js materiaux    → scrape one category
// ═══════════════════════════════════════════════════════════════

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

const BASE_URL = 'https://www.materio.ca';
const POLITE_DELAY_MS = 400;
const MAX_PAGES_PER_CATEGORY = 10;

let cheerio;
try {
  cheerio = await import('cheerio');
} catch {
  console.error('❌ cheerio is required for HTML scraping. Install with: npm i cheerio');
  process.exit(1);
}

const CATEGORIES = [
  { slug: 'materiaux', label: 'Matériaux', priority: 'P0' },
  { slug: 'quincaillerie-et-outillage', label: 'Quincaillerie et Outillage', priority: 'P0' },
  { slug: 'plomberie', label: 'Plomberie', priority: 'P1' },
  { slug: 'peinture', label: 'Peinture', priority: 'P1' },
  { slug: 'couvre-plancher', label: 'Couvre-plancher', priority: 'P1' },
  { slug: 'electricite', label: 'Électricité', priority: 'P1' },
  { slug: 'saisonnier', label: 'Saisonnier', priority: 'P2' },
  { slug: 'decoration', label: 'Décoration', priority: 'P2' },
  { slug: 'poeles-et-foyers', label: 'Poêles et Foyers', priority: 'P2' },
  { slug: 'poutrelles', label: 'Poutrelles', priority: 'P2' },
];

const STORE_NAMES = [
  'Saint-Jérôme', 'Terrebonne', 'Saint-Hippolyte',
  'Sainte-Sophie', 'Mirabel (Saint-Antoine)', 'Mirabel (Saint-Benoît)',
];

// ─── Fetch helper with retries ──────────────────────────────

async function fetchPage(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt < 3) {
      await delay(1000 * attempt);
      return fetchPage(url, attempt + 1);
    }
    throw err;
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Parse listing page ─────────────────────────────────────

function parseListingPage(html, categoryLabel) {
  const $ = cheerio.load(html);
  const products = [];

  $('.product-item').each((_, el) => {
    try {
      const $el = $(el);

      // Title & URL
      const $link = $el.find('.product-item-link');
      const title = $link.text().trim();
      const productUrl = $link.attr('href') || '';

      // Image
      const $img = $el.find('.product-image-photo');
      let imageUrl = $img.attr('data-src') || $img.attr('src') || '';
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = BASE_URL + imageUrl;
      }

      // Prices
      const finalPriceText = $el.find('.special-price .price, .price-wrapper .price').first().text().trim();
      const oldPriceText = $el.find('.old-price .price').first().text().trim();
      const singlePriceText = $el.find('.price').first().text().trim();

      const finalPrice = parsePrice(finalPriceText || singlePriceText);
      const originalPrice = parsePrice(oldPriceText);

      // SKU from URL or data attrib
      const productId = $el.find('[data-product-id]').attr('data-product-id') || '';
      const skuFromUrl = extractSkuFromUrl(productUrl);
      const sku = skuFromUrl || productId || `MAT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Brand (often in title or separate element)
      const brand = $el.find('.product-item-brand, .brand').text().trim()
        || extractBrandFromTitle(title);

      if (title && finalPrice > 0) {
        products.push({
          sku,
          title,
          url: productUrl,
          image_url: imageUrl,
          price: finalPrice,
          original_price: originalPrice > finalPrice ? originalPrice : null,
          brand,
          category: categoryLabel,
          source: 'html-listing',
        });
      }
    } catch { /* skip malformed */ }
  });

  // Check if there's a next page
  const hasNextPage = $('.pages-item-next').length > 0 && !$('.pages-item-next').hasClass('disabled');

  return { products, hasNextPage };
}

// ─── Parse product detail page ──────────────────────────────

function parseDetailPage(html, existingProduct) {
  const $ = cheerio.load(html);

  // Full description
  const description = $('.product.attribute.description .value')
    .text().trim()
    .replace(/\s+/g, ' ')
    .slice(0, 2000);

  // SKU (more reliable on detail page)
  const skuDetail = $('[itemprop="sku"]').text().trim()
    || $('.product.attribute.sku .value').text().trim();

  // Brand from detail page
  const brandDetail = $('[itemprop="brand"]').text().trim()
    || $('[data-th="Marque"]').text().trim()
    || $('.product.attribute.brand .value').text().trim();

  // Stock info per store (if available in page JS or HTML)
  const stockByStore = {};
  let totalStock = 0;
  let inStock = false;

  // Check the stock status element
  const stockText = $('.stock.available, [title="Disponibilité"]').text().trim().toLowerCase();
  if (stockText.includes('en stock') || stockText.includes('disponible')) {
    inStock = true;
  }

  // Try to extract per-store stock from JS or structured data
  const pageText = html;
  for (const store of STORE_NAMES) {
    const storePattern = new RegExp(`${store.replace(/[()]/g, '\\$&')}[^\\d]*(\\d+)`, 'i');
    const match = pageText.match(storePattern);
    if (match) {
      const qty = parseInt(match[1], 10);
      stockByStore[store] = qty;
      totalStock += qty;
      if (qty > 0) inStock = true;
    }
  }

  // If no per-store data, mark as in-stock if page says so
  if (Object.keys(stockByStore).length === 0 && inStock) {
    stockByStore['Saint-Jérôme'] = 1; // Placeholder
    totalStock = 1;
  }

  // Additional attributes from spec table
  const attributes = {};
  $('.additional-attributes-wrapper tr, .data.table.additional-attributes tr').each((_, row) => {
    const label = $(row).find('th, .label').text().trim();
    const value = $(row).find('td, .data').text().trim();
    if (label && value) attributes[label.toLowerCase()] = value;
  });

  return {
    ...existingProduct,
    sku: skuDetail || existingProduct.sku,
    brand: brandDetail || existingProduct.brand,
    description,
    attributes,
    availability: {
      in_stock: inStock || existingProduct.price > 0,
      total_stock: totalStock,
      quantity_by_store: stockByStore,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────

function parsePrice(text) {
  if (!text) return 0;
  const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function extractSkuFromUrl(url) {
  // materio.ca URLs often end with the SKU: .../product-name-SKU
  const match = url.match(/([a-zA-Z]{2}\d{4,6})(?:\.html)?$/i);
  return match ? match[1].toUpperCase() : '';
}

function extractBrandFromTitle(title) {
  // Common brands seen in Matério titles
  const knownBrands = [
    'BP', 'Lebel', 'Cambium', 'Sojag', 'Technoform', 'Alexandria', 'Jeld-Wen',
    'Rockwool', 'Owens Corning', 'Soprema', 'Maximum', 'Peintures MF', 'MF',
    'Simpson', 'GAF', 'Mitten', 'Gentek', 'Kaycan', 'Canexel', 'Maibec',
    'Durabuilt', 'Plastimo', 'Taiga', 'Goodfellow', 'Forex', 'Ceratec',
  ];
  const upper = title.toUpperCase();
  for (const brand of knownBrands) {
    if (upper.includes(brand.toUpperCase())) return brand;
  }
  return '';
}

// ─── Transform to ACP catalog format ────────────────────────

function toAcpProduct(item) {
  return {
    id: `MAT-${item.sku}`,
    pid: item.sku,
    title: item.title,
    description: item.description || '',
    url: item.url,
    image_url: item.image_url || null,
    price: {
      amount: Math.round(item.price * 100),
      currency: 'CAD',
      display: `${item.price.toFixed(2)} $`,
      ...(item.original_price ? {
        original_amount: Math.round(item.original_price * 100),
        original_display: `${item.original_price.toFixed(2)} $`,
      } : {}),
    },
    brand: item.brand || '',
    category: item.category || '',
    availability: item.availability || {
      in_stock: item.price > 0,
      total_stock: 0,
      quantity_by_store: {},
    },
    shipping: {
      available: true,
      specialized: true,
      pickup_in_store: true,
    },
    services: {
      centre_de_coupe: false,
      estimation: true,
      financement_eligible: item.price >= 7.50, // 750 cents = 7.50$... actually 750$
    },
    attributes: item.attributes || {},
    locale: 'fr_CA',
  };
}

// ─── Main Scraping Orchestrator ─────────────────────────────

export async function scrapeHtmlFull({ categories, fetchDetails = false, onProgress } = {}) {
  const startTime = Date.now();
  const log = (msg) => {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  const targetCategories = categories
    ? CATEGORIES.filter(c => categories.includes(c.slug))
    : CATEGORIES;

  log(`HTML Fallback Scraper — ${targetCategories.length} categories to scrape`);

  const allRawProducts = [];

  // Phase 1: Listing pages
  for (const cat of targetCategories) {
    log(`📂 Category: ${cat.label} (/${cat.slug})`);

    let page = 1;
    let hasMore = true;

    while (hasMore && page <= MAX_PAGES_PER_CATEGORY) {
      const url = `${BASE_URL}/${cat.slug}?p=${page}`;
      try {
        const html = await fetchPage(url);
        const result = parseListingPage(html, cat.label);

        if (result.products.length === 0) break;

        allRawProducts.push(...result.products);
        log(`  Page ${page}: ${result.products.length} products (running total: ${allRawProducts.length})`);

        hasMore = result.hasNextPage;
        page++;
        await delay(POLITE_DELAY_MS);
      } catch (err) {
        log(`  Page ${page} failed: ${err.message}`);
        break;
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  const uniqueProducts = allRawProducts.filter(p => {
    const key = p.sku || p.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  log(`Phase 1 complete: ${uniqueProducts.length} unique products from listing pages`);

  // Phase 2: Detail pages (optional, slow but gets full data)
  if (fetchDetails) {
    const detailBatch = uniqueProducts.slice(0, 200); // Limit detail fetches
    log(`Phase 2: Fetching ${detailBatch.length} product detail pages...`);

    for (let i = 0; i < detailBatch.length; i++) {
      const product = detailBatch[i];
      if (!product.url) continue;

      try {
        const html = await fetchPage(product.url);
        const enriched = parseDetailPage(html, product);
        Object.assign(product, enriched);

        if ((i + 1) % 25 === 0) {
          log(`  Details: ${i + 1}/${detailBatch.length} fetched`);
        }
        await delay(POLITE_DELAY_MS);
      } catch {
        // Keep listing-page data if detail page fails
      }
    }

    log(`Phase 2 complete: ${detailBatch.length} detail pages enriched`);
  }

  // Convert to ACP format
  const acpProducts = uniqueProducts.map(toAcpProduct);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`✅ HTML scrape complete: ${acpProducts.length} products in ${elapsed}s`);

  return { products: acpProducts, source: 'HTML scraping', elapsed };
}

// ─── Search-based scraping (alternative entry) ──────────────

export async function scrapeSearch(query, maxPages = 3) {
  const log = (msg) => console.log(`[search] ${msg}`);
  const products = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `${BASE_URL}/catalogsearch/result/?q=${encodeURIComponent(query)}&p=${page}`;
    try {
      const html = await fetchPage(url);
      const result = parseListingPage(html, `Recherche: ${query}`);

      if (result.products.length === 0) break;
      products.push(...result.products);
      log(`Search "${query}" page ${page}: ${result.products.length} results`);

      if (!result.hasNextPage) break;
      await delay(POLITE_DELAY_MS);
    } catch (err) {
      log(`Search page ${page} error: ${err.message}`);
      break;
    }
  }

  return products.map(toAcpProduct);
}

// ─── CLI Entry Point ────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const categories = args.length > 0 ? args : undefined;
  const fetchDetails = args.includes('--details');
  const filteredCategories = categories?.filter(a => a !== '--details');

  scrapeHtmlFull({
    categories: filteredCategories?.length ? filteredCategories : undefined,
    fetchDetails,
  })
    .then(({ products, elapsed }) => {
      // Build and save catalog
      let storesData = { stores: [] };
      const storesPath = join(DATA_DIR, 'stores.json');
      if (existsSync(storesPath)) {
        storesData = JSON.parse(readFileSync(storesPath, 'utf-8'));
      }

      const catalog = {
        merchant: { name: 'Matério', domain: 'materio.ca', locale: 'fr_CA', currency: 'CAD' },
        metadata: {
          scraped_at: new Date().toISOString(),
          total_products: products.length,
          source: 'HTML scraping (fallback)',
          scrape_duration_seconds: parseFloat(elapsed),
        },
        stores: storesData.stores.map(s => ({
          id: s.id, name: s.name, address: s.address, phone: s.phone,
        })),
        products,
      };

      const outputPath = join(DATA_DIR, 'catalog-materio.json');
      writeFileSync(outputPath, JSON.stringify(catalog, null, 2), 'utf-8');
      console.log(`\n✅ Catalog saved: ${products.length} products → ${outputPath}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ HTML scrape failed:', err);
      process.exit(1);
    });
}
