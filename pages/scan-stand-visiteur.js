import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

const QRCodeScanner = dynamic(() => import('../components/QRCodeScanner'), {
  ssr: false,
  loading: () => <CircularProgress />,
});

export default function ScanStandVisiteurPage() {
  const router = useRouter();
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
      // Extraire l'ID du stand depuis l'URL scannée
      let standId = null;
      if (decodedText.includes('/scan-stand?stand=')) {
        const urlParams = new URLSearchParams(decodedText.split('?')[1]);
        standId = urlParams.get('stand');
      } else if (decodedText.match(/^cnol2025-(\d+)$/)) {
        // Si c'est un badge exposant direct
        const match = decodedText.match(/^cnol2025-(\d+)$/);
        standId = match[1];
      }

      if (!standId) {
        throw new Error('QR code de stand invalide. Veuillez scanner un QR code de stand valide.');
      }

      // Récupérer les infos de l'utilisateur connecté
      const sessionCookie = document.cookie.split('; ').find(row => row.startsWith('cnol-session='));
      if (!sessionCookie) {
        throw new Error("Vous devez être connecté pour scanner un stand.");
      }
      
      const sessionData = JSON.parse(decodeURIComponent(sessionCookie.split('=')[1]));
      const { data: visiteur, error: visiteurError } = await supabase
        .from('inscription')
        .select('*')
        .eq('id', sessionData.id)
        .single();
      
      if (visiteurError || !visiteur) {
        throw new Error("Session utilisateur invalide.");
      }

      // Enregistrer la visite du stand
      const res = await fetch('/api/scan-stand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visiteur_id: visiteur.id, stand_id: standId }),
      });
      
      const resultData = await res.json();
      if (!res.ok) {
        throw new Error(resultData.message || 'Erreur lors de l\'enregistrement de la visite.');
      }

      setLastResult({ visiteur, stand: resultData.stand });
      toast.success(`Visite enregistrée pour le stand ${resultData.stand} !`);

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
        Scannez le QR code d'un stand pour vous enregistrer et recevoir des informations.
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
            <Typography variant="h6">Visite enregistrée !</Typography>
            <Typography>Stand : {lastResult.stand}</Typography>
            <Typography>Visiteur : {lastResult.visiteur.prenom} {lastResult.visiteur.nom}</Typography>
          </Alert>
          <Button sx={{ mt: 2 }} fullWidth variant="outlined" onClick={() => setScanning(true)}>
            Scanner un autre stand
          </Button>
        </Paper>
      )}

      {errorScan && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Alert severity="error">
            {errorScan}
          </Alert>
          <Button sx={{ mt: 2 }} fullWidth variant="outlined" onClick={() => setScanning(true)}>
            Réessayer
          </Button>
        </Paper>
      )}
    </Box>
  );
} 