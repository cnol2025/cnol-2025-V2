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
  // Récupérer l'id de la notification
  let id;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    id = body.id;
  } catch (e) {
    return res.status(400).json({ message: 'Corps de requête invalide' });
  }
  if (!id) {
    return res.status(400).json({ message: 'id de notification requis' });
  }
  // Mettre à jour la notification (champ lu à true OU read_at à NOW())
  const { error } = await supabase
    .from('notifications')
    .update({ lu: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', sessionData.id);
  if (error) {
    return res.status(500).json({ message: "Erreur lors de la mise à jour de la notification", error });
  }
  return res.status(200).json({ message: 'Notification marquée comme lue' });
} 