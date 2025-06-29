import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Stack, 
  Divider, 
  Alert, 
  Card, 
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  CircularProgress
} from '@mui/material';
import QRCode from 'qrcode.react';
import Link from 'next/link';
import {
  QrCodeScanner,
  Notifications,
  NotificationsOff,
  Person,
  Event,
  Hotel,
  LocationOn,
  Download,
  Logout,
  ContactPhone,
  School,
  EmojiEvents,
  Map,
  AdminPanelSettings
} from '@mui/icons-material';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import NotificationDropdown from '../components/NotificationDropdown';

// On charge le QRCodeScanner de façon dynamique pour éviter les erreurs de build
const QRCodeScanner = dynamic(() => import('../components/QRCodeScanner'), {
  ssr: false,
  loading: () => <CircularProgress />,
});

export const getServerSideProps = async ({ req }) => {
  // Vérifier si l'utilisateur est connecté via la session
  const sessionCookie = req.cookies['cnol-session'];
  
  if (!sessionCookie) {
    return {
      redirect: {
        destination: '/identification',
        permanent: false,
      },
    };
  }

  try {
    // Décoder la session
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    
    if (!sessionData || !sessionData.id) {
      return {
        redirect: {
          destination: '/identification',
          permanent: false,
        },
      };
    }

    // 1. Récupérer les données de base de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('inscription')
      .select('*')
      .eq('id', sessionData.id)
      .single();

    if (userError || !userData) {
      return {
        redirect: {
          destination: '/identification?error=user_not_found',
          permanent: false,
        },
      };
    }
    
    // 2. Récupérer les réservations d'ateliers par email
    const { data: ateliersData, error: ateliersError } = await supabase
        .from('reservations_ateliers')
        .select('*, ateliers(*)')
        .eq('email', userData.email);

    // 3. Récupérer les réservations de masterclass par email
    const { data: masterclassData, error: masterclassError } = await supabase
        .from('reservations_masterclass')
        .select('*, masterclasses:masterclass(*)')
        .eq('email', userData.email);

    if (ateliersError || masterclassError) {
        console.error("Erreur de récupération des réservations:", ateliersError, masterclassError);
    }
    
    // 4. Combiner les données et les passer au composant
    const userWithReservations = {
      ...userData,
      reservations_ateliers: ateliersData || [],
      reservations_masterclass: masterclassData || [],
    };

    return {
      props: {
        user: userWithReservations,
      },
    };
  } catch (error) {
    console.error('Erreur de session:', error);
    return {
      redirect: {
        destination: '/identification',
        permanent: false,
      },
    };
  }
};

export default function MonEspace({ user }) {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [exposantsList, setExposantsList] = useState([]);
  const [standsVisites, setStandsVisites] = useState([]);
  const [loadingStandsVisites, setLoadingStandsVisites] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  // Détermine si l'utilisateur a le droit de voir les ateliers/masterclass
  const isAllowedForWorkshops = user && (user.fonction === 'Opticien' || user.fonction === 'Ophtalmologue');

  // Bouton Admin visible uniquement pour les admins
  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    // Vérifier les permissions de notifications
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }

    // Charger les paramètres
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').single();
      if (data) setSettings(data);
    };
    fetchSettings();

    // Charger les contacts collectés
    const fetchContacts = async () => {
      const { data, error } = await supabase.rpc('get_user_contacts', {
        p_collector_id: user.id,
      });

      if (error) {
        console.error('Erreur chargement contacts:', error);
      } else {
        setContacts(data || []);
      }
    };
    fetchContacts();

    // Charger les notifications reçues
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setNotifications(data);
    };
    fetchNotifications();

    // Charger la liste des exposants
    const fetchExposants = async () => {
      const { data, error } = await supabase.from('exposants').select('*');
      if (error) {
        console.error('Erreur chargement exposants:', error);
      } else {
        setExposantsList(data || []);
      }
    };
    fetchExposants();

    // Récupérer les stands visités
    const fetchStandsVisites = async () => {
      setLoadingStandsVisites(true);
      try {
        const res = await fetch('/api/user-space', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: user.identifiant_badge, email: user.email })
        });
        const data = await res.json();
        setStandsVisites(data.stands_visites || []);
      } catch (e) {
        setStandsVisites([]);
      }
      setLoadingStandsVisites(false);
    };
    if (user && user.identifiant_badge && user.email) fetchStandsVisites();

    // Charger le dernier scan depuis localStorage
    if (typeof window !== 'undefined') {
      const scan = localStorage.getItem('lastScanResult');
      if (scan) setLastScan(JSON.parse(scan));
    }
  }, [user.identifiant_badge, user.email]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/identification');
  };

  const handleNotificationToggle = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert("Les notifications ne sont pas supportées par votre navigateur.");
      return;
    }

    // Fonction utilitaire pour convertir la clé VAPID
    function urlBase64ToUint8Array(base64String) {
      const padding = "=".repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");
    
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
    
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }

    if (Notification.permission === 'denied') {
      alert("Vous avez bloqué les notifications. Veuillez les autoriser dans les paramètres de votre navigateur.");
      return;
    }

    // Demander la permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert("Permission de notification non accordée.");
      setNotificationsEnabled(false);
      return;
    }
    
    setNotificationsEnabled(true);
    const toastId = toast.loading('Activation des notifications...');

    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('La clé VAPID publique n\'est pas configurée.');
      }
      
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Enregistrer le Service Worker
      const sw = await navigator.serviceWorker.ready;
      
      // S'abonner aux notifications push
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Envoyer l'abonnement au serveur
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Échec de l\'abonnement côté serveur.');
      }

      toast.success('Vous êtes maintenant abonné aux notifications !', { id: toastId });

    } catch (error) {
      console.error("Erreur lors de l'abonnement aux notifications:", error);
      toast.error(`Erreur: ${error.message}`, { id: toastId });
      setNotificationsEnabled(false);
    }
  };

  const handleDownloadPdfBadge = async () => {
    // Vérifier que l'utilisateur est validé avant de permettre le téléchargement
    if (!user.valide) {
      alert('Votre inscription doit être validée par l\'administrateur avant de pouvoir télécharger votre badge.');
      return;
    }

    try {
      // Afficher un indicateur de chargement
      alert('Génération de votre badge PDF en cours... Veuillez patienter.');

      const response = await fetch(`/api/generatedbadge?id=${user.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'La génération du badge a échoué.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `badge-cnol2025-${user.nom}-${user.prenom}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erreur lors du téléchargement du badge PDF:', error);
      alert(`Erreur: ${error.message}`);
    }
  };

  // Ajout pour marquer comme lu
  const markAllNotificationsRead = async () => {
    // Optimiste : on met à jour localement
    setNotifications((prev) => prev.map(n => ({ ...n, lu: true })));
    // Appel API pour marquer comme lu côté serveur (à adapter selon votre API)
    await fetch('/api/notifications/mark-all-read', { method: 'POST', body: JSON.stringify({ userId: user.id }) });
  };

  const handleNotificationClick = (notif) => {
    if (notif.url) window.open(notif.url, '_blank');
    // Marquer comme lu localement
    setNotifications((prev) => prev.map(n => n.id === notif.id ? { ...n, lu: true } : n));
    // Appel API pour marquer comme lu côté serveur (à adapter)
    fetch('/api/notifications/mark-read', { method: 'POST', body: JSON.stringify({ id: notif.id }) });
  };

  // Fonction pour télécharger la fiche exposant
  const handleDownloadExposantFiche = async (exposantId, exposantNom) => {
    const toastId = toast.loading('Génération de la fiche exposant...');
    try {
      const res = await fetch(`/api/download-exposant-fiche?id=${exposantId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erreur lors de la génération de la fiche');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const nomSafe = exposantNom.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.setAttribute('download', `fiche-exposant-${nomSafe}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Fiche exposant téléchargée !', { id: toastId });
    } catch (e) {
      console.error("Erreur téléchargement fiche exposant:", e);
      toast.error(`Erreur: ${e.message}`, { id: toastId });
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      {isAdmin && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            color="info"
            startIcon={<AdminPanelSettings />}
            href="/admin"
            sx={{ fontWeight: 'bold', letterSpacing: 1 }}
          >
            Espace Admin
          </Button>
        </Box>
      )}
      {user.participant_type && user.participant_type.toLowerCase() === 'exposant' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            href="/mon-stand"
            sx={{ fontWeight: 'bold', letterSpacing: 1 }}
          >
            Administration Exposant
          </Button>
        </Box>
      )}
      {/* En-tête avec infos utilisateur */}
      <Paper sx={{ p: 3, mb: 2, borderRadius: 4, boxShadow: 1, background: '#f7f7f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            Bonjour, {user.prenom?.toUpperCase()} {user.nom?.toUpperCase()}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {user.participant_type} • {user.email}
          </Typography>
          {user.fonction && (
            <Typography variant="body2" color="text.secondary">
              {user.fonction}
            </Typography>
          )}
          <Chip 
            label={user.valide ? "Compte validé" : "En attente de validation"} 
            color={user.valide ? "success" : "warning"}
            sx={{ mt: 1, mb: 2 }}
          />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Logout />}
            onClick={handleLogout}
            sx={{ mb: 1, fontWeight: 'bold' }}
          >
            Déconnexion
          </Button>
          <NotificationDropdown
            notifications={notifications}
            onMarkAllRead={markAllNotificationsRead}
            onNotificationClick={handleNotificationClick}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 2, borderRadius: 4, boxShadow: 1, background: '#f7f7f7' }}>
        <Typography variant="h6" gutterBottom>
          <QrCodeScanner sx={{ mr: 1, verticalAlign: 'middle' }} />
          Votre QR Code d'accès
        </Typography>
        {user.valide ? (
          <Stack alignItems="center" spacing={2}>
            <QRCode id="qr-code" value={user.identifiant_badge || user.email} size={200} />
            <Typography variant="body2" color="text.secondary">
              Code: {user.identifiant_badge || 'N/A'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Download />}
              sx={{
                width: '100%',
                borderRadius: 3,
                fontWeight: 'bold',
                fontSize: { xs: '0.95rem', sm: '1.05rem' },
                letterSpacing: 1,
                py: 1.2,
                mt: 2,
                textTransform: 'none'
              }}
              onClick={handleDownloadPdfBadge}
            >
              TÉLÉCHARGER MON BADGE (PDF)
            </Button>
          </Stack>
        ) : (
          <Alert severity="warning">
            Votre inscription est en attente de validation. Votre badge sera disponible ici une fois votre compte approuvé.
          </Alert>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
              Notifications
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Recevez des notifications importantes sur votre appareil.
              </Typography>
              <Switch
                checked={notificationsEnabled}
                onChange={handleNotificationToggle}
                name="notifications"
                color="primary"
              />
            </Box>
          </Paper>
        </Grid>

        {/* Mes Réservations Ateliers - Condition d'affichage ajoutée */}
        {user.valide && isAllowedForWorkshops && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                Mes Réservations Ateliers
              </Typography>
              {user.reservations_ateliers && user.reservations_ateliers.filter(r => r.statut === 'confirmé').length > 0 ? (
                <List>
                  {user.reservations_ateliers.filter(r => r.statut === 'confirmé').map((reservation) => (
                    <Paper key={reservation.id} sx={{ p: 2, mb: 2, borderRadius: 4, boxShadow: 1, background: '#f7f7f7' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Event sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
                          {reservation.ateliers?.titre}
                        </Typography>
                        <Chip label="confirmé" color="success" size="small" sx={{ ml: 1 }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {new Date(reservation.ateliers?.date_heure).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
                      </Typography>
                      {reservation.ateliers?.intervenant && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Intervenant : {reservation.ateliers.intervenant}
                        </Typography>
                      )}
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Download />}
                        sx={{
                          width: '100%',
                          borderRadius: 3,
                          fontWeight: 'bold',
                          fontSize: { xs: '0.95rem', sm: '1.05rem' },
                          letterSpacing: 1,
                          py: 1.2,
                          mt: 2,
                          textTransform: 'none'
                        }}
                        onClick={async () => {
                          const toastId = toast.loading('Génération du ticket...');
                          try {
                            const res = await fetch(`/api/download-ticket-atelier?id=${reservation.id}`);
                            if (!res.ok) {
                              const errorData = await res.json();
                              throw new Error(errorData.message || 'Erreur lors de la génération du ticket');
                            }
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            const titreSafe = reservation.ateliers?.titre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                            link.setAttribute('download', `ticket-atelier-${titreSafe}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.parentNode.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            toast.success('Ticket téléchargé !', { id: toastId });
                          } catch (e) {
                            console.error("Erreur téléchargement ticket:", e);
                            toast.error(`Erreur: ${e.message}`, { id: toastId });
                          }
                        }}
                      >
                        TÉLÉCHARGER LE TICKET
                      </Button>
                    </Paper>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucun atelier validé
                </Typography>
              )}
              {settings.ouverture_reservation_atelier && (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{
                    width: '100%',
                    borderRadius: 999,
                    fontWeight: 'bold',
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    letterSpacing: 1,
                    py: 1.2,
                    my: 1.5,
                    textTransform: 'none',
                    whiteSpace: 'normal',
                    px: 2
                  }}
                  href="/reservation-ateliers"
                >
                  RÉSERVER UN ATELIER
                </Button>
              )}
            </Paper>
          </Grid>
        )}

        {/* Mes Réservations Masterclass - Condition d'affichage ajoutée */}
        {user.valide && isAllowedForWorkshops && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                Mes Réservations Masterclass
              </Typography>
              {user.reservations_masterclass && user.reservations_masterclass.filter(r => r.statut === 'confirmé').length > 0 ? (
                <List>
                  {user.reservations_masterclass.filter(r => r.statut === 'confirmé').map((reservation) => (
                    <Paper key={reservation.id} sx={{ p: 2, mb: 2, borderRadius: 4, boxShadow: 1, background: '#f7f7f7' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Event sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
                          {reservation.masterclasses?.titre}
                        </Typography>
                        <Chip label="confirmé" color="success" size="small" sx={{ ml: 1 }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {new Date(reservation.masterclasses?.date_heure).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
                      </Typography>
                      {reservation.masterclasses?.intervenant && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Intervenant : {reservation.masterclasses.intervenant}
                        </Typography>
                      )}
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Download />}
                        sx={{
                          width: '100%',
                          borderRadius: 3,
                          fontWeight: 'bold',
                          fontSize: { xs: '0.95rem', sm: '1.05rem' },
                          letterSpacing: 1,
                          py: 1.2,
                          mt: 2,
                          textTransform: 'none'
                        }}
                        onClick={async () => {
                          const toastId = toast.loading('Génération du ticket...');
                          try {
                            const res = await fetch(`/api/download-ticket-masterclass?id=${reservation.id}`);
                            if (!res.ok) {
                              const errorData = await res.json();
                              throw new Error(errorData.message || 'Erreur lors de la génération du ticket');
                            }
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            const titreSafe = reservation.masterclasses?.titre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                            link.setAttribute('download', `ticket-masterclass-${titreSafe}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.parentNode.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            toast.success('Ticket téléchargé !', { id: toastId });
                          } catch (e) {
                            console.error("Erreur téléchargement ticket:", e);
                            toast.error(`Erreur: ${e.message}`, { id: toastId });
                          }
                        }}
                      >
                        TÉLÉCHARGER LE TICKET
                      </Button>
                    </Paper>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune masterclass validée
                </Typography>
              )}
              {settings.ouverture_reservation_masterclass && (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{
                    width: '100%',
                    borderRadius: 999,
                    fontWeight: 'bold',
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    letterSpacing: 1,
                    py: 1.2,
                    my: 1.5,
                    textTransform: 'none',
                    whiteSpace: 'normal',
                    px: 2
                  }}
                  href="/reservation-masterclass"
                >
                  RÉSERVER UNE MASTERCLASS
                </Button>
              )}
            </Paper>
          </Grid>
        )}

        {/* Scanner Badge */}
        {user.valide && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <QrCodeScanner sx={{ mr: 1, verticalAlign: 'middle' }} />
                Scanner un Contact
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scannez le badge d'un autre participant pour échanger vos coordonnées.
              </Typography>
              <Button 
                variant="contained" 
                fullWidth
                href="/scan-contact"
                startIcon={<QrCodeScanner />}
              >
                Ouvrir le scanner
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Contacts Collectés */}
        {user.valide && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <ContactPhone sx={{ mr: 1, verticalAlign: 'middle' }} />
                Contacts Collectés
                <Badge badgeContent={contacts.length} color="primary" sx={{ ml: 2 }} />
              </Typography>
              {contacts.length > 0 ? (
                <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                  {contacts.map((contact, index) => (
                    <ListItem key={index} alignItems="flex-start" divider={index < contacts.length - 1}>
                      <ListItemAvatar>
                        <Avatar>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${contact.prenom} ${contact.nom}`}
                        secondary={
                          <>
                            <Typography
                              sx={{ display: 'block' }}
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {contact.fonction}
                            </Typography>
                            {`${contact.email} • ${contact.telephone || 'N/A'}`}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Aucun contact collecté. Scannez un badge pour commencer !
                </Typography>
              )}
            </Paper>
          </Grid>
        )}

        {/* Postuler CNOL d'Or - Condition d'affichage ajoutée */}
        {user.valide && user.fonction === 'Opticien' && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <EmojiEvents sx={{ mr: 1, verticalAlign: 'middle' }} />
                CNOL d'Or 2025
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Postulez pour le prix CNOL d'Or 2025
              </Typography>
              <Button 
                variant="contained" 
                fullWidth
                href="/cnol-dor"
                startIcon={<EmojiEvents />}
              >
                Postuler au CNOL d'Or
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Réserver un Hôtel */}
        {user.valide && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Hotel sx={{ mr: 1, verticalAlign: 'middle' }} />
                Réserver un Hôtel
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Consultez et réservez dans nos hôtels partenaires
              </Typography>
              <Button 
                variant="contained" 
                fullWidth
                href="/hotels"
                startIcon={<Hotel />}
              >
                Voir les hôtels partenaires
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Section Stands visités - alignée dans la grille */}
        {user.valide && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 2, borderRadius: 4, boxShadow: 1, background: '#f7f7f7' }}>
              <Typography variant="h5" gutterBottom>
                <QrCodeScanner sx={{ mr: 1, verticalAlign: 'middle' }} />
                Stands visités
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<QrCodeScanner />}
                href="/scan-stand-visiteur"
                sx={{ mb: 2 }}
              >
                Scanner un stand
              </Button>
              {loadingStandsVisites ? (
                <CircularProgress sx={{ ml: 2 }} />
              ) : standsVisites.length > 0 ? (
                <List>
                  {standsVisites.map((sv, idx) => (
                    <ListItem key={idx} divider={idx < standsVisites.length - 1}>
                      <ListItemAvatar>
                        <Avatar src={sv.exposant?.logo_url || undefined}>
                          {sv.exposant?.nom ? sv.exposant.nom[0].toUpperCase() : '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={sv.exposant?.nom || 'Stand inconnu'}
                        secondary={
                          <>
                            {sv.exposant?.type_produits && (
                              <Typography component="span" variant="body2" color="text.primary">
                                Produits : {sv.exposant.type_produits}
                              </Typography>
                            )}
                            <br />
                            {sv.created_at && `Visité le ${new Date(sv.created_at).toLocaleString('fr-FR')}`}
                          </>
                        }
                      />
                      {sv.exposant?.id && (
                        <IconButton
                          edge="end"
                          aria-label="download"
                          onClick={() => handleDownloadExposantFiche(sv.exposant?.id, sv.exposant?.nom)}
                        >
                          <Download />
                        </IconButton>
                      )}
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">Aucun stand visité pour l'instant.</Typography>
              )}
            </Paper>
          </Grid>
        )}

        {/* Localisation Événement */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <LocationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
              Localisation de l'Événement
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              CNOL 2025 - Rabat, Maroc
            </Typography>
            <Box sx={{ height: 300, width: '100%', borderRadius: 2, overflow: 'hidden' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3308.556696027705!2d-6.870305288928752!3d33.97823197307313!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda76cdca2be509f%3A0x5737e47164ae0407!2sFondation%20Mohammed%20VI%20de%20Promotion%20des%20Oeuvres%20Sociales%20de%20l'Education%20et%20de%20Formation!5e0!3m2!1sfr!2sma!4v1750541270419!5m2!1sfr!2sma"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Section Exposants */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>Exposants</Typography>
        <Grid container spacing={2}>
          {exposantsList && exposantsList.length > 0 ?
            exposantsList.filter(exp => exp.publie).sort((a, b) => {
              const order = { platinum: 1, gold: 2, 'silver+': 3, silver: 4 };
              const aRank = order[(a.sponsoring_level || '').toLowerCase()] || 99;
              const bRank = order[(b.sponsoring_level || '').toLowerCase()] || 99;
              if (aRank !== bRank) return aRank - bRank;
              return (a.nom || '').localeCompare(b.nom || '');
            }).map(exp => (
              <Grid item xs={12} key={exp.id}>
                <Card sx={{ cursor: 'pointer' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {exp.logo_url && <Avatar src={exp.logo_url} alt={exp.nom} sx={{ width: 48, height: 48, mr: 2 }} />}
                      <Box>
                        <Typography variant="h6">{exp.nom}</Typography>
                        {exp.sponsoring_level && <Chip label={exp.sponsoring_level.toUpperCase()} color="primary" size="small" sx={{ mt: 1 }} />}
                      </Box>
                    </Box>
                    <Button variant="outlined" fullWidth component={Link} href={`/exposant/${exp.id}`}>Voir la fiche</Button>
                  </CardContent>
                </Card>
              </Grid>
            )) : (
            <Typography>Aucun exposant à afficher.</Typography>
          )}
        </Grid>
      </Box>
    </Box>
  );
}
