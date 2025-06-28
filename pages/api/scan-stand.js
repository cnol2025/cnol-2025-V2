import { createClient } from '@supabase/supabase-js';
import cookie from 'cookie';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  // Récupérer la session visiteur depuis le cookie
  let session = null;
  try {
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    session = cookies['cnol-session'] ? JSON.parse(cookies['cnol-session']) : null;
  } catch (e) {
    return res.status(401).json({ message: 'Session invalide' });
  }
  if (!session || !session.id) {
    return res.status(401).json({ message: 'Vous devez être connecté.' });
  }

  const { stand_id } = req.body;
  if (!stand_id) {
    return res.status(400).json({ message: 'ID du stand manquant.' });
  }

  // Vérifier que le stand existe
  const { data: exposant, error: exposantError } = await supabase
    .from('exposants')
    .select('id')
    .eq('id', stand_id)
    .single();
  if (exposantError || !exposant) {
    return res.status(404).json({ message: 'Stand non trouvé.' });
  }

  // Vérifier que le visiteur existe
  const { data: visiteur, error: visiteurError } = await supabase
    .from('inscription')
    .select('id')
    .eq('id', session.id)
    .single();
  if (visiteurError || !visiteur) {
    return res.status(404).json({ message: 'Visiteur non trouvé.' });
  }

  // Insérer le lead
  const { error: insertError } = await supabase
    .from('leads')
    .insert({
      exposant_id: stand_id,
      visiteur_id: session.id,
      created_at: new Date().toISOString()
    });
  if (insertError) {
    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement du scan.' });
  }

  return res.status(200).json({ message: 'Scan enregistré avec succès.' });
}
