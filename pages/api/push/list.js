import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // DEBUG : retourne tous les abonnements push sans filtre
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ subscriptions: data });
} 