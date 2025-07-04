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
    function generateBadgeCode() {
      const digits = Math.floor(1000 + Math.random() * 9000); // 4 chiffres
      const letters = Array(4).fill(0).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
      return `${digits}${letters}`;
    }
    // Générer un code identifiant au bon format
    const codeIdent = generateBadgeCode();
    // Générer le badge PDF
    const pdfData = await generateBadgePdfBuffer({
      name,
      function: type,
      city: ville,
      email,
      userId: codeIdent,
      identifiant_badge: codeIdent,
    });
    // Utiliser le template d'email officiel
    await sendBadgeEmail(email, name, pdfData, codeIdent);
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