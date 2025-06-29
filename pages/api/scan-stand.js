import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fonction utilitaire pour parser les cookies manuellement
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.trim().split('=');
    if (parts.length === 2) {
      cookies[parts[0]] = parts[1];
    }
  });
  
  return cookies;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  // LOG DU HEADER COOKIE POUR DEBUG
  console.log('=== DEBUG COOKIES ===');
  console.log('Headers cookie:', req.headers.cookie);
  console.log('Tous les headers:', req.headers);

  // Récupérer la session depuis le cookie (décodage obligatoire)
  let session = null;
  try {
    const cookies = parseCookies(req.headers.cookie);
    console.log('Cookies parsés:', cookies);
    const raw = cookies['cnol-session'];
    console.log('Cookie cnol-session brut:', raw);
    
    if (raw) {
      const decoded = decodeURIComponent(raw);
      console.log('Cookie cnol-session décodé:', decoded);
      session = JSON.parse(decoded);
      console.log('Session parsée:', session);
    } else {
      console.log('❌ Pas de cookie cnol-session trouvé');
    }
  } catch (e) {
    console.error('Erreur parsing cookies:', e, 'Header brut:', req.headers.cookie);
    return res.status(401).json({ message: 'Session invalide (cookie parse)', debug: { error: e.message, cookies: req.headers.cookie } });
  }

  if (!session || !session.id) {
    console.log('❌ Session invalide ou manquante:', session);
    return res.status(401).json({ message: 'Vous devez être connecté (pas de session valide).', debug: { session, hasId: !!session?.id } });
  }

  const { exposant_id } = req.body;
  if (!exposant_id) {
    return res.status(400).json({ message: 'ID du stand manquant.' });
  }

  try {
    console.log('=== DIAGNOSTIC ===');
    console.log('exposant_id reçu:', exposant_id, typeof exposant_id);
    console.log('visiteur_id (session):', session.id, typeof session.id);
    
    // 1. Vérifier que l'exposant existe
    const { data: exposantData, error: exposantError } = await supabase
      .from('exposants')
      .select('id, nom, type_produits, logo_url')
      .eq('id', exposant_id)
      .single();
    
    if (exposantError || !exposantData) {
      console.error('Erreur ou exposant non trouvé:', exposantError);
      return res.status(404).json({ 
        message: 'Stand non trouvé.',
        debug: { exposant_id, error: exposantError?.message }
      });
    }
    
    console.log('✅ Exposant trouvé:', exposantData);
    
    // 2. Vérifier que le visiteur existe dans inscription
    const { data: visiteurData, error: visiteurError } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email, participant_type')
      .eq('id', session.id)
      .single();
    
    if (visiteurError || !visiteurData) {
      console.error('Erreur ou visiteur non trouvé:', visiteurError);
      return res.status(404).json({ 
        message: 'Visiteur non trouvé dans les inscriptions.',
        debug: { visiteur_id: session.id, error: visiteurError?.message }
      });
    }
    
    console.log('✅ Visiteur trouvé:', visiteurData);

    // 3. Vérifier si ce lead existe déjà pour éviter les doublons
    const { data: existingLead, error: leadCheckError } = await supabase
      .from('leads')
      .select('id, created_at')
      .eq('exposant_id', exposant_id)
      .eq('visiteur_id', session.id)
      .single();

    if (leadCheckError && leadCheckError.code !== 'PGRST116') {
      // PGRST116 = "The result contains 0 rows" (pas trouvé), c'est normal
      console.error('Erreur vérification doublon:', leadCheckError);
      return res.status(500).json({ 
        message: 'Erreur lors de la vérification des doublons.' 
      });
    }

    if (existingLead) {
      console.log('⚠️ Lead déjà existant:', existingLead);
      return res.status(200).json({ 
        message: 'Scan déjà enregistré.',
        stand: {
          nom: exposantData.nom,
          id: exposantData.id,
          type_produits: exposantData.type_produits,
          logo_url: exposantData.logo_url
        },
        visiteur: {
          nom: visiteurData.nom,
          prenom: visiteurData.prenom,
          email: visiteurData.email,
          nom_complet: `${visiteurData.prenom || ''} ${visiteurData.nom || ''}`.trim(),
          participant_type: visiteurData.participant_type
        },
        existing: true,
        scan_date: existingLead.created_at
      });
    }

    // 4. Insérer le nouveau lead
    const { error: insertError } = await supabase
      .from('leads')
      .insert({
        exposant_id: exposant_id,
        visiteur_id: session.id,
        created_at: new Date().toISOString()
      });
      
    if (insertError) {
      console.error('Erreur insertion lead:', insertError);
      return res.status(500).json({ 
        message: 'Erreur lors de l\'enregistrement du scan.',
        debug: { 
          exposant_id, 
          visiteur_id: session.id,
          error: insertError.message,
          code: insertError.code
        }
      });
    }

    console.log('✅ Lead inséré avec succès');

    // 5. Retourner les informations complètes pour l'affichage
    return res.status(200).json({ 
      message: 'Scan enregistré avec succès.',
      stand: {
        nom: exposantData.nom,
        id: exposantData.id,
        type_produits: exposantData.type_produits,
        logo_url: exposantData.logo_url
      },
      visiteur: {
        nom: visiteurData.nom,
        prenom: visiteurData.prenom,
        email: visiteurData.email,
        nom_complet: `${visiteurData.prenom || ''} ${visiteurData.nom || ''}`.trim(),
        participant_type: visiteurData.participant_type
      },
      existing: false,
      scan_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur générale:', error);
    return res.status(500).json({ 
      message: 'Erreur interne du serveur.',
      debug: { error: error.message }
    });
  }
}
