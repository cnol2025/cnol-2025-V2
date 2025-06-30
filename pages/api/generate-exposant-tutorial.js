import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="tutoriel-espace-exposant-cnol.pdf"');
  doc.pipe(res);

  // Logo CNOL centré en haut
  const logoPath = path.join(process.cwd(), 'public', 'logo-cnol.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.page.width / 2 - 50, 30, { width: 100 });
    doc.moveDown(3);
  }

  // Titre principal
  doc.fontSize(20).font('Helvetica-Bold').text('🎓 Tutoriel Exposant – Page "Mon Stand" / "Espace Exposant"', { align: 'center' });
  doc.moveDown(1.5);

  // 1. Création et accès à votre profil exposant
  doc.fontSize(15).font('Helvetica-Bold').text('1. Création et accès à votre profil exposant');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').list([
    'Votre profil exposant est créé par l\'administrateur CNOL à partir des informations fournies lors de l\'inscription.',
    'L\'accès à la page d\'administration de votre stand est envoyé à la personne désignée par votre société (souvent le responsable principal ou le contact référent).',
    'Ce contact reçoit un email avec les instructions de connexion et de gestion de l\'espace exposant.'
  ]);
  doc.moveDown(1);

  // 2. Personnalisation de votre fiche exposant
  doc.fontSize(15).font('Helvetica-Bold').text('2. Personnalisation de votre fiche exposant');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').list([
    'Logo : Ajoutez ou modifiez le logo de votre société.',
    'Type de produits : Précisez les produits ou services proposés.',
    'Marques : Ajoutez les marques ou produits que vous représentez.',
    'Responsables : Ajoutez les personnes de contact (nom, fonction, téléphone, email).',
    'Coordonnées : Vérifiez et complétez vos téléphones, emails, adresses.',
    'Site web & réseaux sociaux : Ajoutez vos liens pour plus de visibilité.'
  ]);
  doc.moveDown(1);

  // 3. Gestion de l\'équipe (staff)
  doc.fontSize(15).font('Helvetica-Bold').text('3. Gestion de l\'équipe (staff)');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').list([
    'Ajoutez des membres de votre équipe (nom, prénom, email, fonction).',
    'Chaque staff reçoit un badge nominatif par email.',
    'Vous pouvez télécharger les badges PDF pour impression.'
  ]);
  doc.moveDown(1);

  // 4. Gestion des visiteurs et contacts
  doc.fontSize(15).font('Helvetica-Bold').text('4. Gestion des visiteurs et contacts');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').list([
    'Contacts scannés : Retrouvez la liste des visiteurs que vous (ou votre staff) avez scannés sur votre stand.',
    'Visiteurs ayant scanné votre stand : Consultez qui s\'est intéressé à votre stand.',
    'Export CSV : Téléchargez la liste de vos contacts/visiteurs pour un suivi après salon.'
  ]);
  doc.moveDown(1);

  // 5. Fiche exposant PDF
  doc.fontSize(15).font('Helvetica-Bold').text('5. Fiche exposant PDF');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').list([
    'Chaque visiteur ayant scanné le QR code de votre stand peut télécharger votre fiche exposant au format PDF (avec logo, infos, contacts, etc.).',
    'Vous pouvez aussi télécharger ce document pour le partager à vos prospects et partenaires.'
  ]);
  doc.moveDown(1);

  // 6. Notifications
  doc.fontSize(15).font('Helvetica-Bold').text('6. Notifications');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').list([
    'Envoyez des notifications push à vos visiteurs (dans la limite de votre quota selon votre sponsoring).',
    'Suivez le quota restant et l\'historique des notifications envoyées.'
  ]);
  doc.moveDown(1);

  // 7. Conseils pratiques
  doc.fontSize(15).font('Helvetica-Bold').text('7. Conseils pratiques');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').list([
    'Mettez à jour régulièrement vos informations pour maximiser votre visibilité.',
    'Utilisez le scan QR code pour collecter facilement les contacts des visiteurs.',
    'Respectez le quota de notifications pour ne pas saturer vos visiteurs.'
  ]);
  doc.moveDown(1);

  // 8. Support
  doc.fontSize(15).font('Helvetica-Bold').text('8. Support');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text('En cas de problème, contactez l\'équipe CNOL via le support intégré ou par email.');
  doc.moveDown(1);

  // Astuce
  doc.fontSize(13).font('Helvetica-Oblique').text('Astuce : Plus votre fiche est complète et à jour, plus vous attirez de visiteurs et de contacts qualifiés !', { align: 'center' });

  doc.end();
} 