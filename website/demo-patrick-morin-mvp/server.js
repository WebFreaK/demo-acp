// server.js — Local dev server (no Vercel CLI needed)
// Usage: node server.js

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import Stripe from 'stripe';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 3000;

// Load .env file
const envPath = join(__dirname, '.env');
try {
  const envContent = await readFile(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {
  console.warn('⚠️  No .env file found. Create one from .env.example');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

// ─── Static file server ────────────────────────────────

async function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  let filePath = join(__dirname, 'public', urlPath === '/' ? 'index.html' : urlPath);

  // Prevent path traversal
  if (!filePath.startsWith(join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');

    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// ─── Read JSON body helper ─────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ─── CATALOG LOADER ────────────────────────────────────

const CATALOG_PATH = join(__dirname, 'data', 'catalog-acp.json');
let catalogData = null;
let catalogProductMap = {};
let VALID_IDS = new Set();
let SYSTEM_PROMPT = '';

function loadCatalog() {
  try {
    if (!existsSync(CATALOG_PATH)) {
      console.warn('⚠️  No catalog-acp.json found. Run: node scraper/index.js');
      return;
    }
    const raw = readFileSync(CATALOG_PATH, 'utf-8');
    catalogData = JSON.parse(raw);

    // Build product map by pid
    catalogProductMap = {};
    for (const p of catalogData.products) {
      catalogProductMap[p.pid] = p;
    }
    VALID_IDS = new Set(Object.keys(catalogProductMap));

    // Build compact catalog for system prompt — balanced across subcategories
    const inStock = catalogData.products
      .filter(p => p.availability.in_stock && p.price.amount > 0);

    // Group by level-2 subcategory, take top 5 per subcategory for diverse coverage
    const bySubcat = {};
    for (const p of inStock) {
      const parts = (p.category || '').split(' > ');
      const subcat = parts.slice(0, 2).join(' > ') || 'Autre';
      if (!bySubcat[subcat]) bySubcat[subcat] = [];
      bySubcat[subcat].push(p);
    }

    const byCategory = {};
    let totalSelected = 0;
    for (const [subcat, items] of Object.entries(bySubcat).sort()) {
      items.sort((a, b) => b.availability.total_stock - a.availability.total_stock);
      const topLevel = subcat.split(' > ')[0];
      if (!byCategory[topLevel]) byCategory[topLevel] = [];
      for (const p of items.slice(0, 3)) {
        const price = (p.price.amount / 100).toFixed(2);
        const origPrice = p.price.original_amount ? ` (rég. ${(p.price.original_amount / 100).toFixed(2)}$)` : '';
        const lavalStock = p.availability.quantity_by_store['Laval'] || 0;
        byCategory[topLevel].push(`- ${p.pid}: ${p.title} | ${price}$${origPrice} | Laval:${lavalStock} | ${p.brand}`);
        totalSelected++;
      }
    }

    let catalogText = '';
    for (const [cat, lines] of Object.entries(byCategory).sort()) {
      catalogText += `\n${cat.toUpperCase()}:\n${lines.join('\n')}\n`;
    }

    // Store info
    const storeLines = (catalogData.stores || [])
      .filter(s => ['Laval','Repentigny','Saint-Eustache','Brossard','Pointe-aux-Trembles','Pincourt'].includes(s.name))
      .map(s => `- ${s.name}: ${s.address}, ${s.phone}`)
      .join('\n');

    SYSTEM_PROMPT = `Tu es l'assistant commercial IA de Patrick Morin, une chaîne de quincailleries au Québec fondée en 1960 avec 23 magasins. Tu aides les clients à trouver les bons produits pour leurs projets de rénovation et construction.

RÈGLES:
1. Toujours répondre en français québécois, ton chaleureux et professionnel
2. Recommander UNIQUEMENT les produits du catalogue ci-dessous (utiliser les product_id exacts = le pid)
3. Calculer les quantités nécessaires quand le client décrit un projet
4. Mentionner les prix et la disponibilité en magasin
5. Pour les entrepreneurs PM PRO, appliquer l'escompte de 10%
6. Taxes du Québec: TPS 5% + TVQ 9,975%
7. TOUJOURS appeler show_products quand tu recommandes des produits spécifiques
8. Appeler show_checkout SEULEMENT quand le client dit explicitement vouloir commander/acheter
9. Le catalogue contient ${catalogData.products.length} produits. Tu as les ${totalSelected} plus populaires ci-dessous, répartis par catégorie.

CATALOGUE PATRICK MORIN (${totalSelected} produits populaires sur ${catalogData.products.length} total):
${catalogText}
MAGASINS PRINCIPAUX:
${storeLines}
Heures: lun-ven 8h-21h, sam 8h-17h, dim 9h-17h

Dernière mise à jour du catalogue: ${catalogData.metadata?.scraped_at || 'inconnue'}`;

    console.log(`📦 Catalog loaded: ${catalogData.products.length} products, ${Object.keys(byCategory).length} categories`);
  } catch (err) {
    console.error('❌ Failed to load catalog:', err.message);
  }
}

// Load on startup
loadCatalog();

// Reload catalog every 5 minutes (picks up scraper updates)
setInterval(loadCatalog, 5 * 60 * 1000);

const TOOLS = [
  {
    type: "function",
    function: {
      name: "show_products",
      description: "Display product cards to the customer. Call this EVERY TIME you recommend specific products.",
      parameters: {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string", description: "Exact product ID from catalog" },
                quantity: { type: "integer", minimum: 1 }
              },
              required: ["product_id", "quantity"]
            }
          }
        },
        required: ["products"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "show_checkout",
      description: "Show checkout panel. ONLY when customer explicitly wants to buy/order/reserve.",
      parameters: {
        type: "object",
        properties: {
          is_pro: { type: "boolean" },
          store: { type: "string" },
          delivery_method: { type: "string", enum: ["pickup", "delivery"] }
        },
        required: ["is_pro"]
      }
    }
  }
];

function executeTool(tc) {
  const name = tc.function.name;
  let args;
  try { args = JSON.parse(tc.function.arguments); } catch { return { error: "Invalid args" }; }
  if (name === "show_products") {
    const valid = (args.products || []).filter(p => VALID_IDS.has(p.product_id));
    return { success: true, products_displayed: valid.length };
  }
  if (name === "show_checkout") return { success: true, checkout_ready: true };
  return { error: `Unknown tool: ${name}` };
}

// ─── Chat handler ──────────────────────────────────────

async function handleChat(req, res) {
  const body = await readBody(req);
  const { messages } = body;

  if (!messages || !Array.isArray(messages)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'messages array required' }));
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'OPENAI_API_KEY not configured. Create a .env file.' }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-20)];

  try {
    // Pass 1: Stream with tools
    const stream = await openai.chat.completions.create({
      model: "gpt-4o", messages: fullMessages, tools: TOOLS,
      tool_choice: "auto", stream: true, temperature: 0.7, max_tokens: 2048,
    });

    let contentBuffer = '';
    const toolCallsMap = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        send('delta', { content: delta.content });
        contentBuffer += delta.content;
      }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallsMap[idx]) toolCallsMap[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
          if (tc.id) toolCallsMap[idx].id = tc.id;
          if (tc.function?.name) toolCallsMap[idx].function.name = tc.function.name;
          if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
        }
      }
    }

    const toolCalls = Object.values(toolCallsMap);
    if (toolCalls.length > 0) {
      const assistantMsg = { role: "assistant", tool_calls: toolCalls };
      if (contentBuffer) assistantMsg.content = contentBuffer;
      fullMessages.push(assistantMsg);

      for (const tc of toolCalls) {
        let args;
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
        if (tc.function.name === 'show_products' && args.products) {
          send('products', { products: args.products.filter(p => VALID_IDS.has(p.product_id)) });
        }
        if (tc.function.name === 'show_checkout') {
          send('checkout', { is_pro: args.is_pro || false, store: args.store || 'Laval', delivery_method: args.delivery_method || 'pickup' });
        }
        fullMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(executeTool(tc)) });
      }

      // Pass 2: Follow-up stream
      const followUp = await openai.chat.completions.create({
        model: "gpt-4o", messages: fullMessages, stream: true, temperature: 0.7, max_tokens: 2048,
      });
      for await (const chunk of followUp) {
        const c = chunk.choices[0]?.delta?.content;
        if (c) send('delta', { content: c });
      }
    }

    send('done', {});
  } catch (err) {
    console.error('Chat error:', err);
    send('error', { message: err.message || 'Internal server error' });
  }

  res.end();
}

// ─── Checkout handler ──────────────────────────────────

async function handleCheckout(req, res) {
  const body = await readBody(req);
  const { items, isPro } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'items array required' }));
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured. Create a .env file.' }));
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const title = String(item.title || 'Produit').slice(0, 200);
      const price = Number(item.price);
      const quantity = Math.min(Math.max(Math.round(Number(item.quantity)), 1), 999);
      const sku = String(item.sku || '').slice(0, 50);
      if (!price || price <= 0 || price > 100000) continue;

      let unitPrice = price;
      if (isPro) unitPrice = Math.round(unitPrice * 90) / 100;
      subtotal += unitPrice * quantity;

      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: { name: title, ...(sku ? { description: `SKU: ${sku}` } : {}) },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      });
    }

    if (lineItems.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid items' }));
      return;
    }

    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;

    lineItems.push({ price_data: { currency: 'cad', product_data: { name: 'TPS (5%)' }, unit_amount: Math.round(tps * 100) }, quantity: 1 });
    lineItems.push({ price_data: { currency: 'cad', product_data: { name: 'TVQ (9,975%)' }, unit_amount: Math.round(tvq * 100) }, quantity: 1 });

    const origin = `http://localhost:${PORT}`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`,
      locale: 'fr-CA',
      metadata: { source: 'patrick-morin-chatgpt-commerce-mvp', is_pro: isPro ? 'true' : 'false' },
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: session.url }));
  } catch (err) {
    console.error('Checkout error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ─── HTTP Server ───────────────────────────────────────

const server = createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0];
    if (url === '/api/chat' && req.method === 'POST') {
      await handleChat(req, res);
    } else if (url === '/api/checkout' && req.method === 'POST') {
      await handleCheckout(req, res);
    } else if (url === '/api/catalog' && req.method === 'GET') {
      // Serve catalog data to frontend
      if (!catalogData) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Catalog not loaded. Run: node scraper/index.js' }));
      } else {
        // Send only what the frontend needs (product map keyed by pid)
        const products = {};
        for (const p of catalogData.products) {
          products[p.pid] = {
            id: p.id,
            pid: p.pid,
            sku: p.pid,
            title: p.title,
            description: p.description?.slice(0, 300) || '',
            price: p.price.amount / 100,
            originalPrice: p.price.original_amount ? p.price.original_amount / 100 : null,
            currency: 'CAD',
            imageUrl: p.image_url,
            productUrl: p.url,
            category: p.category,
            brand: p.brand,
            availability: p.availability.quantity_by_store,
            shipping: p.shipping.colis_available,
            pickupInStore: true,
            banner: p.banner,
          };
        }
        const payload = JSON.stringify({ products, stores: catalogData.stores, metadata: catalogData.metadata });
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        });
        res.end(payload);
      }
    } else {
      await serveStatic(req, res);
    }
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  Patrick Morin × ChatGPT Commerce — MVP             ║
║  🌐 http://localhost:${PORT}                           ║
║                                                      ║
║  OpenAI  : ${process.env.OPENAI_API_KEY ? '✅ Configuré' : '❌ Manquant (.env)'}                          ║
║  Stripe  : ${process.env.STRIPE_SECRET_KEY ? '✅ Configuré' : '❌ Manquant (.env)'}                          ║
║  Catalog : ${catalogData ? `✅ ${catalogData.products.length} produits` : '❌ Manquant (node scraper/index.js)'}             ║
╚══════════════════════════════════════════════════════╝
`);
});
