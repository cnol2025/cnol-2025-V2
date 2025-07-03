import sendBadgeEmail from '../../lib/sendBadgeEmail';
import { createClient } from '@supabase/supabase-js';
import generateBadgePdfBuffer from '../../lib/generateBadgePdfBuffer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  const { name, email, number, magasin, ville, type, id } = req.body;
  try {
    // Générer un code identifiant unique (ex: basé sur l'id ou email)
    const codeIdent = (id || email).slice(0, 8) + Math.floor(1000 + Math.random() * 9000);
    // Générer le badge PDF
    const pdfData = await generateBadgePdfBuffer({
      nom: name,
      email,
      telephone: number,
      magasin,
      ville,
      type,
      codeIdent,
    });
    // Contenu email spécifique
    const htmlBody = `
      <p>Bonjour <strong>${name}</strong>,</p>
      <p>Voici votre badge pour accéder au CNOL 2025 qui aura lieu les 10, 11 et 12 octobre 2025 au Centre de Conférences de la Fondation Mohamed VI, Rabat.</p>
      <p>Pour profiter de toutes les fonctionnalités, téléchargez l'application CNOL 2025 ici : <a href='#'>Lien à venir</a>.</p>
      <p>Pour accéder à votre espace, entrez votre email et ce code (également présent sur votre badge) : <b>${codeIdent}</b>.</p>
      <p>Merci d'imprimer ce badge et de le présenter à l'entrée.</p>
      <p>Pour toute question, contactez-nous à <a href="mailto:cnol.badge@gmail.com">cnol.badge@gmail.com</a>.</p>
      <br>
      <p>— L'équipe d'organisation du CNOL</p>
    `;
    // Envoi email
    await sendBadgeEmail(email, name, pdfData, codeIdent, htmlBody);
    // Ajout à la table principale ("inscription")
    await supabase.from('inscription').insert([
      {
        nom: name,
        email,
        telephone: number,
        magasin,
        ville,
        type,
        code_ident: codeIdent,
        source: 'bulk',
      },
    ]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur envoi badge bulk:', err);
    res.status(500).json({ error: err.message });
  }
} 