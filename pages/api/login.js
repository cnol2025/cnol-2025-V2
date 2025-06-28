import { supabase } from '../../lib/supabaseClient';
const cookie = require('cookie');

export default async function handler(req, res) {
  console.log('🔍 API Login - Début de la requête');
  console.log('🌍 Environnement:', process.env.NODE_ENV);
  console.log('🔑 Supabase URL configurée:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('🔑 Supabase Key configurée:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  if (req.method !== 'POST') {
    console.log('❌ Méthode non autorisée:', req.method);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, badgeCode } = req.body;
  console.log('📧 Données reçues:', { email: email ? 'présent' : 'manquant', badgeCode: badgeCode ? 'présent' : 'manquant' });

  if (!email || !badgeCode) {
    console.log('❌ Données manquantes');
    return res.status(400).json({ message: 'L\'email et le code badge sont requis.' });
  }

  try {
    console.log('🔍 Recherche utilisateur dans Supabase...');
    const { data: user, error } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email, participant_type, valide, identifiant_badge')
      .eq('email', email.trim())
      .eq('identifiant_badge', badgeCode.trim().toUpperCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('multiple') || error.message?.includes('no rows')) {
        return res.status(401).json({ message: "Code erroné ou email non reconnu. Merci de vérifier les informations saisies. En cas de problème persistant, contactez-nous à cnol.badge@gmail.com." });
      }
      console.error('❌ Erreur Supabase:', error);
      return res.status(500).json({ message: `Erreur de la base de données: ${error.message}` });
    }

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      return res.status(401).json({ message: "Code erroné ou email non reconnu. Merci de vérifier les informations saisies. En cas de problème persistant, contactez-nous à cnol.badge@gmail.com." });
    }

    console.log('✅ Utilisateur trouvé:', { id: user.id, email: user.email, valide: user.valide });

    // Créer la session avec les informations utilisateur
    const sessionData = {
      id: user.id,
      email: user.email,
      prenom: user.prenom,
      valide: user.valide,
      participant_type: user.participant_type,
    };

    console.log('🍪 Création du cookie de session...');
    
    // Définir le cookie de session
    const sessionCookie = cookie.serialize('cnol-session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: true, // Toujours true en production (Vercel est HTTPS)
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      path: '/',
      sameSite: 'none', // Pour compatibilité cross-site moderne (obligatoire si secure:true)
    });

    console.log('✅ Cookie créé (valeur):', sessionCookie);
    res.setHeader('Set-Cookie', sessionCookie);
    res.status(200).json({ message: 'Connexion réussie', user });

  } catch (error) {
    console.error('💥 Erreur critique dans login API:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
}
