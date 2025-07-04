import fs from 'fs';
import path from 'path';

const STATE_FILE = path.resolve('./bulk-validate-state.json');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const { action } = req.body;
  if (!['start', 'pause'].includes(action)) {
    return res.status(400).json({ error: 'Action invalide' });
  }
  let state = { running: false };
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {}
  if (action === 'start') {
    state.running = true;
  } else if (action === 'pause') {
    state.running = false;
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  return res.status(200).json({ success: true, running: state.running });
} 