import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }
  const { visiteur_id, stand_badge } = req.body;
  if (!visiteur_id || !stand_badge) {
    return res.status(400).json({ message: 'visiteur_id et stand_badge requis' });
  }

  try {
    // 1. Trouver l'id de l'exposant via son badge/ID
    let exposantQuery = supabase
      .from('inscription')
      .select('id')
      .eq('participant_type', 'Exposant');
    
    const idMatch = stand_badge.match(/^cnol2025-(\d+)$/);
    if (idMatch) {
      const userId = parseInt(idMatch[1], 10);
      exposantQuery = exposantQuery.eq('id', userId);
    } else {
      exposantQuery = exposantQuery.eq('identifiant_badge', stand_badge);
    }

    const { data: exposant, error: findError } = await exposantQuery.single();
    
    if (findError || !exposant) {
      return res.status(404).json({ message: 'Badge Exposant non trouvé.' });
    }

    // 2. Vérifier que le visiteur existe
    const { data: visiteur, error: visiteurError } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email')
      .eq('id', visiteur_id)
      .single();
    
    if (visiteurError || !visiteur) {
      return res.status(404).json({ message: 'Visiteur non trouvé.' });
    }

    // 3. Enregistrer le lead dans la table scan_contacts
    const { error: insertError } = await supabase
      .from('scan_contacts')
      .insert({
        exposant_id: exposant.id,
        participant_id: visiteur_id,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ message: 'Ce contact a déjà été scanné pour ce stand.' });
      }
      throw insertError;
    }

    res.status(200).json({ 
      message: 'Contact enregistré pour le stand !',
      visiteur: `${visiteur.prenom} ${visiteur.nom}`
    })
  } catch (error) {
    console.error('Erreur API /scan-visiteur:', error)
    res.status(500).json({ message: "Erreur lors de l'enregistrement du contact" })
  }
} 