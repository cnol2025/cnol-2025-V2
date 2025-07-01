import { supabase } from '../../../lib/supabaseClient';
import webpush from 'web-push';

// Clés VAPID temporaires - À remplacer par vos vraies clés
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BOr...remplace_ici_par_ta_cle_publique_VAPID...';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'remplace_ici_par_ta_cle_privee_VAPID';

webpush.setVapidDetails(
  'mailto:contact@cnol.ma',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }
  const { user_id, title, body, url } = req.body;
  if (!user_id || !title || !body) {
    return res.status(400).json({ message: 'Paramètres manquants' });
  }
  
  console.log('DEBUG recherche subscription user_id:', user_id, typeof user_id);
  // Récupérer les abonnements push de l'utilisateur
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', Number(user_id));
  console.log('DEBUG subscriptions trouvées:', subs);
    
  if (error || !subs || subs.length === 0) {
    return res.status(404).json({ message: 'Aucun abonnement push trouvé' });
  }
  
  // Envoyer la notification à chaque abonnement
  let success = 0, fail = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }, JSON.stringify({ title, body, url }));
      success++;
    } catch (e) {
      console.error('Erreur envoi notification:', e);
      fail++;
    }
  }
  
  return res.status(200).json({ 
    message: `Notifications envoyées : ${success}, échecs : ${fail}`,
    success,
    fail
  });
} 