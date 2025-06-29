import { supabase } from '../../lib/supabaseClient';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'ID de l\'exposant requis' });
  }

  try {
    // Récupérer les données de l'exposant
    const { data: exposant, error: exposantError } = await supabase
      .from('exposants')
      .select('*')
      .eq('id', id)
      .single();

    if (exposantError || !exposant) {
      return res.status(404).json({ message: 'Exposant non trouvé' });
    }

    // Créer le PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Configuration de la réponse HTTP
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fiche-exposant-${exposant.nom.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`);

    // Pipe le PDF vers la réponse
    doc.pipe(res);

    // Logo CNOL centré en haut
    const fs = require('fs');
    const path = require('path');
    const cnolLogoPath = path.join(process.cwd(), 'public', 'logo-cnol.png');
    const cnolLogoBuffer = fs.readFileSync(cnolLogoPath);
    const pageWidth = doc.page.width;
    doc.image(cnolLogoBuffer, pageWidth / 2 - 75, 40, { width: 150 });
    // Titre centré
    doc.fontSize(24)
      .font('Helvetica-Bold')
      .text('CNOL 2025 - Fiche Exposant', 0, 110, { align: 'center' });
    // Logo exposant centré sous le titre ou espace réservé
    let exposantLogoBuffer = null;
    if (exposant.logo_url) {
      try {
        if (exposant.logo_url.startsWith('http')) {
          const response = await fetch(exposant.logo_url);
          exposantLogoBuffer = Buffer.from(await response.arrayBuffer());
        } else {
          const exposantLogoPath = path.join(process.cwd(), 'public', exposant.logo_url.replace(/^\//, ''));
          exposantLogoBuffer = fs.readFileSync(exposantLogoPath);
        }
      } catch (e) {
        exposantLogoBuffer = null;
      }
    }
    if (exposantLogoBuffer) {
      doc.image(exposantLogoBuffer, pageWidth / 2 - 60, 150, { width: 120 });
    } else {
      // Espace réservé pour le logo exposant
      doc.rect(pageWidth / 2 - 60, 150, 120, 60).stroke();
      doc.fontSize(10).font('Helvetica-Oblique').text('Logo exposant', pageWidth / 2 - 60, 180, { width: 120, align: 'center' });
    }
    // Nom exposant centré
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .text(exposant.nom, 0, 220, { align: 'center' });
    // Décale le curseur pour le reste du contenu
    doc.y = 260;

    // Informations principales (marge à gauche réduite)
    const contentX = 70;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Informations générales', contentX, doc.y)
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Type de produits : ${exposant.type_produits || 'Non spécifié'}`, contentX)
       .moveDown(0.3);

    if (exposant.qualite_sponsoring) {
      doc.text(`Sponsoring : ${exposant.qualite_sponsoring}`, contentX)
         .moveDown(0.3);
    }

    // Marques
    if (exposant.marques && exposant.marques.length > 0) {
      doc.moveDown(0.5)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('Marques représentées', contentX)
         .moveDown(0.5);

      doc.fontSize(12)
         .font('Helvetica');
      exposant.marques.forEach(marque => {
        doc.text(`• ${marque}`, contentX)
           .moveDown(0.2);
      });
    }

    // Responsables
    if (exposant.responsables && exposant.responsables.length > 0) {
      doc.moveDown(0.5)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('Responsables', contentX)
         .moveDown(0.5);

      doc.fontSize(12)
         .font('Helvetica');
      exposant.responsables.forEach(resp => {
        doc.text(`${resp.fonction || 'Responsable'} : ${resp.prenom} ${resp.nom}`, contentX)
           .moveDown(0.2);
        if (resp.telephones && resp.telephones.length > 0) {
          doc.text(`Téléphones : ${resp.telephones.join(', ')}`, contentX)
             .moveDown(0.2);
        }
        if (resp.emails && resp.emails.length > 0) {
          doc.text(`Emails : ${resp.emails.join(', ')}`, contentX)
             .moveDown(0.2);
        }
        doc.moveDown(0.3);
      });
    }

    // Coordonnées
    doc.moveDown(0.5)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Coordonnées', contentX)
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica');
    if (exposant.telephones && exposant.telephones.length > 0) {
      doc.text(`Téléphones : ${exposant.telephones.join(', ')}`, contentX)
         .moveDown(0.3);
    }
    if (exposant.emails && exposant.emails.length > 0) {
      doc.text(`Emails : ${exposant.emails.join(', ')}`, contentX)
         .moveDown(0.3);
    }
    if (exposant.adresses && exposant.adresses.length > 0) {
      doc.text('Adresses :', contentX)
         .moveDown(0.2);
      exposant.adresses.forEach(adresse => {
        doc.text(`• ${adresse}`, contentX)
           .moveDown(0.2);
      });
    }

    // Site web et réseaux sociaux
    if (exposant.site_web || exposant.facebook || exposant.instagram || exposant.linkedin || exposant.twitter) {
      doc.moveDown(0.5)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('Présence en ligne', contentX)
         .moveDown(0.5);

      doc.fontSize(12)
         .font('Helvetica');
      if (exposant.site_web) {
        doc.text(`Site web : ${exposant.site_web}`, contentX)
           .moveDown(0.3);
      }
      if (exposant.facebook) {
        doc.text(`Facebook : ${exposant.facebook}`, contentX)
           .moveDown(0.3);
      }
      if (exposant.instagram) {
        doc.text(`Instagram : ${exposant.instagram}`, contentX)
           .moveDown(0.3);
      }
      if (exposant.linkedin) {
        doc.text(`LinkedIn : ${exposant.linkedin}`, contentX)
           .moveDown(0.3);
      }
      if (exposant.twitter) {
        doc.text(`Twitter : ${exposant.twitter}`, contentX)
           .moveDown(0.3);
      }
    }

    // Pied de page
    doc.moveDown(2)
       .fontSize(10)
       .font('Helvetica')
       .text('Document généré automatiquement par CNOL 2025', { align: 'center' });

    // Finaliser le PDF
    doc.end();

  } catch (error) {
    console.error('Erreur génération fiche exposant:', error);
    res.status(500).json({ message: 'Erreur lors de la génération de la fiche exposant' });
  }
} 