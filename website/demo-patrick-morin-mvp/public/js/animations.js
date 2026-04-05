// animations.js — Rendering & animation utilities for the MVP

const Animations = {

  PRODUCT_CASCADE_DELAY: 150,

  /**
   * Convert markdown text to HTML (used for streaming render)
   */
  renderMarkdown(text) {
    const lines = text.split('\n');
    let html = '';
    let inTable = false;
    let isFirstTableRow = true;

    for (const line of lines) {
      if (line.trim() === '') {
        if (inTable) { html += '</table>'; inTable = false; isFirstTableRow = true; }
        continue;
      }

      let processed = line;
      // Bold: **text**
      processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Italic: *text*
      processed = processed.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
      // Italic: _text_
      processed = processed.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');

      // Table rows
      if (processed.trim().startsWith('|') && processed.trim().endsWith('|')) {
        const cells = processed.split('|').filter(c => c.trim() !== '');
        if (cells.every(c => c.trim().match(/^[-:]+$/))) continue; // Skip separator

        if (!inTable) {
          html += '<table>';
          inTable = true;
          isFirstTableRow = true;
        }

        const tag = isFirstTableRow ? 'th' : 'td';
        const cellsHtml = cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('');
        html += `<tr>${cellsHtml}</tr>`;
        isFirstTableRow = false;
        continue;
      }

      if (inTable) { html += '</table>'; inTable = false; isFirstTableRow = true; }

      // Bullet points
      if (processed.trim().match(/^[•\-]\s/)) {
        html += `<p style="padding-left:12px">• ${processed.trim().replace(/^[•\-]\s*/, '')}</p>`;
        continue;
      }

      // Indented explanation lines (tool descriptions)
      if (line.match(/^\s{2,}/) && processed.trim()) {
        html += `<p style="padding-left:28px;color:#666;font-style:italic;margin-top:-4px">${processed.trim()}</p>`;
        continue;
      }

      // Numbered lists
      const numMatch = processed.trim().match(/^(\d+)\.\s(.+)/);
      if (numMatch) {
        html += `<p style="padding-left:12px">${numMatch[1]}. ${numMatch[2]}</p>`;
        continue;
      }

      html += `<p>${processed}</p>`;
    }

    if (inTable) html += '</table>';
    return html;
  },

  /**
   * Show thinking dots
   */
  showThinking(messagesContainer) {
    const el = document.createElement('div');
    el.className = 'chat-message assistant-msg';
    el.innerHTML = `
      <div class="msg-header">
        <div class="msg-avatar assistant-avatar">✦</div>
        <span class="msg-role">ChatGPT</span>
      </div>
      <div class="msg-body" style="padding-left:36px">
        <div class="thinking-dots"><span></span><span></span><span></span></div>
      </div>
    `;
    messagesContainer.appendChild(el);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return {
      element: el,
      remove() { el.remove(); }
    };
  },

  /**
   * Cascade product cards into view
   */
  cascadeProducts(cards) {
    cards.forEach((card, i) => {
      setTimeout(() => card.classList.add('visible'), i * this.PRODUCT_CASCADE_DELAY);
    });
  },

  /**
   * Fade in element
   */
  fadeIn(el) {
    el.style.opacity = '0';
    el.classList.remove('hidden');
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  },

  /**
   * Format price in Canadian dollars
   */
  formatCAD(amount) {
    return amount.toFixed(2).replace('.', ',') + ' $';
  }
};
