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
    // Générer le code d'identification
    function generateBadgeCode() {
      const digits = Math.floor(100 + Math.random() * 900); // 3 chiffres
      const letters = Array(3).fill(0).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
      return `${digits}${letters}`;
    }
    const codeIdent = generateBadgeCode();
    // Mettre la première lettre de chaque mot du nom en majuscule
    function toTitleCase(str) {
      return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    const nameTitle = toTitleCase(name);
    // Contenu email validé (sans badge)
    const htmlBody = `
      <p>Bonjour <strong>${nameTitle}</strong>,</p>
      <p>Votre inscription au Congrès National d'Optique et de Lunetterie (CNOL 2025) a bien été prise en compte et est actuellement en cours de validation.</p>
      <p><b>Identifiants d'accès à l'application CNOL 2025 :</b><br>
      Email : <b>${email}</b><br>
      Code d'identification : <b>${codeIdent}</b></p>
      <p>Pour profiter de toutes les fonctionnalités (programme, notifications, espace personnel…), téléchargez l'application CNOL 2025 ici :<br>
      <a href="https://www.app.cnol.ma">https://www.app.cnol.ma</a></p>
      <p><b>Votre badge nominatif vous sera envoyé par email dès que votre inscription aura été validée</b> (généralement sous quelques minutes).</p>
      <p>Pour toute question, contactez-nous à <a href="mailto:cnol.badge@gmail.com">cnol.badge@gmail.com</a>.</p>
      <br>
      <p>Au plaisir de vous accueillir au CNOL 2025,<br>L'équipe d'organisation du CNOL</p>
    `;
    // Vérifier si l'email existe déjà
    const { data: existing } = await supabase
      .from('inscription')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: "Une inscription avec cet email existe déjà." });
    }

    // Insertion dans la table principale (structure officielle)
    const { data: inserted, error } = await supabase.from('inscription').insert([
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
      },
    ]);
    if (error) {
      console.error('Erreur insertion bulk:', error);
      return res.status(500).json({ error: error.message });
    }

    // Envoi email sans badge
    await sendBadgeEmail(email, nameTitle, null, codeIdent, htmlBody);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur envoi badge bulk:', err);
    res.status(500).json({ error: err.message });
  }
} 