import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

const QRCodeScanner = dynamic(() => import('../components/QRCodeScanner'), {
  ssr: false,
  loading: () => <CircularProgress />,
})

export default function ScanVisiteurPage() {
  const router = useRouter()
  const { stand_badge } = router.query; // Le badge de l'exposant qui scanne

  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorScan, setErrorScan] = useState('')

  // Cette fonction sera appelée quand un QR code de visiteur est scanné
  const handleScanSuccess = async (decodedText) => {
    setScanning(false)
    setLoading(true)
    setLastResult(null)
    setErrorScan('')

    if (!stand_badge) {
        toast.error("Le badge de l'exposant n'est pas spécifié dans l'URL.");
        setErrorScan("Le badge de l'exposant n'est pas spécifié dans l'URL.");
        setLoading(false);
        return;
    }

    try {
      // 1. On cherche d'abord les infos du visiteur scanné
      const { data: visiteur, error: visiteurError } = await supabase
        .from('inscription')
        .select('*')
        .eq('identifiant_badge', decodedText)
        .single();

      if (visiteurError || !visiteur) {
        throw new Error("Badge du visiteur non trouvé.");
      }
      
      // 2. On appelle l'API pour enregistrer le lead
      const res = await fetch('/api/scan-visiteur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          visiteur_id: visiteur.id, 
          stand_badge: stand_badge // Le badge de l'exposant
        }),
      });
      
      const resultData = await res.json();
      if (!res.ok) {
        throw new Error(resultData.message || 'Erreur lors de l\'enregistrement du lead.');
      }

      setLastResult(visiteur);
      toast.success(`Visiteur enregistré : ${visiteur.prenom} ${visiteur.nom}`);

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
      <Typography variant="h4" gutterBottom>Scanner un Visiteur</Typography>
      <Typography variant="body1" color="text.secondary" sx={{mb: 2}}>
        Scannez le badge des visiteurs pour enregistrer leurs contacts sur votre stand.
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
            <Typography variant="h6">Dernier visiteur scanné :</Typography>
            <Typography>{lastResult.prenom} {lastResult.nom}</Typography>
            <Typography>Fonction : {lastResult.fonction}</Typography>
            <Typography>Email : {lastResult.email}</Typography>
          </Alert>
          <Button sx={{ mt: 2 }} fullWidth variant="outlined" onClick={() => setScanning(true)}>
            Scanner un autre visiteur
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