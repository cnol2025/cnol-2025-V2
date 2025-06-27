import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Box, Typography, Paper, Button, CircularProgress, Alert, Avatar } from '@mui/material'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

const QRCodeScanner = dynamic(() => import('../components/QRCodeScanner'), {
  ssr: false,
  loading: () => <CircularProgress />,
})

export default function ScanStandPage() {
  const router = useRouter()
  const { stand } = router.query;

  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorScan, setErrorScan] = useState('')
  const [standInfo, setStandInfo] = useState(null)

  useEffect(() => {
    if (stand) fetchStandInfo();
  }, [stand]);

  const fetchStandInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('exposants')
        .select('*')
        .eq('id', stand)
        .single();
      if (error) throw error;
      setStandInfo(data);
    } catch (err) {
      console.error('Erreur lors du chargement du stand:', err);
    }
  };

  const handleScanSuccess = async () => {
    setScanning(false)
    setLoading(true)
    setLastResult(null)
    setErrorScan('')

    if (!stand) {
      toast.error("L'ID du stand n'est pas spécifié dans l'URL.");
      setErrorScan("L'ID du stand n'est pas spécifié dans l'URL.");
      setLoading(false);
      return;
    }

    try {
      const sessionCookie = document.cookie.split('; ').find(row => row.startsWith('cnol-session='));
      if (!sessionCookie) throw new Error("Vous devez être connecté pour scanner un stand.");
      const sessionData = JSON.parse(decodeURIComponent(sessionCookie.split('=')[1]));
      const { data: visiteur, error: visiteurError } = await supabase
        .from('inscription')
        .select('*')
        .eq('id', sessionData.id)
        .single();
      if (visiteurError || !visiteur) throw new Error("Session utilisateur invalide.");

      const res = await fetch('/api/scan-stand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visiteur_id: visiteur.id, stand_id: stand }),
      });
      const resultData = await res.json();
      if (!res.ok) throw new Error(resultData.message || 'Erreur lors de l\'enregistrement du contact.');

      setLastResult(visiteur);
      toast.success(`Contact enregistré pour le stand ${standInfo?.nom || 'inconnu'} !`);
    } catch (err) {
      setErrorScan(err.message);
      toast.error(err.message);
    }
    setLoading(false)
  }

  const handleScanError = (errorMessage) => {
    if (!errorMessage.toLowerCase().includes('not found')) {
      console.warn(`QR Code scan error: ${errorMessage}`);
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Toaster />
      {standInfo && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Avatar src={standInfo.logo_url} alt={standInfo.nom} sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}>
            {standInfo.nom ? standInfo.nom[0].toUpperCase() : 'S'}
          </Avatar>
          <Typography variant="h5" gutterBottom>{standInfo.nom}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {standInfo.type_produits}
          </Typography>
        </Paper>
      )}
      <Typography variant="h4" gutterBottom>Enregistrer mon contact</Typography>
      <Typography variant="body1" color="text.secondary" sx={{mb: 2}}>
        Scannez ce QR code pour enregistrer vos coordonnées auprès de ce stand.
      </Typography>
      {loading && <CircularProgress />}
      {!scanning && (
        <Button variant="contained" size="large" onClick={() => setScanning(true)}>
          Scanner le QR code
        </Button>
      )}
      {scanning && (
        <Box sx={{ mt: 2 }}>
          <QRCodeScanner
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
          />
          <Button sx={{ mt: 2 }} fullWidth variant="outlined" color="error" onClick={() => setScanning(false)}>
            Annuler
          </Button>
        </Box>
      )}
      {lastResult && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Alert severity="success">
            <Typography variant="h6">Contact enregistré !</Typography>
            <Typography>Vos coordonnées ont été transmises au stand.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {lastResult.prenom} {lastResult.nom} - {lastResult.email}
            </Typography>
          </Alert>
          <Button sx={{ mt: 2 }} fullWidth variant="outlined" onClick={() => router.push('/mon-espace')}>
            Retour à mon espace
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
  )
}
