import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════
// Matério — GPT Actions API (REST JSON)
// Endpoints for ChatGPT Custom GPT integration
// ═══════════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'catalog-materio.json');
const SERVICES_PATH = join(__dirname, '..', 'data', 'services.json');
const STORES_PATH = join(__dirname, '..', 'data', 'stores.json');
const TEMPLATES_PATH = join(__dirname, '..', 'data', 'project-templates.json');

let catalogData = null;
let servicesData = null;
let storesData = null;
let projectTemplates = null;

function loadData() {
  try {
    if (existsSync(CATALOG_PATH)) {
      catalogData = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
    }
    if (existsSync(SERVICES_PATH)) {
      servicesData = JSON.parse(readFileSync(SERVICES_PATH, 'utf-8'));
    }
    if (existsSync(STORES_PATH)) {
      storesData = JSON.parse(readFileSync(STORES_PATH, 'utf-8'));
    }
    if (existsSync(TEMPLATES_PATH)) {
      projectTemplates = JSON.parse(readFileSync(TEMPLATES_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('❌ gpt.js: Failed to load data:', err.message);
  }
}

loadData();

// ─── Catalog search (same logic as chat.js) ───

function searchCatalog(query, category, limit = 10) {
  const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = q.split(/\s+/).filter(w => w.length > 1 || /\d/.test(w));
  if (!words.length || !catalogData) return [];

  const catFilter = (category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let pool = catalogData.products;
  if (catFilter) {
    pool = pool.filter(p => (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(catFilter));
  }

  const _txt = (p) => (p.title + ' ' + p.category + ' ' + (p.brand || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let results = pool.filter(p => _txt(p).includes(q)).slice(0, limit);
  if (results.length === 0) {
    results = pool.filter(p => words.every(w => _txt(p).includes(w))).slice(0, limit);
  }
  if (results.length === 0 && words.length > 1) {
    const scored = pool
      .map(p => ({ p, score: words.filter(w => _txt(p).includes(w)).length }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    results = scored.map(s => s.p);
  }

  return results.map(p => ({
    pid: p.pid,
    title: p.title,
    price: (p.price.amount / 100).toFixed(2),
    currency: 'CAD',
    category: p.category,
    brand: p.brand || '',
    in_stock: p.availability?.in_stock ?? true,
    url: p.url || `https://www.materio.ca/product/${p.pid}`
  }));
}

// ─── Project analyzer (same logic as chat.js) ───

function analyzeProject(projectType, dimensions) {
  if (!projectTemplates || !catalogData) {
    return { error: 'Data not loaded' };
  }

  const template = projectTemplates.projects[projectType];
  if (!template) {
    return {
      error: `Type de projet inconnu: ${projectType}`,
      available_types: Object.keys(projectTemplates.projects).map(k => ({
        key: k,
        name: projectTemplates.projects[k].name,
        icon: projectTemplates.projects[k].icon
      }))
    };
  }

  let surface = 0, length = 0, width = 0, linear = 0;
  const dimStr = (dimensions || '').toString();

  if (template.dimension_parser.type === 'lxw') {
    const lxwMatch = dimStr.match(/(\d+)\s*[x×X]\s*(\d+)/);
    if (lxwMatch) {
      length = parseInt(lxwMatch[1]);
      width = parseInt(lxwMatch[2]);
      surface = length * width;
    } else {
      surface = template.dimension_parser.fallback_surface || 100;
      length = Math.ceil(Math.sqrt(surface * 1.33));
      width = Math.ceil(surface / length);
    }
  } else if (template.dimension_parser.type === 'surface') {
    const surfMatch = dimStr.match(/(\d[\d\s,.]*)/);
    surface = surfMatch ? parseFloat(surfMatch[1].replace(/[\s,]/g, '')) : template.dimension_parser.fallback;
    length = Math.ceil(Math.sqrt(surface));
    width = length;
  } else if (template.dimension_parser.type === 'linear') {
    const linMatch = dimStr.match(/(\d+)/);
    linear = linMatch ? parseInt(linMatch[1]) : template.dimension_parser.fallback;
    surface = linear * 6;
    length = linear;
    width = 6;
  }

  const materials = [];
  const tools = [];
  let totalCents = 0;

  for (const cat of template.categories) {
    const results = searchCatalog(cat.search.query, cat.search.category, 3);
    if (results.length === 0) continue;

    const best = results[0];

    let quantity = 1;
    try {
      const formula = cat.quantity_formula;
      if (formula.type === 'fixed') {
        quantity = formula.quantity;
      } else if (formula.calculate) {
        const fn = new Function('surface', 'length', 'width', 'linear', `return ${formula.calculate};`);
        quantity = Math.max(1, Math.round(fn(surface, length, width, linear)));
      }
    } catch (e) {
      quantity = 1;
    }

    const priceCents = Math.round(parseFloat(best.price) * 100);
    const item = {
      pid: best.pid,
      title: best.title,
      price: best.price,
      currency: 'CAD',
      category_name: cat.name,
      quantity,
      quantity_formula: cat.quantity_formula.description,
      subtotal: (priceCents * quantity / 100).toFixed(2),
      url: best.url
    };

    if (cat.role === 'outil') {
      item.importance = cat.importance === 1 ? 'essentiel' : cat.importance === 2 ? 'tres_utile' : 'recommande';
      item.explanation = cat.explanation || '';
      tools.push(item);
    } else {
      item.role = cat.role;
      materials.push(item);
    }

    totalCents += priceCents * quantity;
  }

  const subtotal = (totalCents / 100).toFixed(2);
  const tps = (totalCents * 0.05 / 100).toFixed(2);
  const tvq = (totalCents * 0.09975 / 100).toFixed(2);
  const total = (totalCents * 1.14975 / 100).toFixed(2);

  // Financing
  let financing = null;
  if (servicesData?.financement && totalCents >= 75000) {
    for (const plan of servicesData.financement.plans) {
      if (totalCents / 100 >= plan.min && totalCents / 100 <= plan.max) {
        financing = { months: plan.months, monthly: (Math.ceil(totalCents / 100 / plan.months * 100) / 100).toFixed(2) };
        break;
      }
    }
    if (!financing && totalCents / 100 > 10000) {
      financing = { months: 36, monthly: (Math.ceil(totalCents / 100 / 36 * 100) / 100).toFixed(2) };
    }
  }

  return {
    project: {
      type: projectType,
      name: template.name,
      icon: template.icon,
      dimensions: { surface, length, width, linear },
      dimension_input: dimensions || 'estimées'
    },
    materials,
    tools,
    pricing: {
      subtotal,
      tps,
      tvq,
      total,
      currency: 'CAD'
    },
    financing,
    questions: template.questions,
    store: 'Matério — 6 magasins dans les Laurentides',
    note: 'Tous les produits sont disponibles en magasin. Commande en ligne ou ramassage en succursale.'
  };
}

// ─── Route handler ───

export default async function handler(req, res) {
  // CORS for ChatGPT
  res.setHeader('Access-Control-Allow-Origin', 'https://chat.openai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, openai-conversation-id, openai-ephemeral-user-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse action from URL: /api/gpt?action=search
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action') || req.body?.action;

  try {
    switch (action) {
      case 'search': {
        const { query, category, limit } = req.body || {};
        if (!query) {
          res.status(400).json({ error: 'Le paramètre "query" est requis.' });
          return;
        }
        const results = searchCatalog(query, category, Math.min(limit || 10, 20));
        res.json({
          results,
          total_found: results.length,
          catalog_size: catalogData?.products?.length || 0,
          tip: results.length === 0
            ? 'Essayez avec des mots-clés plus courts ou différents.'
            : 'Utilisez les pid pour référencer les produits.'
        });
        return;
      }

      case 'project': {
        const { project_type, dimensions } = req.body || {};
        if (!project_type) {
          res.status(400).json({
            error: 'Le paramètre "project_type" est requis.',
            available_types: projectTemplates
              ? Object.keys(projectTemplates.projects).map(k => ({
                  key: k,
                  name: projectTemplates.projects[k].name,
                  icon: projectTemplates.projects[k].icon
                }))
              : []
          });
          return;
        }
        const result = analyzeProject(project_type, dimensions);
        res.json(result);
        return;
      }

      case 'stores': {
        const stores = (storesData?.stores || []).map(s => ({
          name: s.name,
          address: s.address,
          phone: s.phone,
          services: s.services,
          hours: s.hours,
          highlight: s.highlight || null
        }));
        res.json({
          stores,
          total: stores.length,
          hours_default: storesData?.hours_default || 'lun-ven 7h30-21h, sam 8h-17h, dim 9h-17h'
        });
        return;
      }

      case 'services': {
        const { service_type } = req.body || {};
        if (service_type && servicesData?.[service_type]) {
          res.json({ service: servicesData[service_type] });
        } else {
          res.json({
            available_services: Object.keys(servicesData || {}).map(k => ({
              key: k,
              name: servicesData[k].name,
              icon: servicesData[k].icon
            }))
          });
        }
        return;
      }

      default: {
        res.json({
          name: 'Matério API — Agent Commerce Platform',
          version: '1.0',
          description: 'API pour l\'assistant IA de Matério, chaîne de centres de rénovation dans les Laurentides au Québec.',
          endpoints: {
            search: 'POST /api/gpt?action=search — Rechercher des produits dans le catalogue (6978 produits)',
            project: 'POST /api/gpt?action=project — Analyser un projet et obtenir la liste complète de matériaux',
            stores: 'POST /api/gpt?action=stores — Obtenir les informations sur les 6 magasins',
            services: 'POST /api/gpt?action=services — Obtenir les services disponibles'
          }
        });
        return;
      }
    }
  } catch (err) {
    console.error('GPT API error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
