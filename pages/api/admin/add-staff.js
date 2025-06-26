import { supabase } from '../../../lib/supabaseClient';
import sendBadgeEmail from '../../../lib/sendBadgeEmail';
import generateBadgePdfBuffer from '../../../lib/generateBadgePdfBuffer';

function generateStaffBadgeCode() {
  const chiffres = Math.floor(1000 + Math.random() * 9000); // 4 chiffres
  const lettres = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 lettres
  return `${chiffres}${lettres}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const { nom, prenom, email, telephone, fonction, exposant_id, organisation } = req.body;
  if (!nom || !prenom || !email || !fonction || !exposant_id || !organisation) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  // Générer un identifiant badge unique (4 chiffres + 4 lettres, sans préfixe)
  const badgeCode = generateStaffBadgeCode();

  // 1. Ajout dans la base
  const { data, error } = await supabase.from('inscription').insert({
    nom,
    prenom,
    email,
    telephone,
    participant_type: 'staff',
    organisation,
    exposant_id,
    identifiant_badge: badgeCode,
    valide: true,
    created_at: new Date().toISOString(),
    fonction,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // 2. Générer le PDF du badge
  let pdfBuffer;
  try {
    pdfBuffer = await generateBadgePdfBuffer({
      name: `${prenom} ${nom}`,
      function: fonction,
      city: '', // Ajoute la ville si tu l'as
      email,
      userId: badgeCode,
    });
  } catch (err) {
    return res.status(500).json({ error: "Erreur lors de la génération du badge PDF : " + err.message });
  }

  // 3. Envoi du badge par email
  try {
    await sendBadgeEmail(
      email,
      `${prenom} ${nom}`,
      pdfBuffer,
      badgeCode
    );
  } catch (err) {
    return res.status(500).json({ error: "Erreur lors de l'envoi de l'email : " + err.message });
  }

  return res.status(200).json({ success: true, badgeCode });
} 