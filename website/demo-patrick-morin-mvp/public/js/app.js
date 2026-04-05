// app.js — Patrick Morin × ChatGPT Commerce MVP — Real AI Chat + Stripe Checkout

let PM_PRODUCTS = {}; // Will be loaded from /api/catalog

const App = {
  // ═══════════ STATE ═══════════
  messages: [],       // Conversation history [{role, content}]
  cart: [],           // [{key, product, qty}]
  displayedPids: new Set(), // Track displayed product IDs to avoid duplicates
  isStreaming: false,
  startTime: null,
  checkoutData: null, // Last checkout event from AI
  catalogLoaded: false,

  // ═══════════ DOM REFS ═══════════
  els: {},

  // ═══════════ INIT ═══════════
  async init() {
    this.els = {
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      sendBtn: document.getElementById('send-btn'),
      productsGrid: document.getElementById('products-grid'),
      productsCount: document.getElementById('products-count'),
      productsTitleText: document.getElementById('products-title-text'),
      checkoutPanel: document.getElementById('checkout-panel'),
      checkoutItems: document.getElementById('checkout-items'),
      checkoutSubtotal: document.getElementById('checkout-subtotal'),
      checkoutTps: document.getElementById('checkout-tps'),
      checkoutTvq: document.getElementById('checkout-tvq'),
      checkoutTotal: document.getElementById('checkout-total'),
      checkoutConfirm: document.getElementById('checkout-confirm'),
      confirmationPanel: document.getElementById('confirmation-panel'),
      metricCart: document.getElementById('metric-cart'),
      metricItems: document.getElementById('metric-items'),
      metricTime: document.getElementById('metric-time'),
      metricMessages: document.getElementById('metric-messages'),
      suggestions: document.getElementById('suggestions'),
    };

    this._bindEvents();
    await this._loadCatalog();
    this.els.chatInput.focus();
  },

  async _loadCatalog() {
    try {
      const res = await fetch('/api/catalog');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      PM_PRODUCTS = data.products || {};
      this.catalogLoaded = true;
      console.log(`📦 Catalog loaded: ${Object.keys(PM_PRODUCTS).length} products`);
    } catch (err) {
      console.warn('⚠️ Failed to load catalog from API, using fallback:', err.message);
      // PM_PRODUCTS stays as whatever was loaded from products.js (fallback)
      this.catalogLoaded = typeof PM_PRODUCTS === 'object' && Object.keys(PM_PRODUCTS).length > 0;
    }
  },

  // ═══════════ EVENTS ═══════════
  _bindEvents() {
    // Enter to send
    this.els.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(this.els.chatInput.value);
      }
    });

    // Send button
    this.els.sendBtn.addEventListener('click', () => {
      this.sendMessage(this.els.chatInput.value);
    });

    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.sendMessage(chip.dataset.message);
      });
    });

    // Checkout → Stripe
    this.els.checkoutConfirm.addEventListener('click', () => {
      this._goToStripeCheckout();
    });
  },

  // ═══════════ SEND MESSAGE ═══════════
  async sendMessage(text) {
    text = (text || '').trim();
    if (!text || this.isStreaming) return;

    // Start timer on first message
    if (!this.startTime) this.startTime = Date.now();

    // Remove suggestions
    if (this.els.suggestions) {
      this.els.suggestions.remove();
      this.els.suggestions = null;
    }

    // Add to history
    this.messages.push({ role: 'user', content: text });

    // Render user message
    this._renderUserMessage(text);

    // Clear input
    this.els.chatInput.value = '';
    this.els.chatInput.disabled = true;
    this.els.sendBtn.disabled = true;

    // Show thinking
    const thinking = Animations.showThinking(this.els.chatMessages);
    this._scrollChat();

    this.isStreaming = true;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: this.messages }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let assistantText = '';
      let msgEl = null;
      let msgBody = null;
      let currentEvent = 'delta';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n');
        buffer = parts.pop() || '';

        for (const line of parts) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            let data;
            try { data = JSON.parse(line.slice(6)); } catch { continue; }

            switch (currentEvent) {
              case 'products':
                this._handleProducts(data);
                break;

              case 'tools':
                this._handleTools(data);
                break;

              case 'checkout':
                this._handleCheckout(data);
                break;

              case 'delta':
                if (!msgEl) {
                  thinking.remove();
                  msgEl = this._createMessageEl('assistant');
                  this.els.chatMessages.appendChild(msgEl);
                  msgBody = msgEl.querySelector('.msg-body');
                }
                assistantText += data.content;
                msgBody.innerHTML = Animations.renderMarkdown(assistantText);
                this._scrollChat();
                break;

              case 'error':
                thinking.remove();
                this._showError(data.message);
                break;
            }
          }
        }
      }

      // Cleanup: remove thinking if no text was produced
      if (!msgEl) thinking.remove();

      // Store assistant message
      if (assistantText) {
        this.messages.push({ role: 'assistant', content: assistantText });
      }

      // Update metrics
      this._updateTimer();
      this.els.metricMessages.textContent = this.messages.length;

    } catch (err) {
      thinking.remove();
      this._showError(err.message || 'Erreur de connexion');
      console.error('Chat error:', err);
    }

    this.isStreaming = false;
    this.els.chatInput.disabled = false;
    this.els.sendBtn.disabled = false;
    this.els.chatInput.focus();
  },

  // ═══════════ PRODUCT EVENTS ═══════════
  _handleProducts(data) {
    const placeholder = this.els.productsGrid.querySelector('.products-placeholder');
    if (placeholder) placeholder.remove();

    this._hideCheckout();

    const cards = [];
    let displayedCount = 0;

    (data.products || []).forEach(p => {
      if (this.displayedPids.has(p.product_id)) return; // skip duplicates
      const product = PM_PRODUCTS[p.product_id];
      if (!product) return;

      const qty = p.quantity || 1;
      const card = this._createProductCard(product, qty, p.product_id);
      this.els.productsGrid.appendChild(card);
      cards.push(card);

      this.displayedPids.add(p.product_id);
      this.cart.push({ key: p.product_id, product, qty });
      displayedCount++;
    });

    Animations.cascadeProducts(cards);
    this._updateMetrics();

    // Update products count
    const total = this.els.productsGrid.querySelectorAll('.product-card').length;
    this.els.productsCount.textContent = `${total} produit${total > 1 ? 's' : ''}`;
  },

  // ═══════════ TOOL EVENTS (outils recommandés) ═══════════
  _handleTools(data) {
    const products = (data.products || []).filter(p => PM_PRODUCTS[p.product_id] && !this.displayedPids.has(p.product_id));
    if (!products.length) return;

    // Add a separator header only once
    if (!this.els.productsGrid.querySelector('.tools-header')) {
      const separator = document.createElement('div');
      separator.className = 'tools-header';
      separator.innerHTML = '<span>🔧</span> Outils recommandés';
      this.els.productsGrid.appendChild(separator);
    }

    const cards = [];
    products.forEach(p => {
      const product = PM_PRODUCTS[p.product_id];
      const card = this._createProductCard(product, p.quantity || 1, p.product_id);
      card.classList.add('tool-card');
      this.els.productsGrid.appendChild(card);
      cards.push(card);
      this.displayedPids.add(p.product_id);
      this.cart.push({ key: p.product_id, product, qty: p.quantity || 1 });
    });

    Animations.cascadeProducts(cards);
    const total = this.els.productsGrid.querySelectorAll('.product-card').length;
    this.els.productsCount.textContent = `${total} produit${total > 1 ? 's' : ''}`;
  },

  // ═══════════ CHECKOUT ═══════════
  _handleCheckout(data) {
    this.checkoutData = data;
    this._showCheckout(data);
  },

  _showCheckout(data) {
    const isPro = data.is_pro || false;
    this.els.checkoutItems.innerHTML = '';

    let subtotal = 0;

    this.cart.forEach(({ product, qty }) => {
      const lineTotal = product.price * qty;
      subtotal += lineTotal;

      const item = document.createElement('div');
      item.className = 'checkout-item';
      item.innerHTML = `
        <span class="checkout-item-name">${this._esc(product.title)}</span>
        <span class="checkout-item-qty">×${qty}</span>
        <span class="checkout-item-price">${Animations.formatCAD(lineTotal)}</span>
      `;
      this.els.checkoutItems.appendChild(item);
    });

    // PM PRO discount
    const discountLine = document.querySelector('.checkout-line.discount');
    if (discountLine) discountLine.remove();

    if (isPro) {
      const discount = subtotal * 0.10;
      subtotal -= discount;

      const line = document.createElement('div');
      line.className = 'checkout-line discount';
      line.innerHTML = `<span>Escompte PM PRO (10%)</span><span>-${Animations.formatCAD(discount)}</span>`;
      this.els.checkoutSubtotal.parentElement.parentElement.insertBefore(
        line,
        this.els.checkoutSubtotal.parentElement.nextSibling
      );
    }

    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;
    const total = subtotal + tps + tvq;

    this.els.checkoutSubtotal.textContent = Animations.formatCAD(subtotal);
    this.els.checkoutTps.textContent = Animations.formatCAD(tps);
    this.els.checkoutTvq.textContent = Animations.formatCAD(tvq);
    this.els.checkoutTotal.textContent = Animations.formatCAD(total);

    // Reset button state
    this.els.checkoutConfirm.textContent = '💳 Payer avec Stripe';
    this.els.checkoutConfirm.disabled = false;

    Animations.fadeIn(this.els.checkoutPanel);
  },

  _hideCheckout() {
    this.els.checkoutPanel.classList.add('hidden');
  },

  // ═══════════ STRIPE ═══════════
  async _goToStripeCheckout() {
    const btn = this.els.checkoutConfirm;
    btn.textContent = 'Redirection vers Stripe...';
    btn.disabled = true;

    const items = this.cart.map(({ product, qty }) => ({
      title: product.title,
      sku: product.sku,
      price: product.price,
      quantity: qty,
    }));

    const isPro = this.checkoutData?.is_pro || false;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, isPro }),
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);
      if (!result.url) throw new Error('No checkout URL returned');

      window.location.href = result.url;
    } catch (err) {
      console.error('Checkout error:', err);
      this._showError('Erreur Stripe: ' + err.message);
      btn.textContent = '💳 Payer avec Stripe';
      btn.disabled = false;
    }
  },

  // ═══════════ PRODUCT CARDS ═══════════
  _createProductCard(product, qty, pid) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const discount = product.originalPrice
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

    const stockCount = product.availability?.Laval || 0;
    const stockClass = stockCount < 10 ? 'low' : '';
    const hasImage = product.imageUrl && product.imageUrl.length > 0;

    card.innerHTML = `
      <div class="product-card-image">
        ${hasImage
          ? `<img src="${this._esc(product.imageUrl)}" alt="${this._esc(product.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<div class=img-placeholder>📦</div>'">`
          : '<div class="img-placeholder">📦</div>'
        }
      </div>
      <div class="product-card-body">
        <div class="product-card-brand">${this._esc(product.brand)}</div>
        <div class="product-card-title">${this._esc(product.title)}</div>
        ${pid ? `<div class="product-card-pid">${this._esc(pid)}</div>` : ''}
        <div class="product-card-price">
          <span class="price-current">${Animations.formatCAD(product.price)}</span>
          ${product.originalPrice ? `<span class="price-original">${Animations.formatCAD(product.originalPrice)}</span>` : ''}
          ${discount > 0 ? `<span class="price-badge">-${discount}%</span>` : ''}
        </div>
        <div class="product-card-meta">
          <span class="stock-badge">
            <span class="stock-dot ${stockClass}"></span> ${stockCount} en stock
          </span>
          ${qty > 1 ? `<span class="qty-badge">Qté: ${qty}</span>` : ''}
        </div>
      </div>
    `;

    return card;
  },

  // ═══════════ MESSAGE RENDERING ═══════════
  _renderUserMessage(text) {
    const el = this._createMessageEl('user');
    el.querySelector('.msg-body').innerHTML = `<p>${this._esc(text)}</p>`;
    this.els.chatMessages.appendChild(el);
    this._scrollChat();
  },

  _createMessageEl(role) {
    const el = document.createElement('div');
    el.className = `chat-message ${role}-msg`;
    const isUser = role === 'user';
    el.innerHTML = `
      <div class="msg-header">
        <div class="msg-avatar ${isUser ? 'user-avatar' : 'assistant-avatar'}">${isUser ? 'V' : 'PM'}</div>
        <span class="msg-role">${isUser ? 'Vous' : 'Assistant PM'}</span>
      </div>
      <div class="msg-body"></div>
    `;
    return el;
  },

  _showError(message) {
    const el = document.createElement('div');
    el.className = 'error-msg';
    el.textContent = message;
    this.els.chatMessages.appendChild(el);
    this._scrollChat();
  },

  // ═══════════ METRICS ═══════════
  _updateMetrics() {
    let totalValue = 0;
    let totalItems = 0;
    this.cart.forEach(({ product, qty }) => {
      totalValue += product.price * qty;
      totalItems += qty;
    });
    this.els.metricCart.textContent = Animations.formatCAD(totalValue);
    this.els.metricItems.textContent = totalItems.toString();

    // Update header cart count
    const cartCount = document.getElementById('header-cart-count');
    if (cartCount) {
      cartCount.textContent = totalItems.toString();
      cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
  },

  _updateTimer() {
    if (!this.startTime) return;
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    this.els.metricTime.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  },

  // ═══════════ HELPERS ═══════════
  _scrollChat() {
    this.els.chatMessages.scrollTop = this.els.chatMessages.scrollHeight;
  },

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },
};

// ═══════════ BOOT ═══════════
document.addEventListener('DOMContentLoaded', () => App.init());
