import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Typography, Paper, Button, CircularProgress, Alert, Avatar } from '@mui/material';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { Person, ArrowBack } from '@mui/icons-material';

const QRCodeScanner = dynamic(() => import('../components/QRCodeScanner'), {
  ssr: false,
  loading: () => <CircularProgress />,
});

export const getServerSideProps = async ({ req }) => {
  const sessionCookie = req.cookies['cnol-session'];
  if (!sessionCookie) {
    return { redirect: { destination: '/identification', permanent: false } };
  }
  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    const { data: user, error } = await supabase
      .from('inscription')
      .select('id, nom, prenom')
      .eq('id', sessionData.id)
      .single();

    if (error || !user) {
      return { redirect: { destination: '/identification?error=user_not_found', permanent: false } };
    }
    return { props: { user } };
  } catch (error) {
    return { redirect: { destination: '/identification', permanent: false } };
  }
};

export default function ScanContactPage({ user }) {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorScan, setErrorScan] = useState('');
  const [lastQr, setLastQr] = useState('');

  const handleScanSuccess = (decodedText) => {
    setScanning(false);
    handleScan(decodedText);
  };

  const handleScanError = (errorMessage) => {
    if (!errorMessage.toLowerCase().includes('not found')) {
      console.warn(`QR Code scan error: ${errorMessage}`);
    }
  };

  const handleScan = async (decodedText) => {
    setLoading(true);
    setLastResult(null);
    setErrorScan('');
    setLastQr(decodedText);

    // Détection d'un QR code de stand (URL ou chemin)
    if (
      decodedText.includes('/scan-stand?stand=') ||
      (decodedText.startsWith('http://') && decodedText.includes('/scan-stand?stand=')) ||
      (decodedText.startsWith('https://') && decodedText.includes('/scan-stand?stand='))
    ) {
      setErrorScan("Vous avez scanné un QR code de stand. Pour vous enregistrer sur un stand, ouvrez ce QR code avec votre appareil photo ou navigateur. Ce scanner sert à ajouter des contacts participants, pas à s'enregistrer sur un stand.");
      setLoading(false);
      return;
    }

    try {
      // Appel de la nouvelle API backend qui utilise la clé de service
      const response = await fetch(`/api/get-participant-by-badge?badge_code=${decodedText}`);
      
      // Gestion robuste de la réponse
      let scannedUserData;
      const responseText = await response.text();
      try {
        scannedUserData = JSON.parse(responseText);
      } catch (e) {
        console.error("Impossible de parser la réponse du serveur:", responseText);
        throw new Error("Erreur de communication avec le serveur. Il est possible qu'une clé API manque sur le serveur.");
      }

      if (!response.ok) {
        throw new Error(scannedUserData.message || 'Badge invalide ou participant non trouvé.');
      }
      
      const { data: existingContact } = await supabase
        .from('contacts_collected')
        .select('id')
        .eq('collector_id', user.id)
        .eq('scanned_badge_code', scannedUserData.identifiant_badge)
        .single();
      
      if (existingContact) {
        setLastResult(scannedUserData);
        throw new Error('Ce contact a déjà été ajouté.');
      }

      const { error: insertError } = await supabase
        .from('contacts_collected')
        .insert({ collector_id: user.id, scanned_badge_code: scannedUserData.identifiant_badge });

      if (insertError) throw new Error(insertError.message);

      setLastResult(scannedUserData);
      toast.success(`Contact ajouté : ${scannedUserData.prenom} ${scannedUserData.nom}`);

    } catch (err) {
      setErrorScan(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Toaster />
      <Button startIcon={<ArrowBack />} href="/mon-espace" sx={{ mb: 2 }}>
        Retour à mon espace
      </Button>

      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Scanner un Contact</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Scannez le QR code d'un autre participant pour l'ajouter.
        </Typography>

        {!scanning && !loading && (
          <Button variant="contained" size="large" onClick={() => setScanning(true)}>
            Lancer le scanner
          </Button>
        )}

        {loading && <CircularProgress sx={{ my: 2 }}/>}
      </Paper>

      {scanning && (
        <Box sx={{ mt: 2, p:1, border: '1px solid #ddd', borderRadius: 2 }}>
          <QRCodeScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
          <Button fullWidth sx={{ mt: 2 }} variant="outlined" color="error" onClick={() => setScanning(false)}>
            Annuler
          </Button>
        </Box>
      )}

      {lastResult && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Alert severity={errorScan ? 'warning' : 'success'} icon={<Avatar><Person/></Avatar>}>
            <Typography variant="h6">{lastResult.prenom} {lastResult.nom}</Typography>
            <Typography>{lastResult.fonction}</Typography>
            <Typography>{lastResult.email}</Typography>
            <Typography>{lastResult.telephone}</Typography>
          </Alert>
           <Button fullWidth sx={{ mt: 2 }} variant="outlined" onClick={() => setScanning(true)}>
            Scanner un autre contact
          </Button>
        </Paper>
      )}

      {errorScan && !lastResult &&(
         <Paper sx={{ mt: 2, p: 2 }}>
          <Alert severity="error">
            {errorScan} (Code: {lastQr})
          </Alert>
           <Button fullWidth sx={{ mt: 2 }} variant="outlined" onClick={() => setScanning(true)}>
            Réessayer
          </Button>
        </Paper>
      )}
    </Box>
  );
}

// Fonction RPC à créer dans Supabase
/*
create or replace function get_user_details_by_badge(p_badge_code text)
returns table (
    nom text,
    prenom text,
    email text,
    telephone text,
    fonction text,
    ville text
)
language sql
as $$
    select
        i.nom,
        i.prenom,
        i.email,
        i.telephone,
        i.fonction,
        i.ville
    from
        inscription as i
    where
        i.identifiant_badge = p_badge_code;
$$;
*/ 