import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { published, id } = req.query;
    if (published) {
      // Récupérer le programme publié
      const { data, error } = await supabase
        .from('programme_general')
        .select('*')
        .eq('published', true)
        .order('date_publication', { ascending: false })
        .limit(1)
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    } else if (id) {
      // Récupérer un programme par id
      const { data, error } = await supabase
        .from('programme_general')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: error.message });
      return res.status(200).json(data);
    } else {
      // Liste tous les programmes
      const { data, error } = await supabase
        .from('programme_general')
        .select('*')
        .order('date_publication', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
  }
  if (req.method === 'POST') {
    const { titre, contenu, published, auteur } = req.body;
    const { data, error } = await supabase
      .from('programme_general')
      .insert([{ titre, contenu, published: !!published, auteur }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }
  if (req.method === 'PUT') {
    const { id, titre, contenu, published, auteur } = req.body;
    const { data, error } = await supabase
      .from('programme_general')
      .update({ titre, contenu, published: !!published, auteur, date_publication: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body;
    const { error } = await supabase
      .from('programme_general')
      .delete()
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }
  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 