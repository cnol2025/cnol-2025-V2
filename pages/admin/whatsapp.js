import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';

export default function WhatsAppValidésAdmin() {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // Upload du fichier vers Supabase bucket 'logos'
  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setUploading(true);
    const fileExt = f.name.split('.').pop();
    const fileName = `whatsapp-${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('logos').upload(fileName, f, { upsert: true });
    if (error) {
      setResult({ success: false, message: "Erreur upload fichier: " + error.message });
      setUploading(false);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
    setFileUrl(publicUrlData.publicUrl);
    setFile(f);
    setUploading(false);
  };

  // Envoi WhatsApp à tous les validés
  const handleSend = async () => {
    setSending(true);
    setResult(null);
    // Récupérer tous les inscrits validés
    const { data: inscrits, error } = await supabase.from('inscription').select('id, nom, prenom, telephone').eq('valide', true);
    if (error) {
      setResult({ success: false, message: "Erreur récupération inscrits: " + error.message });
      setSending(false);
      return;
    }
    let successCount = 0;
    let failCount = 0;
    for (const inscrit of inscrits) {
      const payload = {
        to: inscrit.telephone,
        text: message.replace(/\{nom\}/gi, inscrit.nom).replace(/\{prenom\}/gi, inscrit.prenom),
      };
      if (fileUrl) {
        payload.documentUrl = fileUrl;
        payload.fileName = file ? file.name : undefined;
      }
      try {
        const res = await fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) successCount++;
        else failCount++;
      } catch (e) {
        failCount++;
      }
    }
    setResult({ success: true, message: `Envoi terminé. Succès: ${successCount}, Échecs: ${failCount}` });
    setSending(false);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>WhatsApp à tous les inscrits validés</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Personnalisez le message (vous pouvez utiliser <b>{'{nom}'}</b> et <b>{'{prenom}'}</b> pour insérer le nom/prénom de chaque inscrit).<br />
        Vous pouvez aussi joindre un fichier (image, document ou vidéo).
      </Typography>
      <TextField
        label="Message WhatsApp"
        value={message}
        onChange={e => setMessage(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        sx={{ mb: 2 }}
      />
      <Button variant="outlined" component="label" sx={{ mb: 2 }} disabled={uploading}>
        {uploading ? 'Upload en cours...' : 'Joindre un fichier'}
        <input type="file" hidden onChange={handleFileChange} />
      </Button>
      {fileUrl && <Typography variant="body2" sx={{ mb: 2 }}>Fichier uploadé: <a href={fileUrl} target="_blank" rel="noopener noreferrer">{file?.name}</a></Typography>}
      <Button variant="contained" color="success" onClick={handleSend} disabled={sending || uploading || !message}>
        {sending ? <CircularProgress size={24} /> : 'Envoyer à tous les validés'}
      </Button>
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 3 }}>{result.message}</Alert>
      )}
    </Box>
  );
} 