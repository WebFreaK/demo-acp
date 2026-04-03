import OpenAI from "openai";
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════
// Patrick Morin — Chat API (OpenAI GPT-4o + Function Calling)
// Dynamic catalog loaded from scraped data
// ═══════════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'data', 'catalog-acp.json');

let SYSTEM_PROMPT = '';
let VALID_IDS = new Set();

function loadCatalog() {
  try {
    if (!existsSync(CATALOG_PATH)) {
      console.warn('⚠️  api/chat.js: No catalog-acp.json found');
      return;
    }
    const catalogData = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
    VALID_IDS = new Set(catalogData.products.map(p => p.pid));

    // Top products balanced across subcategories (top 5 per level-2 subcategory)
    const inStock = catalogData.products
      .filter(p => p.availability.in_stock && p.price.amount > 0);

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

    console.log(`📦 api/chat.js: Catalog loaded — ${catalogData.products.length} products, ${VALID_IDS.size} IDs`);
  } catch (err) {
    console.error('❌ api/chat.js: Failed to load catalog:', err.message);
  }
}

// Load on module init
loadCatalog();

const TOOLS = [
  {
    type: "function",
    function: {
      name: "show_products",
      description:
        "Display product cards to the customer. Call this EVERY TIME you recommend specific products from the Patrick Morin catalog.",
      parameters: {
        type: "object",
        properties: {
          products: {
            type: "array",
            description: "Products to display with quantities",
            items: {
              type: "object",
              properties: {
                product_id: {
                  type: "string",
                  description:
                    "Exact product pid from the catalog",
                },
                quantity: {
                  type: "integer",
                  description: "Recommended quantity",
                  minimum: 1,
                },
              },
              required: ["product_id", "quantity"],
            },
          },
        },
        required: ["products"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_checkout",
      description:
        "Show the checkout/order panel. ONLY call this when the customer explicitly says they want to buy, order, or reserve products.",
      parameters: {
        type: "object",
        properties: {
          is_pro: {
            type: "boolean",
            description: "Whether the customer is a PM PRO member (10% discount)",
          },
          store: {
            type: "string",
            description: "Preferred store name for pickup",
          },
          delivery_method: {
            type: "string",
            enum: ["pickup", "delivery"],
            description: "Pickup in store or delivery to job site",
          },
        },
        required: ["is_pro"],
      },
    },
  },
];

function executeTool(toolCall) {
  const name = toolCall.function.name;
  let args;
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch {
    return { error: "Invalid arguments" };
  }

  switch (name) {
    case "show_products": {
      const valid = (args.products || []).filter((p) =>
        VALID_IDS.has(p.product_id)
      );
      return {
        success: true,
        products_displayed: valid.length,
        message: `${valid.length} produit(s) affichés au client.`,
      };
    }
    case "show_checkout":
      return { success: true, checkout_ready: true };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Vercel Serverless Handler ───────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  // Limit conversation length to prevent abuse
  const trimmedMessages = messages.slice(-20);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY not configured" });
    return;
  }

  const openai = new OpenAI({ apiKey });

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...trimmedMessages,
    ];

    // ── Pass 1: Streaming call with tools ──
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: fullMessages,
      tools: TOOLS,
      tool_choice: "auto",
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    let contentBuffer = "";
    const toolCallsMap = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      // Stream text content to client immediately
      if (delta.content) {
        send("delta", { content: delta.content });
        contentBuffer += delta.content;
      }

      // Accumulate tool calls
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallsMap[idx]) {
            toolCallsMap[idx] = { id: "", type: "function", function: { name: "", arguments: "" } };
          }
          if (tc.id) toolCallsMap[idx].id = tc.id;
          if (tc.function?.name) toolCallsMap[idx].function.name = tc.function.name;
          if (tc.function?.arguments)
            toolCallsMap[idx].function.arguments += tc.function.arguments;
        }
      }
    }

    // ── Handle tool calls if any ──
    const toolCalls = Object.values(toolCallsMap);

    if (toolCalls.length > 0) {
      // Build assistant message for history
      const assistantMsg = { role: "assistant", tool_calls: toolCalls };
      if (contentBuffer) assistantMsg.content = contentBuffer;
      fullMessages.push(assistantMsg);

      // Execute each tool and send events to client
      for (const tc of toolCalls) {
        let args;
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }

        if (tc.function.name === "show_products" && args.products) {
          const validProducts = args.products.filter((p) =>
            VALID_IDS.has(p.product_id)
          );
          send("products", { products: validProducts });
        }

        if (tc.function.name === "show_checkout") {
          send("checkout", {
            is_pro: args.is_pro || false,
            store: args.store || "Laval",
            delivery_method: args.delivery_method || "pickup",
          });
        }

        const result = executeTool(tc);
        fullMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      // ── Pass 2: Stream follow-up response ──
      const followUp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      });

      for await (const chunk of followUp) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          send("delta", { content });
        }
      }
    }

    send("done", {});
  } catch (error) {
    console.error("Chat API error:", error);
    send("error", {
      message: error.message || "Erreur interne du serveur",
    });
  }

  res.end();
}
