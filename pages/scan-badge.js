import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material'
import toast, { Toaster } from 'react-hot-toast'

// On charge le QRCodeScanner de façon dynamique, en désactivant le rendu côté serveur (ssr: false)
const QRCodeScanner = dynamic(() => import('../components/QRCodeScanner'), {
  ssr: false,
  loading: () => <CircularProgress />, 
})

export default function ScanBadge() {
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastQr, setLastQr] = useState('')
  const [errorScan, setErrorScan] = useState('')

  const handleScanSuccess = (decodedText) => {
    setScanning(false)
    handleScan(decodedText)
  }

  const handleScanError = (errorMessage) => {
    // On ignore les erreurs pour ne pas spammer l'utilisateur
    console.warn(`QR Code scan error: ${errorMessage}`)
  }

  const handleScan = async (decodedText) => {
    setLoading(true)
    setLastResult(null)
    setLastQr(decodedText)
    setErrorScan('')
    try {
      // On suppose que le QR code contient l'id ou le code du badge
      const res = await fetch('/api/get-participant-by-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge: decodedText })
      })
      const json = await res.json()
      if (res.ok) {
        setLastResult(json)
        playSound('success')
        toast.success('Badge reconnu !')
      } else {
        setErrorScan(json.message || 'Erreur inconnue')
        playSound('error')
        toast.error(json.message || 'Erreur lors du scan')
      }
    } catch (err) {
      setErrorScan('Erreur réseau')
      playSound('error')
      toast.error('Erreur réseau')
    }
    setLoading(false)
  }

  const playSound = (type) => {
    let audio
    switch (type) {
      case 'success':
        audio = new Audio('/success.mp3')
        break
      case 'error':
        audio = new Audio('/error.mp3')
        break
      case 'warning':
        audio = new Audio('/warning.mp3')
        break
      default:
        return
    }
    audio.play().catch(() => {})
  }

  return (
    <Box sx={{ p: 3 }}>
      <Toaster />
      <Typography variant="h5" gutterBottom>Scan des badges participants</Typography>
      {loading && <CircularProgress />}
      {!scanning && !loading && (
        <Button variant="contained" onClick={() => setScanning(true)}>
          Lancer le scanner
        </Button>
      )}

      {scanning && (
        <Box sx={{ mt: 2, maxWidth: '500px', mx: 'auto' }}>
          <QRCodeScanner
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
          />
          <Button sx={{ mt: 2 }} variant="outlined" color="error" onClick={() => setScanning(false)}>
            Annuler le Scan
          </Button>
        </Box>
      )}

      {!scanning && lastResult && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6">Dernier badge scanné :</Typography>
          <Typography><b>Nom :</b> {lastResult.nom} {lastResult.prenom}</Typography>
          <Typography><b>Email :</b> {lastResult.email}</Typography>
          <Typography><b>Fonction :</b> {lastResult.fonction}</Typography>
          <Typography><b>Type :</b> {lastResult.participant_type}</Typography>
          <Typography><b>Ville :</b> {lastResult.ville}</Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => { setScanning(true); setLastResult(null); setErrorScan(''); setLastQr(''); }}>Scanner un autre badge</Button>
        </Paper>
      )}
      {!scanning && errorScan && (
        <Paper sx={{ mt: 3, p: 2, background: '#ffeaea' }}>
          <Typography color="error">Erreur : {errorScan}</Typography>
          <Typography variant="body2">QR brut : <code>{lastQr}</code></Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => { setScanning(true); setLastResult(null); setErrorScan(''); setLastQr(''); }}>Réessayer</Button>
        </Paper>
      )}
    </Box>
  )
} 