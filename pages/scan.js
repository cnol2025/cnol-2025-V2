import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'

// On charge le QRCodeScanner de façon dynamique, en désactivant le rendu côté serveur (ssr: false)
// C'est la clé pour résoudre les erreurs de build sur Vercel.
const QRCodeScanner = dynamic(() => import('../components/QRCodeScanner'), {
  ssr: false,
  loading: () => <CircularProgress />,
})

export default function ScanPage() {
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
    // On peut choisir d'ignorer les erreurs fréquentes de "QR code not found"
    // ou d'afficher un message plus subtil.
    // Pour l'instant, on log en console.
    console.warn(`QR Code scan error: ${errorMessage}`)
  }

  const handleScan = async (decodedText) => {
    setLoading(true)
    setLastResult(null)
    setLastQr(decodedText)
    setErrorScan('')
    // Ajout : détection du type d'URL QR code
    if (decodedText.includes('/storage/v1/object/public/logos/')) {
      // Nouveau badge (Supabase Storage) : ouvrir le PDF directement
      window.open(decodedText, '_blank')
      setLoading(false)
      return
    }
    if (decodedText.includes('/api/generatedbadge?id=')) {
      // Ancien badge : ouvrir l'URL dynamique
      window.open(decodedText, '_blank')
      setLoading(false)
      return
    }
    try {
      let id = null
      // Logique robuste pour extraire l'ID
      if (decodedText.startsWith('cnol2025-')) {
        const extractedId = decodedText.split('-')[1]
        if (/^\d+$/.test(extractedId)) {
          id = parseInt(extractedId, 10)
        }
      }
      if (!id && /^\d+$/.test(decodedText)) {
        id = parseInt(decodedText, 10)
      }
      if (!id && decodedText.includes('id=')) {
        try {
          const url = new URL(decodedText)
          const paramId = url.searchParams.get('id')
          if (paramId && /^\d+$/.test(paramId)) {
            id = parseInt(paramId, 10)
          }
        } catch {}
      }
      if (!id) {
        playSound('error')
        setErrorScan('Format du QR code non valide.')
        throw new Error("Format du QR code non valide.")
      }
      // --- Enregistrement dans la table 'entrees' ---
      const { data, error } = await supabase
        .from('entrees')
        .insert({ user_id: id })
        .select('*, inscription(*)')
        .single()
      if (error) {
        playSound('error')
        setErrorScan(error.message || 'Erreur lors de l\'enregistrement.')
        throw error
      }
      const scanResult = {
        ...data.inscription,
        scanned_at: data.scanned_at
      }
      setLastResult(scanResult)
      playSound('success')
      toast.success(`Entrée enregistrée pour ${scanResult.prenom} ${scanResult.nom}`)
    } catch (err) {
      toast.error(err.message || 'Erreur lors du scan')
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
      <Typography variant="h5" gutterBottom>Scan des badges</Typography>
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
          <Typography>{lastResult.prenom} {lastResult.nom}</Typography>
          <Typography>Type : {lastResult.participant_type}</Typography>
          <Typography>Fonction : {lastResult.fonction}</Typography>
          <Typography>Ville : {lastResult.ville}</Typography>
          <Typography>Scanné le : {new Date(lastResult.scanned_at).toLocaleString()}</Typography>
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
