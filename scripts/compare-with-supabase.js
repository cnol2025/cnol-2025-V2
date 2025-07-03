require('dotenv').config();
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { createClient } = require('@supabase/supabase-js');

// Config Supabase (à adapter si besoin)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  // 1. Lire le CSV nettoyé
  const csvContent = fs.readFileSync('data/inscriptions_clean.csv', 'utf8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });

  // 2. Récupérer les emails validés depuis Supabase
  const { data: inscritsValides, error } = await supabase
    .from('inscription')
    .select('email')
    .eq('valide', true);
  if (error) throw error;
  const emailsValides = new Set((inscritsValides || []).map(i => (i.email || '').trim().toLowerCase()));

  // 3. Comparer et séparer les listes
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

  // 4. Exporter les deux listes
  fs.writeFileSync('data/a_traiter.csv', stringify(a_traiter, { header: true }), 'utf8');
  fs.writeFileSync('data/deja_valides.csv', stringify(deja_valides, { header: true }), 'utf8');

  // 5. Log
  console.log(`À traiter : ${a_traiter.length} | Déjà validés : ${deja_valides.length}`);
  console.log('Fichiers générés : data/a_traiter.csv, data/deja_valides.csv');
})(); 