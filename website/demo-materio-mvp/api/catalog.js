import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'catalog-materio.json');
const SERVICES_PATH = join(__dirname, '..', 'data', 'services.json');
const STORES_PATH = join(__dirname, '..', 'data', 'stores.json');

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  if (!existsSync(CATALOG_PATH)) {
    res.status(503).json({ error: 'Catalog not loaded' });
    return;
  }

  const catalogData = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
  const servicesData = existsSync(SERVICES_PATH) ? JSON.parse(readFileSync(SERVICES_PATH, 'utf-8')) : {};
  const storesData = existsSync(STORES_PATH) ? JSON.parse(readFileSync(STORES_PATH, 'utf-8')) : {};

  const products = {};
  for (const p of catalogData.products) {
    products[p.pid] = {
      id: p.id,
      pid: p.pid,
      sku: p.pid,
      title: p.title,
      description: (p.description || '').slice(0, 300),
      price: p.price.amount / 100,
      originalPrice: p.price.original_amount ? p.price.original_amount / 100 : null,
      currency: 'CAD',
      imageUrl: p.image_url,
      productUrl: p.url,
      category: p.category,
      brand: p.brand,
      availability: p.availability.quantity_by_store,
      inStock: p.availability.in_stock,
      shipping: p.shipping,
      pickupInStore: true,
      services: p.services || {},
    };
  }

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    products,
    stores: storesData?.stores || [],
    services: servicesData,
    metadata: catalogData.metadata
  });
}
