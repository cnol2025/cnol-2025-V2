import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const logoUrl = 'https://cnol-badge.vercel.app/logo-cnol.png';

const fetchImageAsBytes = async (url) => {
    // Si on est côté serveur Node.js, on lit le fichier localement
    if (url.startsWith('/')) {
        const logoPath = path.join(process.cwd(), 'public', url.replace(/^\//, ''));
        return fs.readFileSync(logoPath);
    } else {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
        const buffer = await res.arrayBuffer();
        return new Uint8Array(buffer);
    }
};

export async function generateTicket({
    nom,
    prenom,
    email,
    eventType, // 'Atelier' ou 'Masterclass'
    eventTitle,
    eventDate,
    reservationId,
    salle, // on prévoit ce champ, il sera passé depuis l'appel
    intervenant
}) {
    try {
        if (!reservationId) {
            console.error('generateTicket: reservationId manquant ou invalide', reservationId);
            throw new Error('reservationId manquant pour la génération du QR code');
        }
        // Format vertical smartphone
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([320, 540]);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Logo CNOL centré en haut, taille réduite et marge
        const logoImageBytes = await fetchImageAsBytes('/logo-cnol.png');
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        const logoDims = logoImage.scale(0.12);
        page.drawImage(logoImage, { x: (320-logoDims.width)/2, y: 480, width: logoDims.width, height: logoDims.height });

        // Titre et infos centrés
        page.drawText(`Ticket ${eventType}`, { x: 40, y: 440, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        page.drawText(eventTitle, { x: 40, y: 420, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        if (intervenant) {
            page.drawText(`Intervenant : ${intervenant}`, { x: 40, y: 407, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
        }
        page.drawText(new Date(eventDate).toLocaleString(), { x: 40, y: 395, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
        if (salle) {
            page.drawText(`Salle : ${salle}`, { x: 40, y: 382, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        }

        // Infos participant centrées
        page.drawText(`Nom : ${nom}`, { x: 40, y: 370, size: 12, font: fontBold, color: rgb(0, 0, 0) });
        page.drawText(`Prénom : ${prenom}`, { x: 40, y: 355, size: 12, font: fontRegular, color: rgb(0, 0, 0) });
        page.drawText(`Email : ${email}`, { x: 40, y: 340, size: 10, font: fontRegular, color: rgb(0, 0, 0) });

        // QR Code grand, centré
        const qrCodeDataUrl = await QRCode.toDataURL(reservationId);
        const qrImageBytes = qrCodeDataUrl.split(',')[1];
        const qrImage = await pdfDoc.embedPng(Buffer.from(qrImageBytes, 'base64'));
        page.drawImage(qrImage, { x: 90, y: 170, width: 140, height: 140 });

        // Conditions d'utilisation en bas
        const conditions = [
            "Ce ticket est personnel et non transférable.",
            "Il est obligatoire pour accéder à l'atelier/masterclass.",
            "À présenter à l'entrée sur votre téléphone."
        ];
        conditions.forEach((line, i) => {
            page.drawText(line, {
                x: 30,
                y: 60 - i*15,
                size: 9,
                font: fontRegular,
                color: rgb(0.2, 0.2, 0.2),
            });
        });
        // Mention finale
        page.drawText("À présenter à l'entrée sur votre téléphone", { x: 30, y: 10, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

        const pdfBytes = await pdfDoc.save();
        return pdfBytes;
    } catch (error) {
        console.error('Erreur génération ticket PDF :', error);
        throw error;
    }
}
