import { readFileSync, writeFileSync } from 'fs';

const templates = JSON.parse(readFileSync('data/project-templates.json', 'utf-8'));

// Tools to add per project type
const toolsByProject = {
  toiture: [
    { name: "Marteau de couvreur", search: { query: "marteau", category: "Marteau" }, description: "1 marteau" },
    { name: "Couteau utilitaire", search: { query: "couteau utilitaire", category: "Couteaux" }, description: "1 couteau" },
    { name: "Barre à clous", search: { query: "barre", category: "Barre" }, description: "1 barre" },
    { name: "Ruban à mesurer", search: { query: "ruban a mesurer", category: "Ruban a mesurer" }, description: "1 ruban" },
  ],
  terrasse: [
    { name: "Perceuse-visseuse", search: { query: "perceuse visseuse", category: "Perceuse" }, description: "1 perceuse" },
    { name: "Scie circulaire", search: { query: "scie circulaire", category: "Scie circulaire" }, description: "1 scie" },
    { name: "Niveau", search: { query: "niveau", category: "Niveaux" }, description: "1 niveau" },
    { name: "Ruban à mesurer", search: { query: "ruban a mesurer", category: "Ruban a mesurer" }, description: "1 ruban" },
  ],
  sous_sol: [
    { name: "Perceuse-visseuse", search: { query: "perceuse visseuse", category: "Perceuse" }, description: "1 perceuse" },
    { name: "Couteau utilitaire", search: { query: "couteau utilitaire", category: "Couteaux" }, description: "1 couteau" },
    { name: "Niveau", search: { query: "niveau", category: "Niveaux" }, description: "1 niveau" },
    { name: "Ruban à mesurer", search: { query: "ruban a mesurer", category: "Ruban a mesurer" }, description: "1 ruban" },
  ],
  salle_de_bain: [
    { name: "Perceuse-visseuse", search: { query: "perceuse visseuse", category: "Perceuse" }, description: "1 perceuse" },
    { name: "Niveau", search: { query: "niveau", category: "Niveaux" }, description: "1 niveau" },
    { name: "Ruban à mesurer", search: { query: "ruban a mesurer", category: "Ruban a mesurer" }, description: "1 ruban" },
  ],
  cabanon: [
    { name: "Perceuse-visseuse", search: { query: "perceuse visseuse", category: "Perceuse" }, description: "1 perceuse" },
    { name: "Scie circulaire", search: { query: "scie circulaire", category: "Scie circulaire" }, description: "1 scie" },
    { name: "Marteau de charpentier", search: { query: "marteau", category: "Marteau" }, description: "1 marteau" },
    { name: "Niveau", search: { query: "niveau", category: "Niveaux" }, description: "1 niveau" },
    { name: "Ruban à mesurer", search: { query: "ruban a mesurer", category: "Ruban a mesurer" }, description: "1 ruban" },
  ],
  garage: [
    { name: "Perceuse-visseuse", search: { query: "perceuse visseuse", category: "Perceuse" }, description: "1 perceuse" },
    { name: "Scie circulaire", search: { query: "scie circulaire", category: "Scie circulaire" }, description: "1 scie" },
    { name: "Marteau de charpentier", search: { query: "marteau", category: "Marteau" }, description: "1 marteau" },
    { name: "Niveau", search: { query: "niveau", category: "Niveaux" }, description: "1 niveau" },
    { name: "Ruban à mesurer", search: { query: "ruban a mesurer", category: "Ruban a mesurer" }, description: "1 ruban" },
  ],
  cloture: [
    { name: "Perceuse-visseuse", search: { query: "perceuse visseuse", category: "Perceuse" }, description: "1 perceuse" },
    { name: "Scie circulaire", search: { query: "scie circulaire", category: "Scie circulaire" }, description: "1 scie" },
    { name: "Niveau", search: { query: "niveau", category: "Niveaux" }, description: "1 niveau" },
    { name: "Ruban à mesurer", search: { query: "ruban a mesurer", category: "Ruban a mesurer" }, description: "1 ruban" },
  ],
  peinture: [
    { name: "Escabeau", search: { query: "escabeau", category: "chelles" }, description: "1 escabeau" },
  ],
};

for (const [projectType, tools] of Object.entries(toolsByProject)) {
  const project = templates.projects[projectType];
  if (!project) { console.log(`❌ Project ${projectType} not found`); continue; }
  
  for (const tool of tools) {
    project.categories.push({
      name: tool.name,
      role: "outil",
      search: tool.search,
      quantity_formula: { type: "fixed", quantity: 1, description: tool.description }
    });
  }
  console.log(`✅ ${projectType}: added ${tools.length} tools`);
}

writeFileSync('data/project-templates.json', JSON.stringify(templates, null, 2) + '\n');
console.log('\n📄 project-templates.json updated');
