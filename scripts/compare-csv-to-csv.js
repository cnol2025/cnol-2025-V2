const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// 1. Lire le CSV nettoyé
const csvContent = fs.readFileSync('data/inscriptions_clean.csv', 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

// 2. Lire le CSV exporté de Supabase
const supabaseContent = fs.readFileSync('data/inscription_supabase.csv', 'utf8');
const supabaseRecords = parse(supabaseContent, { columns: true, skip_empty_lines: true });

// 3. Construire l'ensemble des emails validés
const emailsValides = new Set(supabaseRecords.map(i => (i.email || '').trim().toLowerCase()));

// 4. Comparer et séparer les listes
const a_traiter = [];
const deja_valides = [];
for (const row of records) {
  const email = (row.email || '').trim().toLowerCase();
  if (emailsValides.has(email)) {
    deja_valides.push(row);
  } else {
    a_traiter.push(row);
  }
}

// 5. Exporter les deux listes
fs.writeFileSync('data/a_traiter.csv', stringify(a_traiter, { header: true }), 'utf8');
fs.writeFileSync('data/deja_valides.csv', stringify(deja_valides, { header: true }), 'utf8');

// 6. Log
console.log(`À traiter : ${a_traiter.length} | Déjà validés : ${deja_valides.length}`);
console.log('Fichiers générés : data/a_traiter.csv, data/deja_valides.csv'); 