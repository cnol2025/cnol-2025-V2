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
    // Mettre la première lettre de chaque mot du nom en majuscule
    function toTitleCase(str) {
      return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    const nameTitle = toTitleCase(name);
    function generateBadgeCode() {
      const digits = Math.floor(100 + Math.random() * 900); // 3 chiffres
      const letters = Array(3).fill(0).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
      return `${digits}${letters}`;
    }
    // Générer un code identifiant au bon format
    const codeIdent = generateBadgeCode();
    // Générer le badge PDF
    const pdfData = await generateBadgePdfBuffer({
      name: nameTitle,
      function: type,
      city: ville,
      email,
      userId: codeIdent,
      identifiant_badge: codeIdent,
    });
    // Utiliser le template d'email officiel
    await sendBadgeEmail(email, nameTitle, pdfData, codeIdent);
    // Ajout à la table principale ("inscription")
    await supabase.from('inscription').insert([
      {
        nom: nameTitle,
        prenom: '',
        participant_type: type,
        sponsoring_level: null,
        fonction: type,
        organisation: magasin,
        email,
        telephone: number,
        ville,
        identifiant_badge: codeIdent,
        valide: false,
        scanned: false,
        created_at: new Date().toISOString(),
        source: 'bulk',
      },
    ]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur envoi badge bulk:', err);
    res.status(500).json({ error: err.message });
  }
} 