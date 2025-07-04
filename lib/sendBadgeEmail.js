const { sendMail } = require('./mailer');

async function sendBadgeEmail(to, fullName, pdfData, codeIdent) {
  const htmlBody = `
    <p>Bonjour <strong>${fullName}</strong>,</p>
    <p>Votre inscription au Congrès National d'Optique et de Lunetterie (CNOL 2025) a été validée avec succès.</p>
    <p>Vous trouverez en pièce jointe votre badge nominatif.</p>
    <p><strong>Merci d'imprimer ce badge en couleur et de l'apporter avec vous le jour de l'événement.</strong><br>Il vous sera demandé à l'entrée.</p>
    <p><strong>Votre code d'identification personnel :</strong><br><span style="font-size:1.2em; color:#d32f2f;">${codeIdent}</span></p>
    <p style="background:#f5f5f5; padding:10px; border-radius:5px;">Ce code d'identification vous sera demandé pour accéder à votre espace utilisateur en ligne, ainsi que pour certains services sur place.</p>
    <p>📍 Lieu : Centre de Conférences de la Fondation Mohamed VI, Rabat</p>
    <p>🗓️ Dates : 10, 11 et 12 octobre 2025</p>
    <br>
    <p>Merci de vérifier que toutes les informations sur votre badge sont correctes.<br>En cas d'erreur, contactez-nous rapidement à <a href="mailto:cnol.badge@gmail.com">cnol.badge@gmail.com</a>.</p>
    <br>
    <p>— L'équipe d'organisation du CNOL</p>
  `;

  const safeName = fullName
    .normalize('NFD') // décompose accents
    .replace(/[\u0300-\u036f]/g, '') // supprime accents
    .replace(/\s+/g, '-') // espaces -> tirets
    .replace(/[^a-zA-Z0-9\-]/g, '') // supprime tout caractère spécial

  const filename = `badge-cnol2025-${safeName.toLowerCase()}.pdf`;


  try {
    const info = await sendMail({
      to,
      subject: 'Votre badge CNOL 2025',
      html: htmlBody,
      attachments: [
        {
          filename,
          content: pdfData,
          contentType: 'application/pdf',
        },
      ],
    });

    console.log('✅ Email envoyé à', to);
  } catch (error) {
    console.error('❌ Erreur envoi email :', error);
  }
}

async function sendBulkEmail(to, fullName, codeIdent, htmlBody) {
  try {
    await sendMail({
      to,
      subject: 'Votre inscription CNOL 2025 est en cours de validation',
      html: htmlBody,
      // Pas de pièce jointe
    });
    console.log('✅ Email bulk envoyé à', to);
  } catch (error) {
    console.error('❌ Erreur envoi email bulk :', error);
  }
}

module.exports = { sendBadgeEmail, sendBulkEmail };
