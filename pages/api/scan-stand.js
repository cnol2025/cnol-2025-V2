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

  // LOG DU HEADER COOKIE POUR DEBUG
  console.log('Headers cookie:', req.headers.cookie);

  // Récupérer la session depuis le cookie (décodage obligatoire)
  let session = null;
  try {
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    const raw = cookies['cnol-session'];
    console.log('Cookie cnol-session brut:', raw);
    if (raw) {
      const decoded = decodeURIComponent(raw);
      console.log('Cookie cnol-session décodé:', decoded);
      session = JSON.parse(decoded);
    }
  } catch (e) {
    console.error('Erreur parsing cookies:', e, 'Header brut:', req.headers.cookie);
    return res.status(401).json({ message: 'Session invalide (cookie parse)' });
  }
  if (!session || !session.id) {
    return res.status(401).json({ message: 'Vous devez être connecté (pas de session valide).' });
  }

  const { exposant_id } = req.body;
  if (!exposant_id) {
    return res.status(400).json({ message: 'ID du stand manquant.' });
  }

  // Vérifier que le stand existe
  const { data: exposant, error: exposantError } = await supabase
    .from('exposants')
    .select('id')
    .eq('id', exposant_id)
    .single();
  if (exposantError || !exposant) {
    return res.status(404).json({ message: 'Stand non trouvé.' });
  }

  // Insérer le lead
  const { error: insertError } = await supabase
    .from('leads')
    .insert({
      exposant_id,
      visiteur_id: session.id,
      created_at: new Date().toISOString()
    });
  if (insertError) {
    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement du scan.' });
  }

  return res.status(200).json({ message: 'Scan enregistré avec succès.' });
}
