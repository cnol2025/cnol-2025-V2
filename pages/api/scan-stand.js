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
  console.log('Headers cookie:', req.headers.cookie);

  // Récupérer la session depuis le cookie (décodage obligatoire)
  let session = null;
  try {
    const cookies = parseCookies(req.headers.cookie);
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

  // Selon le schéma Supabase, il faut vérifier quelle table utiliser
  // Il semble y avoir une relation entre exposants et inscription
  
  // Option 1: Si exposant_id correspond à l'ID dans la table inscription
  const { data: inscription, error: inscriptionError } = await supabase
    .from('inscription')
    .select('id, exposant_id')
    .eq('id', exposant_id)
    .single();
    
  if (inscriptionError) {
    console.error('Erreur recherche inscription:', inscriptionError);
    
    // Option 2: Si exposant_id correspond à l'exposant_id dans inscription
    const { data: inscriptionByExposant, error: inscriptionByExposantError } = await supabase
      .from('inscription')
      .select('id, exposant_id')
      .eq('exposant_id', exposant_id)
      .single();
      
    if (inscriptionByExposantError) {
      console.error('Erreur recherche inscription par exposant_id:', inscriptionByExposantError);
      return res.status(404).json({ 
        message: 'Aucune inscription trouvée pour cet exposant.',
        debug: {
          exposant_id,
          error1: inscriptionError.message,
          error2: inscriptionByExposantError.message
        }
      });
    }
    
    // Utiliser l'ID de l'inscription trouvée
    const inscriptionId = inscriptionByExposant.id;
    
    // Insérer le lead avec l'ID de inscription
    const { error: insertError } = await supabase
      .from('leads')
      .insert({
        exposant_id: inscriptionId, // ID de la table inscription
        visiteur_id: session.id,
        created_at: new Date().toISOString()
      });
      
    if (insertError) {
      console.error('Erreur insertion lead (option 2):', insertError);
      return res.status(500).json({ message: 'Erreur lors de l\'enregistrement du scan.' });
    }
    
    return res.status(200).json({ 
      message: 'Scan enregistré avec succès.',
      debug: { inscriptionId, exposant_id }
    });
  }
  
  // Si on arrive ici, l'exposant_id correspond directement à un ID dans inscription
  console.log('Inscription trouvée:', inscription);

  // Insérer le lead
  const { error: insertError } = await supabase
    .from('leads')
    .insert({
      exposant_id,
      visiteur_id: session.id,
      created_at: new Date().toISOString()
    });
    
  if (insertError) {
    console.error('Erreur insertion lead:', insertError);
    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement du scan.' });
  }

  return res.status(200).json({ message: 'Scan enregistré avec succès.' });
}
