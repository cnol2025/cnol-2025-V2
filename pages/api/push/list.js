import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const user_id = req.method === 'GET'
    ? parseInt(req.query.user_id, 10)
    : parseInt(req.body.user_id, 10);

  if (!user_id) {
    return res.status(400).json({ error: 'user_id requis (en query ou body)' });
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user_id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ subscriptions: data });
} 