import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Configuration de web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@cnol.ma',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    // Authentification exposant
    const sessionCookie = req.cookies['cnol-session'];
    if (!sessionCookie) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    if (!sessionData || !sessionData.id) {
      return res.status(401).json({ message: 'Session invalide.' });
    }
    // Vérifier que l'utilisateur est bien un exposant
    const { data: userData, error: userError } = await supabaseAdmin
      .from('inscription')
      .select('exposant_id, participant_type, organisation')
      .eq('id', sessionData.id)
      .single();
    if (userError || !userData || userData.participant_type !== 'exposant') {
      return res.status(403).json({ message: 'Accès interdit. Seuls les exposants peuvent envoyer des notifications.' });
    }
    const { exposant_id, titre, message } = req.body;
    if (!exposant_id || !titre || !message) {
      return res.status(400).json({ message: 'exposant_id, titre et message sont requis.' });
    }
    if (userData.exposant_id !== exposant_id) {
      return res.status(403).json({ message: 'Vous ne pouvez envoyer des notifications qu\'au nom de votre stand.' });
    }
    // Récupérer le type d'exposant pour quota
    const { data: exposantData, error: exposantError } = await supabaseAdmin
      .from('exposants')
      .select('type')
      .eq('id', exposant_id)
      .single();
    if (exposantError || !exposantData) {
      console.error('DEBUG exposantError:', exposantError, 'exposantData:', exposantData, 'exposant_id:', exposant_id);
      return res.status(500).json({ 
        message: 'Erreur lors de la récupération des informations du stand.',
        debug: { exposantError, exposantData, exposant_id }
      });
    }
    const quotaLimits = { platinum: 3, gold: 2, silver: 1 };
    const quotaLimit = quotaLimits[exposantData.type?.toLowerCase()] || 1;
    // Vérifier quota
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayNotifications, error: quotaError } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('exposant_id', exposant_id)
      .gte('created_at', today.toISOString());
    if (quotaError) {
      return res.status(500).json({ message: 'Erreur lors de la vérification du quota.' });
    }
    const notificationsToday = todayNotifications ? todayNotifications.length : 0;
    if (notificationsToday >= quotaLimit) {
      return res.status(429).json({ 
        message: `Quota dépassé. Vous avez déjà envoyé ${notificationsToday} notifications aujourd'hui. Limite : ${quotaLimit} par jour (exposant ${exposantData.type}).`,
        quotaUsed: notificationsToday,
        quotaLimit: quotaLimit,
        exposantType: exposantData.type
      });
    }
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(500).json({ message: 'Les clés VAPID ne sont pas configurées sur le serveur.' });
    }
    // Récupérer tous les abonnements push
    const { data: subs, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*');
    if (subError) {
      return res.status(500).json({ message: 'Erreur lors de la récupération des abonnements.' });
    }
    if (!subs || subs.length === 0) {
      return res.status(404).json({ message: 'Aucun abonnement push trouvé dans la base de données.' });
    }
    // Envoi notifications
    let success = 0;
    let fail = 0;
    const notificationPayload = JSON.stringify({ 
      title: `${titre} - ${userData.organisation}`, 
      body: message,
      url: '/mon-espace'
    });
    const sendPromises = subs.map(sub =>
      webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, notificationPayload)
      .then(() => { success++; })
      .catch(err => { fail++; })
    );
    await Promise.all(sendPromises);
    // Enregistrer la notification pour chaque abonné
    let insertErrors = [];
    const insertPromises = subs.map(async (sub) => {
      const { error } = await supabaseAdmin.from('notifications').insert({
        user_id: sub.user_id,
        exposant_id: exposant_id,
        title: `${titre} - ${userData.organisation}`,
        body: message,
        url: '/mon-espace',
        lu: false
      });
      if (error) {
        insertErrors.push({ user_id: sub.user_id, message: error.message });
        console.error('Erreur insertion notification pour user_id', sub.user_id, ':', error.message);
      }
    });
    await Promise.all(insertPromises);
    if (insertErrors.length > 0) {
      return res.status(500).json({ message: "Erreur(s) lors de l'insertion des notifications", errors: insertErrors });
    }
    return res.status(200).json({ 
      message: `Notification envoyée à tous les abonnés : ${success} succès, ${fail} échecs.`,
      success,
      fail,
      totalSubscriptions: subs.length
    });
  } catch (err) {
    console.error('Erreur API send-exposant-notification:', err);
    return res.status(500).json({ message: "Erreur serveur interne." });
  }
} 