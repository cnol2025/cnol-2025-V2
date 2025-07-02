import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }
  // Vérifier la session utilisateur
  const sessionCookie = req.cookies['cnol-session'];
  if (!sessionCookie) {
    return res.status(401).json({ message: 'Session utilisateur requise' });
  }
  let sessionData;
  try {
    sessionData = JSON.parse(decodeURIComponent(sessionCookie));
  } catch (e) {
    return res.status(401).json({ message: 'Session invalide' });
  }
  if (!sessionData || !sessionData.id) {
    return res.status(401).json({ message: 'Session utilisateur invalide' });
  }
  // Mettre à jour toutes les notifications de l'utilisateur
  const { error } = await supabase
    .from('notifications')
    .update({ lu: true, read_at: new Date().toISOString() })
    .eq('user_id', sessionData.id)
    .eq('lu', false);
  if (error) {
    return res.status(500).json({ message: "Erreur lors de la mise à jour des notifications", error });
  }
  return res.status(200).json({ message: 'Toutes les notifications marquées comme lues' });
} 