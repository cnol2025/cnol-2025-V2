import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Box, Typography, Button, CircularProgress, List, ListItem, ListItemText,
  Alert, Paper, Stack
} from '@mui/material';
import toast, { Toaster } from 'react-hot-toast';

export const getServerSideProps = async ({ req }) => {
  const sessionCookie = req.cookies['cnol-session'];
  if (!sessionCookie) {
    return { redirect: { destination: '/identification', permanent: false } };
  }
  
  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    const { data: user, error } = await supabase
      .from('inscription')
      .select('*')
      .eq('id', sessionData.id)
      .single();

    if (error || !user) {
      return { redirect: { destination: '/identification?error=user_not_found', permanent: false } };
    }
    
    if (user.fonction !== 'Opticien' && user.fonction !== 'Ophtalmologue') {
        return {
            redirect: { destination: '/mon-espace?error=access_denied', permanent: false },
        };
    }

    return { props: { user } };
  } catch (error) {
    return { redirect: { destination: '/identification', permanent: false } };
  }
};

export default function ReservationMasterclass({ user }) {
  const [masterclasses, setMasterclasses] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ ouverture_reservation_masterclass: false });

  useEffect(() => {
    fetchData();
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').single();
      if (data) setSettings(data);
    };
    fetchSettings();
  }, [user.email]);

  const fetchData = async () => {
    setLoading(true);

    const { data: masterclassesData, error: masterclassesError } = await supabase
      .from('masterclass')
      .select(`
        *,
        reservations_masterclass ( statut )
      `)
      .order('date_heure');

    if (masterclassesData) {
        const transformedMasterclasses = masterclassesData.map(mc => {
            const placesPrises = mc.reservations_masterclass.filter(r => r.statut === 'confirmé').length;
            return { ...mc, placesPrises };
        });
        setMasterclasses(transformedMasterclasses);
    }
    
    const { data: reservationsData } = await supabase
      .from('reservations_masterclass')
      .select('masterclass_id, statut')
      .eq('email', user.email);
      
    if (reservationsData) setReservations(reservationsData);

    setLoading(false);
  };

  const handleReserver = async (masterclassId) => {
    const toastId = toast.loading('Réservation en cours...');
    
    const response = await fetch('/api/reservation-masterclass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        masterclass_id: masterclassId,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone
      })
    });

    const data = await response.json();
    if (response.ok) {
      toast.success(data.message || 'Demande de réservation envoyée !', { id: toastId });
      fetchData();
    } else {
      toast.error(data.message || 'Erreur lors de la réservation.', { id: toastId });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  
  if (!settings.ouverture_reservation_masterclass) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">Les réservations de masterclass ne sont pas encore ouvertes.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: 'auto' }}>
      <Toaster position="top-right" />
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>Réserver une Masterclass</Typography>
        <Typography variant="body1" color="text.secondary">
            Bonjour {user.prenom}, sélectionnez une masterclass pour réserver votre place.
        </Typography>
      </Paper>
      <Stack spacing={2}>
        {masterclasses.map((masterclass) => {
          const reservation = reservations.find(r => r.masterclass_id === masterclass.id);
          const placesPrises = masterclass.placesPrises || 0;
          const placesRestantes = (masterclass.places || 0) - placesPrises;
          const isFull = placesRestantes <= 0;

          let buttonText = 'Réserver';
          let buttonColor = 'primary';
          let buttonDisabled = isFull;

          if (reservation) {
            if (reservation.statut === 'confirmé') {
              buttonText = 'Confirmé';
              buttonColor = 'success';
              buttonDisabled = true;
            } else if (reservation.statut === 'en attente') {
              buttonText = 'En attente';
              buttonColor = 'warning';
              buttonDisabled = true;
            }
          } else if (isFull) {
            buttonText = 'Complet';
            buttonColor = 'error';
            buttonDisabled = true;
          }

          return (
            <Paper key={masterclass.id} sx={{ p: 2, borderRadius: 2, boxShadow: 2, opacity: (isFull && !reservation) ? 0.6 : 1 }}>
              <Typography variant="h6" gutterBottom>{masterclass.titre}</Typography>
              <Typography variant="body2" color="text.secondary">{masterclass.intervenant}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{new Date(masterclass.date_heure).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</Typography>
              <Typography variant="body2">Salle : {masterclass.salle}</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Places restantes : {placesRestantes}</Typography>
              <Button
                variant="contained"
                onClick={() => handleReserver(masterclass.id)}
                disabled={buttonDisabled}
                color={buttonColor}
              >
                {buttonText}
              </Button>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
