const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');

// URLs absolues des images (fonctionne en local et sur Vercel)
const posterUrl = 'https://cnol-app-2025.vercel.app/cnol2025-poster.jpg';
const logoUrl = 'https://cnol-app-2025.vercel.app/logo-cnol.png';

// Fonction utilitaire pour charger une image depuis une URL
const fetchImageAsBytes = async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
};

// Fonction principale
async function generateBadge(userData) {
    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4

        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const { name, function: userFunction, city, email, userId } = userData;

        // Logo CNOL
        const logoImageBytes = await fetchImageAsBytes(logoUrl);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        const logoDims = logoImage.scale(0.2);
        page.drawImage(logoImage, { x: 20, y: 750, width: logoDims.width, height: logoDims.height });

        // Titre + date/lieu
        page.drawText("Congrès National d'Optique Lunetterie", {
            x: 20, y: 740, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1),
        });
        page.drawText('10 – 12 octobre 2025, Rabat – Fondation Mohammed VI', {
            x: 20, y: 720, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2),
        });

        // Affiche CNOL
        const posterImageBytes = await fetchImageAsBytes(posterUrl);
        const posterImage = await pdfDoc.embedJpg(posterImageBytes);
        const posterDims = posterImage.scale(0.21);
        page.drawImage(posterImage, {
            x: 300, y: 420, width: posterDims.width, height: posterDims.height,
        });

        // Infos personnelles
        const infoY = 100;
        page.drawText(`Nom : ${name}`, { x: 20, y: infoY + 580, size: 14, font: fontBold, color: rgb(0, 0, 0) });
        page.drawText(`Fonction : ${userFunction}`, { x: 20, y: infoY + 560, size: 12, font: fontBold, color: rgb(0, 0, 0) });
        page.drawText(`Ville : ${city}`, { x: 20, y: infoY + 540, size: 12, font: fontBold, color: rgb(0, 0, 0) });
        page.drawText(`Email : ${email}`, { x: 20, y: infoY + 520, size: 12, font: fontBold, color: rgb(0, 0, 0) });

        // Affichage du code d'identification à gauche du QR code, même niveau
        if (userData.identifiant_badge) {
            // Encadré
            page.drawRectangle({
                x: 20, y: infoY + 370, width: 120, height: 40, borderColor: rgb(0, 0, 0), borderWidth: 1.5, color: rgb(1,1,1)
            });
            // Texte centré dans l'encadré
            const label = "Numéro d'identification";
            const labelWidth = fontBold.widthOfTextAtSize(label, 10);
            page.drawText(label, {
                x: 20 + (120 - labelWidth) / 2,
                y: infoY + 390,
                size: 10,
                font: fontBold,
                color: rgb(0, 0, 0),
            });
            // Numéro centré en dessous
            const code = userData.identifiant_badge;
            const codeWidth = fontBold.widthOfTextAtSize(code, 18);
            page.drawText(code, {
                x: 20 + (120 - codeWidth) / 2,
                y: infoY + 375,
                size: 18,
                font: fontBold,
                color: rgb(0, 0, 0),
            });
        }

        // QR Code
        const qrCodeDataUrl = await QRCode.toDataURL(userId);
        const qrImageBytes = qrCodeDataUrl.split(',')[1];
        const qrImage = await pdfDoc.embedPng(Buffer.from(qrImageBytes, 'base64'));
        page.drawImage(qrImage, {
            x: 200, y: infoY + 320, width: 100, height: 100,
        });

        // --- Conseils et conditions (gauche/droite)
        const boxY = 150;
        const lineHeight = 11;
        // Titres parfaitement alignés
        const conseilsY = boxY + 50;
        const conditionsY = boxY + 50;
        // Conseils à gauche
        page.drawText("Conseils d'utilisation", {
            x: 20,
            y: conseilsY,
            size: 10,
            font: fontBold,
            color: rgb(0, 0, 0),
        });
        const conseils = [
            "À plier en quatre selon les lignes indiquées.",
            "À conserver visible sur vous pendant l'événement.",
            "Présentez-le à l'entrée et aux contrôles.",
        ];
        conseils.forEach((line, i) => {
            page.drawText(line, {
                x: 20,
                y: conseilsY - (i + 1) * lineHeight,
                size: 8,
                font: fontRegular,
                color: rgb(0.2, 0.2, 0.2),
            });
        });
        // Conditions à droite
        page.drawText("Conditions d'utilisation", {
            x: 340,
            y: conditionsY,
            size: 10,
            font: fontBold,
            color: rgb(0, 0, 0),
        });
        const conditions = [
            "Ce badge est personnel et non transférable.",
            "Toute reproduction est interdite.",
            "Il est obligatoire pour accéder à l'espace exposition et",
            "aux conférences générales.",
            "Ce badge ne donne pas accès aux ateliers ni aux masterclass.",
            "La participation à l'événement vaut autorisation de captation",
            "photo et vidéo pour la communication du CNOL.",
        ];
        conditions.forEach((line, i) => {
            page.drawText(line, {
                x: 340,
                y: conditionsY - (i + 1) * lineHeight,
                size: 8,
                font: fontRegular,
                color: rgb(0.2, 0.2, 0.2),
            });
        });

        // Lignes de pliage
        page.drawLine({ start: { x: 0, y: 421 }, end: { x: 595, y: 421 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
        page.drawLine({ start: { x: 297.5, y: 0 }, end: { x: 297.5, y: 842 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });

        const pdfBytes = await pdfDoc.save();

        console.log(`✅ Badge généré en mémoire pour ${userId} (${name})`);

        return pdfBytes;

    } catch (error) {
        console.error("❌ Erreur lors de la génération du badge :", error);
        throw error;
    }
}

module.exports = { generateBadge };
