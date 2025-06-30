import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  // Créer le PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="tutoriel-espace-exposant-cnol.pdf"');
  doc.pipe(res);

  // Titre
  doc.fontSize(22).font('Helvetica-Bold').text('🏢 Espace Exposant – CNOL', { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(12).font('Helvetica').text(
    "L'espace exposant est un tableau de bord dédié à chaque société exposante, accessible uniquement par la personne désignée (responsable du stand). Il permet de gérer toutes les informations, l'équipe, les contacts et la visibilité de votre stand pendant le congrès.",
    { align: 'left' }
  );
  doc.moveDown(1);

  doc.fontSize(16).font('Helvetica-Bold').text('Fonctionnalités principales :');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').list([
    'Personnalisation de la fiche exposant',
    'Gestion de l\'équipe (staff)',
    'Gestion des visiteurs et contacts',
    'Notifications',
    'Fiche exposant PDF',
    'Suivi et statistiques'
  ]);
  doc.moveDown(1);

  doc.fontSize(16).font('Helvetica-Bold').text('Accès à l\'espace exposant');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text(
    "- L'espace exposant est créé par l'administrateur CNOL.\n- L'accès est envoyé à la personne désignée par votre société.\n- Ce contact reçoit un email avec les instructions de connexion."
  );
  doc.moveDown(1);

  doc.fontSize(16).font('Helvetica-Bold').text('Conseils pour bien utiliser l\'espace exposant');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').list([
    'Complétez et mettez à jour votre fiche.',
    'Ajoutez tous les membres de votre équipe.',
    'Utilisez le scan QR code pour collecter les contacts.',
    'Respectez le quota de notifications.'
  ]);
  doc.moveDown(1);

  doc.fontSize(16).font('Helvetica-Bold').text('Support');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text(
    "En cas de problème, contactez l'équipe CNOL via le support intégré ou par email."
  );
  doc.moveDown(1);

  doc.fontSize(14).font('Helvetica-Oblique').text(
    "Astuce : Un espace exposant bien rempli et à jour attire plus de visiteurs et facilite le suivi après l'événement !",
    { align: 'center' }
  );

  doc.end();
} 