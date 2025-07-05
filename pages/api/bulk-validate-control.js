import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const { action } = req.body;
  if (!['start', 'pause'].includes(action)) {
    return res.status(400).json({ error: 'Action invalide' });
  }
  const { data } = await supabase
    .from('bulk_validate_state')
    .select('running')
    .eq('id', 1)
    .single();
  let running = data?.running || false;
  if (action === 'start') running = true;
  if (action === 'pause') running = false;
  await supabase
    .from('bulk_validate_state')
    .update({ running, updated_at: new Date().toISOString() })
    .eq('id', 1);
  return res.status(200).json({ success: true, running });
} 