import * as cheerio from 'cheerio';

const WAREHOUSE_TO_STORE = {
  entrepot_10: 'Saint-Jérôme',
  entrepot_20: 'Terrebonne',
  entrepot_40: 'Sainte-Sophie',
  entrepot_50: 'Saint-Hippolyte',
  entrepot_80: 'Mirabel (Saint-Benoît)',
};

async function test(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'MaterioACP-Scraper/1.0' } });
  const html = await res.text();
  const $ = cheerio.load(html);

  const availability = {};
  $('.availability-table__warehouse.css-row').each((_, row) => {
    const $row = $(row);
    const warehouseId = $row.find('availability-warehouse').attr('data-warehouse-id');
    const storeName = WAREHOUSE_TO_STORE[warehouseId];
    if (!storeName) return;
    const cols = $row.find('.css-col.middle');
    const inStoreCol = cols.eq(0).html() || '';
    const inStore = inStoreCol.includes('#57B816');
    availability[storeName] = inStore;
  });

  console.log('URL:', url);
  console.log('Availability:', JSON.stringify(availability, null, 2));
}

// Test with multiple products
await test('https://www.materio.ca/melange-a-beton-prise-rapide-30-minutes-30-kg-bomix-ci03040');
await test('https://www.materio.ca/sikalatex-r-adjuvant-et-agent-de-liaison-1-litre-ci19160');
await test('https://www.materio.ca/peinture-aerosol-haute-temperature-noire-340-g-rust-oleum-pe90015');
await test('https://www.materio.ca/chaise-plastique-pour-barre-armature-50-pqt-4-po-x-2-5-po-metaltech-ci03000');
