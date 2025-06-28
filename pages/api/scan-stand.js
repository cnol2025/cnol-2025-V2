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

  try {
    // Diagnostic simple : vérifier les données dans les deux tables
    console.log('=== DIAGNOSTIC ===');
    console.log('exposant_id reçu:', exposant_id, typeof exposant_id);
    
    // 1. Vérifier dans exposants
    const { data: exposantsData, error: exposantsError } = await supabase
      .from('exposants')
      .select('*')
      .eq('id', exposant_id);
    
    if (exposantsError) {
      console.error('Erreur requête exposants:', exposantsError);
      return res.status(500).json({ message: 'Erreur lors de la vérification de l\'exposant.' });
    }
    
    console.log('Exposants trouvés:', exposantsData);
    
    // 2. Vérifier dans inscription
    const { data: inscriptionData, error: inscriptionError } = await supabase
      .from('inscription')
      .select('*')
      .eq('exposant_id', exposant_id);
    
    if (inscriptionError) {
      console.error('Erreur requête inscriptions:', inscriptionError);
      return res.status(500).json({ message: 'Erreur lors de la vérification de l\'inscription.' });
    }
    
    console.log('Inscriptions trouvées:', inscriptionData);
    
    // Décider quelle stratégie utiliser selon votre structure de données
    let finalExposantId = null;
    
    if (exposantsData && exposantsData.length > 0) {
      console.log('✅ Exposant trouvé dans la table exposants');
      
      // Vérifier si la FK dans leads pointe vers exposants ou inscription
      // Si elle pointe vers exposants, utilisez directement l'ID
      finalExposantId = exposant_id;
      
      // Si votre FK pointe vers inscription, utilisez cette logique :
      /*
      if (inscriptionData && inscriptionData.length > 0) {
        console.log('✅ Inscription correspondante trouvée');
        finalExposantId = inscriptionData[0].id; // ID de l'inscription
      } else {
        return res.status(404).json({ 
          message: 'Exposant trouvé mais pas d\'inscription correspondante.',
          debug: { exposant_id }
        });
      }
      */
    } else {
      return res.status(404).json({ 
        message: 'Exposant non trouvé.',
        debug: { exposant_id }
      });
    }

    // Vérifier si ce lead existe déjà pour éviter les doublons
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('exposant_id', finalExposantId)
      .eq('visiteur_id', session.id)
      .single();

    if (existingLead) {
      return res.status(200).json({ 
        message: 'Scan déjà enregistré.',
        debug: { exposant_id: finalExposantId, existing: true }
      });
    }

    // Insérer le lead
    const { error: insertError } = await supabase
      .from('leads')
      .insert({
        exposant_id: finalExposantId,
        visiteur_id: session.id,
        created_at: new Date().toISOString()
      });
      
    if (insertError) {
      console.error('Erreur insertion lead:', insertError);
      return res.status(500).json({ 
        message: 'Erreur lors de l\'enregistrement du scan.',
        debug: { 
          exposant_id: finalExposantId, 
          error: insertError.message 
        }
      });
    }

    return res.status(200).json({ 
      message: 'Scan enregistré avec succès.',
      debug: { exposant_id: finalExposantId }
    });

  } catch (error) {
    console.error('Erreur générale:', error);
    return res.status(500).json({ 
      message: 'Erreur interne du serveur.',
      debug: { error: error.message }
    });
  }
}
