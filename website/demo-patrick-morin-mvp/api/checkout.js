import Stripe from "stripe";

// ═══════════════════════════════════════════════════════
// Patrick Morin — Checkout API (Stripe Checkout Session)
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });
    return;
  }

  const stripe = new Stripe(secretKey);
  const { items, isPro } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items array required" });
    return;
  }

  try {
    // Calculate totals
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const title = String(item.title || "Produit").slice(0, 200);
      const price = Number(item.price);
      const quantity = Math.min(Math.max(Math.round(Number(item.quantity)), 1), 999);
      const sku = String(item.sku || "").slice(0, 50);

      if (!price || price <= 0 || price > 100000) continue;

      let unitPrice = price;
      if (isPro) unitPrice = Math.round(unitPrice * 90) / 100; // 10% discount

      subtotal += unitPrice * quantity;

      lineItems.push({
        price_data: {
          currency: "cad",
          product_data: {
            name: title,
            ...(sku ? { description: `SKU: ${sku}` } : {}),
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      });
    }

    if (lineItems.length === 0) {
      res.status(400).json({ error: "No valid items" });
      return;
    }

    // Add TPS (5%) and TVQ (9.975%) as line items
    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;

    lineItems.push({
      price_data: {
        currency: "cad",
        product_data: { name: "TPS (5%)" },
        unit_amount: Math.round(tps * 100),
      },
      quantity: 1,
    });

    lineItems.push({
      price_data: {
        currency: "cad",
        product_data: { name: "TVQ (9,975%)" },
        unit_amount: Math.round(tvq * 100),
      },
      quantity: 1,
    });

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`,
      locale: "fr-CA",
      metadata: {
        source: "patrick-morin-chatgpt-commerce-mvp",
        is_pro: isPro ? "true" : "false",
        items_count: String(items.length),
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: error.message || "Erreur lors de la création du paiement" });
  }
}
