import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }
  // Récupérer la session depuis le cookie
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
  // Recherche en base par id
  const { data, error } = await supabase
    .from('inscription')
    .select('*')
    .eq('id', sessionData.id)
    .single();
  if (!data || error) {
    return res.status(401).json({ message: 'Utilisateur non trouvé' });
  }
  // Récupérer les réservations ateliers
  const { data: ateliers } = await supabase
    .from('reservations_ateliers')
    .select('*, ateliers:titre, ateliers:date_heure, ateliers:salle, ateliers:intervenant')
    .eq('participant_id', data.id);
  // Récupérer les réservations masterclass
  const { data: masterclass } = await supabase
    .from('reservations_masterclass')
    .select('*, masterclass:titre, masterclass:date_heure, masterclass:salle, masterclass:intervenant')
    .eq('participant_id', data.id);
  // Récupérer les notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', data.id)
    .order('created_at', { ascending: false });

  // Récupérer les contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('contact_id, inscription:contact_id (nom, prenom, email, telephone)')
    .eq('user_id', data.id);

  // DEBUG: log id utilisateur et son type
  console.log('DEBUG data.id:', data.id, typeof data.id);

  // Requête brute sur leads sans mapping
  const { data: leadsRaw, error: leadsRawError } = await supabase
    .from('leads')
    .select('*')
    .eq('visiteur_id', data.id);
  console.log('DEBUG leadsRaw:', leadsRaw, 'error:', leadsRawError);

  // Récupérer les stands visités (leads où visiteur_id = user.id)
  const { data: stands_visites } = await supabase
    .from('leads')
    .select('created_at, exposant_id, exposant:exposant_id (id, nom, prenom, email, telephone, qualite_sponsoring, logo_url, type_produits)')
    .eq('visiteur_id', data.id)
    .order('created_at', { ascending: false });
  // DEBUG: log stands_visites
  console.log('DEBUG stands_visites:', stands_visites);

  // Récupérer les visiteurs du stand si exposant
  let visiteurs_stand = [];
  if (data.participant_type === 'exposant') {
    const { data: leads } = await supabase
      .from('leads')
      .select('created_at, visiteur_id, visiteur:visiteur_id (nom, prenom, email, telephone)')
      .eq('exposant_id', data.id)
      .order('created_at', { ascending: false });
    visiteurs_stand = leads || [];
  }

  // --- NOUVEAU : Récupérer les ateliers et masterclass disponibles ---
  const { data: available_ateliers } = await supabase
    .from('ateliers')
    .select('*')
    .eq('publie', true)
    .order('date_heure', { ascending: true });

  const { data: available_masterclass } = await supabase
    .from('masterclass')
    .select('*')
    .eq('publie', true)
    .order('date_heure', { ascending: true });

  // --- NOUVEAU : Vérifier si l'utilisateur a déjà postulé au CNOL d'Or ---
  const { data: cnol_dor_candidature } = await supabase
    .from('cnol_dor')
    .select('id')
    .eq('email', data.email)
    .single();

  // On ne retourne que les infos utiles (pas de données sensibles)
  const user = {
    id: data.id,
    nom: data.nom,
    prenom: data.prenom,
    email: data.email,
    fonction: data.fonction,
    ville: data.ville,
    participant_type: data.participant_type,
    identifiant_badge: data.identifiant_badge,
    valide: data.valide,
  };
  return res.status(200).json({ 
    user, 
    ateliers: ateliers || [], 
    masterclass: masterclass || [], 
    notifications: notifications || [], 
    contacts: contacts || [], 
    stands_visites: stands_visites || [], 
    visiteurs_stand,
    available_ateliers: available_ateliers || [],
    available_masterclass: available_masterclass || [],
    has_applied_cnol_dor: !!cnol_dor_candidature
  });
} 