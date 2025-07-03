const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// Liste des types connus
const TYPES = ['Opticien', 'Étudiant', 'Ophtalmologue', 'Orthoptiste', 'VIP', 'Organisation', 'Exposant', 'Presse', 'Autre'];

const csvContent = fs.readFileSync('data/inscriptions.csv', 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

const seen = new Set();
const cleaned = records.map(row => {
  // Correction : si ville contient un type connu et type est vide
  if (TYPES.includes((row.ville || '').trim()) && (!row.type || row.type.trim() === '')) {
    row.type = row.ville.trim();
    row.ville = '';
  }
  return row;
}).filter(row => {
  if (!row.email) return false;
  const email = row.email.trim().toLowerCase();
  if (seen.has(email)) return false;
  seen.add(email);
  return true;
});

// Tri par nom (colonne 'name')
cleaned.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

const output = stringify(cleaned, { header: true });
fs.writeFileSync('data/inscriptions_clean.csv', output, 'utf8');
console.log(`Nettoyage terminé : ${cleaned.length} inscrits uniques. Fichier généré : data/inscriptions_clean.csv`); 