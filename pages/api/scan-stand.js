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

  // Diagnostic simple : vérifier les données dans les deux tables
  console.log('=== DIAGNOSTIC ===');
  console.log('exposant_id reçu:', exposant_id, typeof exposant_id);
  
  // 1. Vérifier dans exposants
  const { data: exposantsData, error: exposantsError } = await supabase
    .from('exposants')
    .select('*')
    .eq('id', exposant_id);
  console.log('Exposants trouvés:', exposantsData);
  
  // 2. Vérifier dans inscription
  const { data: inscriptionData, error: inscriptionError } = await supabase
    .from('inscription')
    .select('*')
    .eq('exposant_id', exposant_id);
  console.log('Inscriptions trouvées:', inscriptionData);
  
  // 3. Voir toutes les inscriptions pour comprendre la structure
  const { data: allInscriptions } = await supabase
    .from('inscription')
    .select('id, exposant_id')
    .limit(5);
  console.log('Exemples d\'inscriptions:', allInscriptions);
  
  // 4. Voir quelques exposants
  const { data: allExposants } = await supabase
    .from('exposants')
    .select('id, nom')
    .limit(5);
  console.log('Exemples d\'exposants:', allExposants);
  
  // Décider quelle stratégie utiliser
  if (exposantsData && exposantsData.length > 0) {
    console.log('✅ Exposant trouvé dans la table exposants');
    
    // Chercher l'inscription correspondante
    if (inscriptionData && inscriptionData.length > 0) {
      console.log('✅ Inscription correspondante trouvée');
      
      // Utiliser l'ID de l'inscription pour la contrainte FK
      const inscriptionId = inscriptionData[0].id;
      
      const { error: insertError } = await supabase
        .from('leads')
        .insert({
          exposant_id: inscriptionId, // ID de inscription (pour respecter la FK)
          visiteur_id: session.id,
          created_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('Erreur insertion lead:', insertError);
        return res.status(500).json({ message: 'Erreur lors de l\'enregistrement du scan.' });
      }
      
      return res.status(200).json({ 
        message: 'Scan enregistré avec succès.',
        debug: { exposant_id, inscriptionId }
      });
    } else {
      return res.status(404).json({ 
        message: 'Exposant trouvé mais pas d\'inscription correspondante.',
        debug: { exposant_id }
      });
    }
  } else {
    return res.status(404).json({ 
      message: 'Exposant non trouvé.',
      debug: { exposant_id }
    });
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
    console.error('Erreur insertion lead:', insertError);
    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement du scan.' });
  }

  return res.status(200).json({ message: 'Scan enregistré avec succès.' });
}
