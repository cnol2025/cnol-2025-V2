const fetch = require('node-fetch');
const fs = require('fs');

const API_URL = 'https://cnol-2025-v2.vercel.app/api/validate';
const SUPABASE_URL = 'https://otmttpiqeehfquoqycol.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bXR0cGlxZWVoZnF1b3F5Y29sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTcyNzM0OSwiZXhwIjoyMDY1MzAzMzQ5fQ.apn4cVizZwJ79WoIfHOGHuVAyfR90YRs8wXloFsNLNM'; // À remplacer par ta vraie clé service_role
const STATE_FILE = './bulk-validate-state.json';

function getState() {
  try {
    const data = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { running: false };
  }
}

function setState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

async function getNonValidatedInscriptions() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/inscription?valide=eq.false`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }
  });
  return await res.json();
}

async function validateInscription(id) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: `cnol2025-${id}` })
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`✅ Inscription ${id} validée et email/WhatsApp envoyés`);
  } else {
    console.error(`❌ Erreur validation ${id}:`, data.message || data.error);
  }
}

async function main() {
  setState({ running: true });
  const inscriptions = await getNonValidatedInscriptions();
  for (const inscrit of inscriptions) {
    if (!getState().running) {
      console.log('⏸️ Script mis en pause.');
      break;
    }
    await validateInscription(inscrit.id);
    console.log('⏳ Attente 90 secondes avant le prochain...');
    await new Promise(r => setTimeout(r, 90000));
  }
  setState({ running: false });
  console.log('🎉 Toutes les inscriptions ont été traitées ou script mis en pause !');
}

if (require.main === module) {
  main();
} 