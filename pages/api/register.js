import { supabase } from '../../lib/supabaseClient'
import { sendMail } from '../../lib/mailer'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' })
  }

  const user = req.body

  // Log du payload reçu
  console.log('Payload reçu dans /register:', user)

  // Validation côté backend
  if (!user.email || !user.telephone) {
    return res.status(400).json({ message: "L'email et le téléphone sont obligatoires." })
  }

  try {
    // Vérifier si une inscription existe déjà avec cet email
    const { data: existing, error: existingError } = await supabase
      .from('inscription')
      .select('id, email, valide')
      .eq('email', user.email)
      .single();
    if (existing) {
      return res.status(409).json({ message: "Une inscription avec cet email existe déjà. Merci de patienter la validation ou de vérifier vos emails." });
    }

    // Liste des champs autorisés (ceux de la table inscription)
    const allowedFields = ['email', 'telephone', 'nom', 'prenom', 'fonction', 'ville', 'identifiant_badge'];
    const userToInsert = {};
    for (const field of allowedFields) {
      if (user[field]) userToInsert[field] = user[field];
    }

    // Génération d'un code badge unique (3 chiffres + 3 lettres)
    function generateBadgeCode() {
      const digits = Math.floor(100 + Math.random() * 900); // 3 chiffres
      const letters = Array(3)
        .fill(0)
        .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
        .join('');
      return `${digits}${letters}`;
    }

    // Générer un code badge unique et vérifier unicité
    let badgeCode;
    let isUnique = false;
    while (!isUnique) {
      badgeCode = generateBadgeCode();
      const { data: exists } = await supabase
        .from('inscription')
        .select('id')
        .eq('identifiant_badge', badgeCode)
        .single();
      if (!exists) isUnique = true;
    }
    userToInsert.identifiant_badge = badgeCode;

    // Insert dans Supabase sans les champs parasites
    const { error } = await supabase.from('inscription').insert([userToInsert]);
    if (error) throw error

    // Envoi email à l'utilisateur
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    await sendMail({
      to: user.email,
      subject: "Confirmation de votre inscription au CNOL 2025",
      text: `Bonjour ${user.prenom},\n\nNous avons bien reçu votre demande d'inscription au Congrès National d'Optique et de Lunetterie (CNOL 2025).\n\nVotre inscription est en cours de traitement.\nVous recevrez un nouvel email dès que votre inscription aura été validée par notre équipe.\n\nMerci de votre confiance et à très bientôt !\n\nL'équipe d'organisation du CNOL`,
      html: `<div style="font-family: Arial, sans-serif; color: #333; line-height:1.6; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:8px;">
        <h2 style="color: #0070f3;">Bonjour ${user.prenom},</h2>
        <p>Nous avons bien reçu votre demande d'inscription au <strong>CNOL 2025</strong>.</p>
        <p>Votre inscription est en cours de traitement.<br>Vous recevrez un nouvel email dès que votre inscription aura été validée par notre équipe.</p>
        <p>Merci de votre confiance et à très bientôt !</p>
        <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />
        <p style="font-size: 0.9em; color: #666;">
          Pour toute question, contactez-nous à <a href="mailto:cnol.badge@gmail.com">cnol.badge@gmail.com</a><br />
          &copy; 2025 CNOL. Tous droits réservés.
        </p>
      </div>`
    })

    // Envoi WhatsApp "en cours de validation" via Wasender
    try {
      const whatsappText = `Bonjour ${user.prenom} ${user.nom},\n\nVotre inscription au CNOL 2025 est en cours de validation.\nVous recevrez un message dès qu'elle sera confirmée.\nMerci de votre confiance !`;
      await fetch('https://wasenderapi.com/api/send-message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WASENDER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: user.telephone,
          text: whatsappText
        })
      });
    } catch (e) {
      console.error('Erreur envoi WhatsApp inscription en cours de validation:', e);
    }

    // Envoi email à l'organisateur
    await sendMail({
      to: 'cnol.badge@gmail.com',
      subject: `📥 Nouvelle inscription - ${user.prenom} ${user.nom}`,
      text: `Nouvelle inscription reçue :\n\nNom : ${user.nom}\nPrénom : ${user.prenom}\nEmail : ${user.email}\nTéléphone : ${user.telephone}\nFonction : ${user.fonction}\nVille : ${user.ville}\nDate : ${new Date().toLocaleString()}`,
      html: `<div style="font-family: Arial, sans-serif; color: #333; max-width:600px; margin:auto; padding:25px; border:1px solid #ddd; border-radius:10px; background:#ffffff;">
        <h2 style="color:#0070f3;">📥 Nouvelle inscription reçue</h2>
        <table style="width:100%; border-collapse:collapse; margin-top:15px;">
          <tr><td style="padding:8px; font-weight:bold;">Nom :</td><td style="padding:8px;">${user.nom}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Prénom :</td><td style="padding:8px;">${user.prenom}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Email :</td><td style="padding:8px;">${user.email}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Téléphone :</td><td style="padding:8px;">${user.telephone}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Fonction :</td><td style="padding:8px;">${user.fonction}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Ville :</td><td style="padding:8px;">${user.ville}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Date :</td><td style="padding:8px;">${new Date().toLocaleString()}</td></tr>
        </table>
      </div>`
    })

    // Envoi notification push (et insertion en base)
    // Chercher l'utilisateur nouvellement inscrit pour récupérer son id
    const { data: inscrit } = await supabase
      .from('inscription')
      .select('id, email')
      .eq('email', user.email)
      .single();
    if (inscrit && inscrit.id) {
      // Insérer la notification en base
      await supabase.from('notifications').insert({
        user_id: inscrit.id,
        title: 'Inscription CNOL 2025',
        body: "Merci pour votre inscription au CNOL 2025 ! Vous recevrez un email de confirmation.",
        url: null
      });
      // Appeler l'API push/send
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: inscrit.id,
            title: 'Inscription CNOL 2025',
            body: "Merci pour votre inscription au CNOL 2025 ! Vous recevrez un email de confirmation.",
            url: null
          })
        });
      } catch (e) {
        console.error('Erreur envoi notification push:', e);
      }
    }

    res.status(200).json({ message: 'Inscription enregistrée et emails envoyés' })
  } catch (err) {
    console.error('Erreur API /register:', err)
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' })
  }
}
