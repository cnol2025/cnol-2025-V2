import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('badges_a_traiter_csv') // nom de ta nouvelle table
      .select('*');

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.status(200).json({ rows: data });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message, details: err });
  }
} 