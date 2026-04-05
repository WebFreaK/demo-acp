import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('data/project-templates.json', 'utf8'));

// Add pelle à bardeaux to toiture project
const toiture = data.projects.toiture;
const pelleEntry = {
  name: "Pelle à bardeaux",
  role: "outil",
  search: { query: "pelle bardeaux", category: "bardeau" },
  quantity_formula: {
    type: "fixed",
    quantity: 1,
    description: "1 pelle pour retirer les anciens bardeaux"
  }
};

// Insert before the last outil (Ruban à mesurer) 
const rubanIdx = toiture.categories.findIndex(c => c.role === 'outil' && c.name === 'Ruban à mesurer');
if (rubanIdx >= 0) {
  toiture.categories.splice(rubanIdx, 0, pelleEntry);
  console.log('Inserted pelle à bardeaux at index', rubanIdx);
} else {
  toiture.categories.push(pelleEntry);
  console.log('Appended pelle à bardeaux');
}

// Verify
console.log('\nToiture outils:');
toiture.categories.filter(c => c.role === 'outil').forEach(c => console.log(' -', c.name));

writeFileSync('data/project-templates.json', JSON.stringify(data, null, 2), 'utf8');
console.log('\nFile saved.');
