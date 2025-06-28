import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import toast, { Toaster } from 'react-hot-toast';

const QRCodeScanner = dynamic(() => import('../components/QRCodeScanner'), {
  ssr: false,
  loading: () => <CircularProgress />, 
});

export default function ScanStandVisiteurPage() {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorScan, setErrorScan] = useState('');

  const handleScanSuccess = async (decodedText) => {
    setScanning(false);
    setLoading(true);
    setLastResult(null);
    setErrorScan('');
    try {
      // Extraire l'ID du stand depuis le QR code (on attend juste un ID ou une URL avec ?stand=ID)
      let exposant_id = null;
      if (/^\d+$/.test(decodedText)) {
        exposant_id = decodedText;
      } else if (decodedText.includes('stand=')) {
        const urlParams = new URLSearchParams(decodedText.split('?')[1]);
        exposant_id = urlParams.get('stand');
      }
      if (!exposant_id) throw new Error('QR code de stand invalide.');

      // Récupérer l'ID du visiteur via l'API session
      const sessionRes = await fetch('/api/session');
      if (!sessionRes.ok) throw new Error('Vous devez être connecté.');
      const { session } = await sessionRes.json();
      if (!session || !session.id) throw new Error('Session utilisateur invalide.');
      const visiteur_id = session.id;

      // Appel API pour enregistrer la visite
      const res = await fetch('/api/scan-stand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exposant_id, visiteur_id }),
      });
      const resultData = await res.json();
      if (!res.ok) throw new Error(resultData.message || 'Erreur lors de l\'enregistrement.');
      setLastResult(resultData);
      toast.success(resultData.message);
    } catch (err) {
      setErrorScan(err.message);
      toast.error(err.message);
    }
    setLoading(false);
  };

  const handleScanError = (errorMessage) => {
    if (!errorMessage.toLowerCase().includes('not found')) {
      console.warn(`QR Code scan error: ${errorMessage}`);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Toaster />
      <Typography variant="h4" gutterBottom>Scanner un Stand</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Scannez le QR code d'un stand pour vous enregistrer comme visiteur.
      </Typography>
      {loading && <CircularProgress />}
      {!scanning && (
        <Button variant="contained" size="large" onClick={() => setScanning(true)}>
          Lancer le scanner
        </Button>
      )}
      {scanning && (
        <Box sx={{ mt: 2 }}>
          <QRCodeScanner
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
          />
          <Button sx={{ mt: 2 }} fullWidth variant="outlined" color="error" onClick={() => setScanning(false)}>
            Arrêter le scanner
          </Button>
        </Box>
      )}
      {lastResult && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Alert severity="success">
            <Typography variant="h6">{lastResult.message}</Typography>
            <Typography>Stand : {lastResult.stand}</Typography>
            <Typography>Visiteur : {lastResult.visiteur}</Typography>
          </Alert>
          <Button sx={{ mt: 2 }} fullWidth variant="outlined" onClick={() => setScanning(true)}>
            Scanner un autre stand
          </Button>
        </Paper>
      )}
      {errorScan && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Alert severity="error">{errorScan}</Alert>
          <Button sx={{ mt: 2 }} fullWidth variant="outlined" onClick={() => setScanning(true)}>
            Réessayer
          </Button>
        </Paper>
      )}
    </Box>
  );
} 