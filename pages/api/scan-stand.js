import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }
  const { visiteur_id, stand_id } = req.body;
  if (!visiteur_id || !stand_id) {
    return res.status(400).json({ message: 'visiteur_id et stand_id requis' });
  }

  try {
    const { data: stand, error: standError } = await supabase
      .from('exposants')
      .select('id, nom, publie')
      .eq('id', stand_id)
      .single();
    if (standError || !stand) {
      return res.status(404).json({ message: 'Stand non trouvé.' });
    }
    if (!stand.publie) {
      return res.status(403).json({ message: 'Ce stand n\\'est pas encore publié.' });
    }
    const { data: visiteur, error: visiteurError } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email')
      .eq('id', visiteur_id)
      .single();
    if (visiteurError || !visiteur) {
      return res.status(404).json({ message: 'Visiteur non trouvé.' });
    }
    const { error: insertError } = await supabase
      .from('scan_contacts')
      .insert({
        exposant_id: stand_id,
        participant_id: visiteur_id,
      });
    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ message: 'Ce contact a déjà été enregistré pour ce stand.' });
      }
      throw insertError;
    }
    res.status(200).json({ 
      message: 'Contact enregistré pour le stand !',
      stand: stand.nom,
      visiteur: `${visiteur.prenom} ${visiteur.nom}`
    })
  } catch (error) {
    console.error('Erreur API /scan-stand:', error)
    res.status(500).json({ message: \"Erreur lors de l'enregistrement du contact\" })
  }
} 
