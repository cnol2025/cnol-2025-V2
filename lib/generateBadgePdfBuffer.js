const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');

const posterPath = path.join(process.cwd(), 'public', 'cnol2025-poster.jpg');
const logoPath = path.join(process.cwd(), 'public', 'logo-cnol.png');

async function generateBadgePdfBuffer(userData) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { name, function: userFunction, city, email, userId } = userData;

    // --- Quart haut gauche : logo + titre
    const logoImageBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
    const logoDims = logoImage.scale(0.2);

    page.drawImage(logoImage, {
      x: 20,
      y: 750,
      width: logoDims.width,
      height: logoDims.height,
    });

    page.drawText('Congrès National d’Optique Lunetterie', {
      x: 20,
      y: 740,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText('10 – 12 octobre 2025, Rabat – Fondation Mohammed VI', {
      x: 20,
      y: 720,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // --- Quart haut droit : affiche
    const posterImageBytes = fs.readFileSync(posterPath);
    const posterImage = await pdfDoc.embedJpg(posterImageBytes);
    const posterDims = posterImage.scale(0.21);

    page.drawImage(posterImage, {
      x: 300,
      y: 420,
      width: posterDims.width,
      height: posterDims.height,
    });

    // --- Infos personnelles
    const infoY = 100;
    page.drawText(`Nom : ${name}`, { x: 20, y: infoY + 580, size: 14, font: fontBold });
    page.drawText(`Fonction : ${userFunction}`, { x: 20, y: infoY + 560, size: 12, font: fontBold });
    page.drawText(`Ville : ${city}`, { x: 20, y: infoY + 540, size: 12, font: fontBold });
    page.drawText(`Email : ${email}`, { x: 20, y: infoY + 520, size: 12, font: fontBold });

    // --- QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(userId);
    const qrImageBytes = qrCodeDataUrl.split(',')[1];
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrImageBytes, 'base64'));

    page.drawImage(qrImage, {
      x: 200,
      y: infoY + 320,
      width: 100,
      height: 100,
    });

    // --- Conditions et conseils
    const boxX = 340;
    const boxY = 150;
    const lineHeight = 11;

    const conditions = [
      "Ce badge est personnel et non transférable.",
      "Toute reproduction est interdite.",
      "Il est obligatoire pour accéder à l'espace exposition et",
      "aux conférences générales.",
      "Ce badge ne donne pas accès aux ateliers ni aux masterclass.",
      "La participation à l'événement vaut autorisation de captation",
      "photo et vidéo pour la communication du CNOL.",
    ];

    const conseils = [
      "À plier en quatre selon les lignes indiquées.",
      "À conserver visible sur vous pendant l'événement.",
      "Présentez-le à l'entrée et aux contrôles.",
    ];

    page.drawText("Conditions d'utilisation", {
      x: boxX,
      y: boxY + (conditions.length + conseils.length) * lineHeight + 30,
      size: 10,
      font: fontBold,
    });

    conditions.forEach((line, i) => {
      page.drawText(line, {
        x: boxX,
        y: boxY + (conditions.length + conseils.length - 1 - i) * lineHeight + 10,
        size: 8,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
    });

    page.drawText("Conseils d'utilisation", {
      x: boxX,
      y: boxY + conseils.length * lineHeight,
      size: 10,
      font: fontBold,
    });

    conseils.forEach((line, i) => {
      page.drawText(line, {
        x: boxX,
        y: boxY + (conseils.length - 1 - i) * lineHeight - 10,
        size: 8,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
    });

    // --- Lignes de pliage
    page.drawLine({ 
      start: { x: 0, y: 421 }, 
      end: { x: 595, y: 421 }, 
      thickness: 0.5, 
      color: rgb(0.7, 0.7, 0.7) 
    });

    // Tu peux ajouter d'autres éléments graphiques ici si besoin

    // Retourne le buffer PDF
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (err) {
    console.error('Erreur génération badge PDF:', err);
    throw err;
  }
}

module.exports = generateBadgePdfBuffer;
