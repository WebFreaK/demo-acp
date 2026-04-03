// services.js — Service card rendering for Matério MVP (coupe, livraison, financement, estimation)

const Services = {

  createServiceCard(data) {
    const card = document.createElement('div');
    card.className = 'service-card';

    const icons = {
      'centre_de_coupe': '🔧',
      'livraison_specialisee': '🚚',
      'estimation': '📋',
      'ouverture_compte': '📄',
    };
    const titles = {
      'centre_de_coupe': 'Centre de coupe sur mesure',
      'livraison_specialisee': 'Livraison spécialisée',
      'estimation': 'Service d\'estimation',
      'ouverture_compte': 'Ouverture de compte charge',
    };

    const icon = icons[data.service_type] || '🔧';
    const title = titles[data.service_type] || data.service_type;
    const store = data.store || 'Saint-Jérôme';
    const details = data.details || '';

    let capabilitiesHtml = '';
    if (data.info?.capabilities) {
      const caps = data.info.capabilities.slice(0, 4);
      capabilitiesHtml = caps.map(c => `<span style="display:block;font-size:12px;color:#555;padding-left:8px">• ${Services._esc(c)}</span>`).join('');
    }
    if (data.info?.vehicles) {
      capabilitiesHtml = `<span style="display:block;font-size:12px;color:#555;padding-left:8px">Véhicules: ${data.info.vehicles.join(', ')}</span>`;
    }

    card.innerHTML = `
      <div class="service-card-header">
        <span class="service-card-icon">${icon}</span>
        <span class="service-card-title">${Services._esc(title)}</span>
      </div>
      <div class="service-card-desc">${Services._esc(details || data.info?.description || '')}</div>
      ${capabilitiesHtml}
      <div class="service-card-store">✅ Disponible à ${Services._esc(store)}</div>
      <button class="btn-reserve-service" onclick="this.textContent='✅ Réservé';this.disabled=true">Réserver ce service</button>
    `;

    return card;
  },

  createFinancingCard(data) {
    const card = document.createElement('div');
    card.className = 'financing-card';

    const plan = data.plan;
    if (!plan) {
      card.innerHTML = `
        <div class="financing-card-header">
          <span class="financing-card-icon">💰</span>
          <span class="financing-card-title">Financement Matério</span>
        </div>
        <div class="financing-card-desc">Le montant ne se qualifie pas pour le financement (minimum 750$).</div>
      `;
      return card;
    }

    card.innerHTML = `
      <div class="financing-card-header">
        <span class="financing-card-icon">💰</span>
        <span class="financing-card-title">Plan de financement Matério</span>
      </div>
      <div class="financing-card-amount">${Animations.formatCAD(plan.monthly)}/mois</div>
      <div class="financing-card-terms">× ${plan.months} versements</div>
      <div class="financing-card-interest">0 $ d'intérêts — Total: ${Animations.formatCAD(plan.total)}</div>
      <div class="financing-card-note">Sous réserve de l'approbation du crédit. Taxes et livraison payables à l'achat.</div>
    `;

    return card;
  },

  createEstimationCard(data) {
    const card = document.createElement('div');
    card.className = 'estimation-card';

    const store = data.store || 'Saint-Jérôme';
    const projectType = data.project_type || 'Projet de rénovation';
    const estimatedRange = data.estimated_range || '';
    const details = data.project_details || {};

    let detailsHtml = '';
    const detailLabels = {
      dimensions: 'Dimensions', foundation: 'Fondation', insulation: 'Isolation',
      exterior: 'Revêtement extérieur', interior: 'Finition intérieure',
      roofing: 'Toiture', windows: 'Fenêtres'
    };
    for (const [key, label] of Object.entries(detailLabels)) {
      if (details[key]) {
        detailsHtml += `<span style="display:block;font-size:12px;color:#555;padding-left:8px">• ${label}: ${Services._esc(details[key])}</span>`;
      }
    }

    card.innerHTML = `
      <div class="estimation-card-header">
        <span class="estimation-card-icon">📋</span>
        <span class="estimation-card-title">Demande d'estimation</span>
      </div>
      <div class="estimation-card-desc">
        <strong>Projet:</strong> ${Services._esc(projectType)}<br>
        ${estimatedRange ? `<strong>Estimation IA:</strong> ${Services._esc(estimatedRange)}<br>` : ''}
        ${detailsHtml}
        Un estimateur Matério vous contactera pour préparer votre soumission détaillée.
      </div>
      <div class="estimation-card-store">📍 Magasin: ${Services._esc(store)}</div>
      <button class="btn-request-estimation" onclick="this.textContent='✅ Demande envoyée';this.disabled=true">Demander une estimation</button>
    `;

    return card;
  },

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
