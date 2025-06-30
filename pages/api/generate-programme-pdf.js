import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  // Récupérer le programme publié
  const { data, error } = await supabase
    .from('programme_general')
    .select('*')
    .eq('published', true)
    .order('date_publication', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Aucun programme publié.' });
    return;
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="programme-scientifique-cnol.pdf"');
  doc.pipe(res);

  // Logo CNOL centré en haut
  const logoPath = path.join(process.cwd(), 'public', 'logo-cnol.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.page.width / 2 - 75, 30, { width: 150 });
    doc.y = 120;
  }

  // Titre
  doc.fontSize(20).font('Helvetica-Bold').text('Programme Scientifique CNOL 2025', { align: 'center' });
  doc.moveDown(1);

  // Date de publication
  if (data.date_publication) {
    doc.fontSize(11).font('Helvetica-Oblique').text('Publié le : ' + new Date(data.date_publication).toLocaleDateString(), { align: 'center' });
    doc.moveDown(1);
  }

  // Contenu (markdown rendu en texte simple)
  doc.fontSize(12).font('Helvetica');
  const lines = (data.contenu || '').split('\n');
  lines.forEach(line => {
    doc.text(line);
  });

  doc.end();
} 