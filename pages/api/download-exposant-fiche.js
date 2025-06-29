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

    // Logo CNOL en haut à gauche
    const fs = require('fs');
    const path = require('path');
    const cnolLogoPath = path.join(process.cwd(), 'public', 'logo-cnol.png');
    const cnolLogoBuffer = fs.readFileSync(cnolLogoPath);
    doc.image(cnolLogoBuffer, 60, 30, { height: 60 });
    // Titre centré
    doc.fontSize(24)
      .font('Helvetica-Bold')
      .text('CNOL 2025 - Fiche Exposant', 0, 40, { align: 'center' })
      .moveDown(1.5);
    // Logo exposant centré sous le titre
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
      const pageWidth = doc.page.width;
      doc.image(exposantLogoBuffer, pageWidth / 2 - 60, 100, { width: 120 });
      doc.moveDown(2);
    } else {
      doc.moveDown(2);
    }
    // Nom exposant centré
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .text(exposant.nom, { align: 'center' })
      .moveDown(1);

    // Informations principales
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Informations générales')
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Type de produits : ${exposant.type_produits || 'Non spécifié'}`)
       .moveDown(0.3);

    if (exposant.qualite_sponsoring) {
      doc.text(`Sponsoring : ${exposant.qualite_sponsoring}`)
         .moveDown(0.3);
    }

    // Marques
    if (exposant.marques && exposant.marques.length > 0) {
      doc.moveDown(0.5)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('Marques représentées')
         .moveDown(0.5);

      doc.fontSize(12)
         .font('Helvetica');
      
      exposant.marques.forEach(marque => {
        doc.text(`• ${marque}`)
           .moveDown(0.2);
      });
    }

    // Responsables
    if (exposant.responsables && exposant.responsables.length > 0) {
      doc.moveDown(0.5)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('Responsables')
         .moveDown(0.5);

      doc.fontSize(12)
         .font('Helvetica');
      
      exposant.responsables.forEach(resp => {
        doc.text(`${resp.fonction || 'Responsable'} : ${resp.prenom} ${resp.nom}`)
           .moveDown(0.2);
        
        if (resp.telephones && resp.telephones.length > 0) {
          doc.text(`Téléphones : ${resp.telephones.join(', ')}`)
             .moveDown(0.2);
        }
        
        if (resp.emails && resp.emails.length > 0) {
          doc.text(`Emails : ${resp.emails.join(', ')}`)
             .moveDown(0.2);
        }
        
        doc.moveDown(0.3);
      });
    }

    // Coordonnées
    doc.moveDown(0.5)
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Coordonnées')
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica');

    if (exposant.telephones && exposant.telephones.length > 0) {
      doc.text(`Téléphones : ${exposant.telephones.join(', ')}`)
         .moveDown(0.3);
    }

    if (exposant.emails && exposant.emails.length > 0) {
      doc.text(`Emails : ${exposant.emails.join(', ')}`)
         .moveDown(0.3);
    }

    if (exposant.adresses && exposant.adresses.length > 0) {
      doc.text('Adresses :')
         .moveDown(0.2);
      exposant.adresses.forEach(adresse => {
        doc.text(`• ${adresse}`)
           .moveDown(0.2);
      });
    }

    // Site web et réseaux sociaux
    if (exposant.site_web || exposant.facebook || exposant.instagram || exposant.linkedin || exposant.twitter) {
      doc.moveDown(0.5)
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('Présence en ligne')
         .moveDown(0.5);

      doc.fontSize(12)
         .font('Helvetica');

      if (exposant.site_web) {
        doc.text(`Site web : ${exposant.site_web}`)
           .moveDown(0.3);
      }

      if (exposant.facebook) {
        doc.text(`Facebook : ${exposant.facebook}`)
           .moveDown(0.3);
      }

      if (exposant.instagram) {
        doc.text(`Instagram : ${exposant.instagram}`)
           .moveDown(0.3);
      }

      if (exposant.linkedin) {
        doc.text(`LinkedIn : ${exposant.linkedin}`)
           .moveDown(0.3);
      }

      if (exposant.twitter) {
        doc.text(`Twitter : ${exposant.twitter}`)
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