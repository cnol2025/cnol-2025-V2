import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, Paper, Divider, Button, CircularProgress, TextField, Stack, Alert } from '@mui/material';
import { supabase } from '../lib/supabaseClient';
import QRCode from 'qrcode.react';

export async function getServerSideProps({ req }) {
  const sessionCookie = req.cookies['cnol-session'];
  if (!sessionCookie) {
    return { redirect: { destination: '/identification', permanent: false } };
  }
  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    if (!sessionData || !sessionData.id || sessionData.participant_type !== 'exposant') {
      return { redirect: { destination: '/mon-espace', permanent: false } };
    }
    const { data: user, error } = await supabase
      .from('inscription')
      .select('id, exposant_id')
      .eq('id', sessionData.id)
      .single();
    if (error || !user || !user.exposant_id) {
      return { props: { exposant: null } };
    }
    const { data: exposant, error: expError } = await supabase
      .from('exposants')
      .select('*')
      .eq('id', user.exposant_id)
      .single();
    return { props: { exposant: exposant || null } };
  } catch {
    return { redirect: { destination: '/identification', permanent: false } };
  }
}

export default function MonStand({ exposant }) {
  const router = useRouter();
  const [staffForm, setStaffForm] = useState({ nom: '', prenom: '', email: '', telephone: '', fonction: '' });
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [marqueForm, setMarqueForm] = useState({ nom: '', description: '' });
  const [marqueError, setMarqueError] = useState('');
  const [marqueSuccess, setMarqueSuccess] = useState('');
  const [marquesList, setMarquesList] = useState([]);
  const [loadingMarques, setLoadingMarques] = useState(false);
  const [notificationForm, setNotificationForm] = useState({ titre: '', message: '' });
  const [notificationError, setNotificationError] = useState('');
  const [notificationSuccess, setNotificationSuccess] = useState('');
  const [notificationsList, setNotificationsList] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState({ used: 0, limit: 1, type: 'silver' });
  const [scannedContacts, setScannedContacts] = useState([]);
  const [loadingScan, setLoadingScan] = useState(false);
  const [scanStats, setScanStats] = useState({ total: 0, today: 0 });
  const [personalizationForm, setPersonalizationForm] = useState({
    description: '',
    slogan: '',
    message_accueil: '',
    logo_url: '',
    site_web: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: ''
  });
  const [personalizationError, setPersonalizationError] = useState('');
  const [personalizationSuccess, setPersonalizationSuccess] = useState('');
  const [loadingPersonalization, setLoadingPersonalization] = useState(false);

  // Préremplir le champ fonction avec STAFF + nom société
  useEffect(() => {
    if (exposant) {
      setStaffForm(f => ({ ...f, fonction: `STAFF ${exposant.nom}` }));
    }
  }, [exposant]);

  useEffect(() => {
    if (exposant) fetchStaff();
  }, [exposant]);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    const { data, error } = await supabase
      .from('inscription')
      .select('*')
      .eq('participant_type', 'staff')
      .eq('organisation', exposant.nom);
    setStaffList(data || []);
    setLoadingStaff(false);
  };

  const handleStaffChange = (e) => {
    setStaffForm({ ...staffForm, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffSuccess('');
    if (!staffForm.nom || !staffForm.prenom || !staffForm.email || !staffForm.fonction) {
      setStaffError('Tous les champs sont obligatoires');
      return;
    }
    const res = await fetch('/api/admin/add-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...staffForm,
        exposant_id: exposant.id,
        organisation: exposant.nom,
      }),
    });
    const data = await res.json();
    if (data.error) {
      setStaffError("Erreur lors de l'ajout : " + data.error);
    } else {
      setStaffSuccess('Staff ajouté, badge généré et envoyé par email !');
      setStaffForm({ nom: '', prenom: '', email: '', telephone: '', fonction: `STAFF ${exposant.nom}` });
      fetchStaff();
    }
  };

  // Télécharger le badge PDF d'un staff
  const handleDownloadBadge = async (staff) => {
    try {
      const res = await fetch(`/api/generatedbadge?id=${staff.id}`);
      if (!res.ok) throw new Error('Erreur lors du téléchargement du badge');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `badge-${staff.nom}-${staff.prenom}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  };

  const fetchMarques = async () => {
    setLoadingMarques(true);
    const { data, error } = await supabase
      .from('marques_produits')
      .select('*')
      .eq('exposant_id', exposant.id)
      .order('created_at', { ascending: false });
    setMarquesList(data || []);
    setLoadingMarques(false);
  };

  useEffect(() => {
    if (exposant) fetchMarques();
  }, [exposant]);

  const handleMarqueChange = (e) => {
    setMarqueForm({ ...marqueForm, [e.target.name]: e.target.value });
  };

  const handleAddMarque = async (e) => {
    e.preventDefault();
    setMarqueError('');
    setMarqueSuccess('');
    if (!marqueForm.nom) {
      setMarqueError('Le nom est obligatoire');
      return;
    }
    const { error } = await supabase.from('marques_produits').insert({
      exposant_id: exposant.id,
      nom: marqueForm.nom,
      description: marqueForm.description,
    });
    if (error) {
      setMarqueError("Erreur lors de l'ajout : " + error.message);
    } else {
      setMarqueSuccess('Marque/produit ajouté !');
      setMarqueForm({ nom: '', description: '' });
      fetchMarques();
    }
  };

  const handleDeleteMarque = async (id) => {
    const { error } = await supabase.from('marques_produits').delete().eq('id', id);
    if (!error) fetchMarques();
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('exposant_id', exposant.id)
      .order('created_at', { ascending: false });
    setNotificationsList(data || []);
    setLoadingNotifications(false);
    
    // Calculer le quota d'aujourd'hui selon le type d'exposant
    if (exposant) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todayNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('exposant_id', exposant.id)
        .gte('created_at', today.toISOString());
      
      // Définir le quota selon le type d'exposant
      const quotaLimits = {
        'platinum': 3,
        'gold': 2,
        'silver': 1
      };
      
      const quotaLimit = quotaLimits[exposant.type] || 1;
      setQuotaInfo({ 
        used: todayNotifications ? todayNotifications.length : 0, 
        limit: quotaLimit,
        type: exposant.type 
      });
    }
  };

  useEffect(() => {
    if (exposant) fetchNotifications();
  }, [exposant]);

  const handleNotificationChange = (e) => {
    setNotificationForm({ ...notificationForm, [e.target.name]: e.target.value });
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setNotificationError('');
    setNotificationSuccess('');
    if (!notificationForm.titre || !notificationForm.message) {
      setNotificationError('Le titre et le message sont obligatoires');
      return;
    }
    
    try {
      const res = await fetch('/api/push/send-exposant-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exposant_id: exposant.id,
          titre: notificationForm.titre,
          message: notificationForm.message,
        }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setNotificationError(data.message || data.error || 'Erreur de quota');
        fetchNotifications(); // Rafraîchir le quota
      } else if (!res.ok) {
        setNotificationError(data.message || data.error || 'Erreur serveur');
      } else {
        setNotificationSuccess('Notification envoyée à tous les abonnés !');
        setNotificationForm({ titre: '', message: '' });
        fetchNotifications();
      }
    } catch (error) {
      setNotificationError("Erreur de connexion au serveur");
    }
  };

  const fetchScannedContacts = async () => {
    setLoadingScan(true);
    const { data, error } = await supabase
      .from('scan_contacts')
      .select(`
        *,
        participant:inscription!scan_contacts_participant_id_fkey (
          nom, prenom, email, fonction, organisation
        )
      `)
      .eq('exposant_id', exposant.id)
      .order('created_at', { ascending: false });
    setScannedContacts(data || []);
    
    // Calculer les statistiques
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayScans = data ? data.filter(scan => new Date(scan.created_at) >= today) : [];
    setScanStats({ total: data ? data.length : 0, today: todayScans.length });
    setLoadingScan(false);
  };

  useEffect(() => {
    if (exposant) fetchScannedContacts();
  }, [exposant]);

  const generateQRCode = () => {
    // Générer un QR code avec l'ID du stand pour le scan
    return `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/scan-stand?stand=${exposant.id}`;
  };

  const fetchPersonalization = async () => {
    setLoadingPersonalization(true);
    const { data, error } = await supabase
      .from('exposants')
      .select('description, slogan, message_accueil, logo_url, site_web, linkedin, twitter, facebook, instagram')
      .eq('id', exposant.id)
      .single();
    
    if (data) {
      setPersonalizationForm({
        description: data.description || '',
        slogan: data.slogan || '',
        message_accueil: data.message_accueil || '',
        logo_url: data.logo_url || '',
        site_web: data.site_web || '',
        linkedin: data.linkedin || '',
        twitter: data.twitter || '',
        facebook: data.facebook || '',
        instagram: data.instagram || ''
      });
    }
    setLoadingPersonalization(false);
  };

  useEffect(() => {
    if (exposant) fetchPersonalization();
  }, [exposant]);

  const handlePersonalizationChange = (e) => {
    setPersonalizationForm({ ...personalizationForm, [e.target.name]: e.target.value });
  };

  const handleSavePersonalization = async (e) => {
    e.preventDefault();
    setPersonalizationError('');
    setPersonalizationSuccess('');
    
    try {
      const { error } = await supabase
        .from('exposants')
        .update(personalizationForm)
        .eq('id', exposant.id);
      
      if (error) {
        setPersonalizationError("Erreur lors de la sauvegarde : " + error.message);
      } else {
        setPersonalizationSuccess('Personnalisation sauvegardée avec succès !');
      }
    } catch (error) {
      setPersonalizationError("Erreur de connexion au serveur");
    }
  };

  if (!exposant) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /><Typography sx={{ mt: 2 }}>Chargement des infos du stand...</Typography></Box>;
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Administration de mon stand
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Bloc Infos Stand */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Infos du stand</Typography>
        <Typography><b>Nom société :</b> {exposant.nom}</Typography>
        <Typography><b>Email responsable :</b> {exposant.email_responsable}</Typography>
      </Paper>

      {/* Bloc Marques & Produits */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Marques & Produits</Typography>
        <form onSubmit={handleAddMarque}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
            <TextField label="Nom de la marque/produit" name="nom" value={marqueForm.nom} onChange={handleMarqueChange} required fullWidth />
            <TextField label="Description" name="description" value={marqueForm.description} onChange={handleMarqueChange} fullWidth />
            <Button type="submit" variant="contained" color="primary">Ajouter</Button>
          </Stack>
          {marqueError && <Alert severity="error" sx={{ mb: 2 }}>{marqueError}</Alert>}
          {marqueSuccess && <Alert severity="success" sx={{ mb: 2 }}>{marqueSuccess}</Alert>}
        </form>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Liste des marques/produits</Typography>
        {loadingMarques ? <CircularProgress /> : marquesList.length === 0 ? (
          <Typography color="text.secondary">Aucune marque/produit ajouté.</Typography>
        ) : (
          <Stack spacing={1}>
            {marquesList.map(marque => (
              <Paper key={marque.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography><b>{marque.nom}</b></Typography>
                  <Typography variant="body2" color="text.secondary">{marque.description}</Typography>
                </Box>
                <Box>
                  <Button color="error" onClick={() => handleDeleteMarque(marque.id)}>Supprimer</Button>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Bloc Notifications Équipe */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Notifications Publiques</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Envoyez des notifications à tous les abonnés de l'application (promotions, annonces, etc.)
        </Typography>
        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <b>Quota quotidien :</b> {quotaInfo.used}/{quotaInfo.limit} notifications utilisées aujourd'hui
          </Typography>
          <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
            <b>Type d'exposant :</b> {quotaInfo.type?.toUpperCase() || 'SILVER'}
          </Typography>
          {quotaInfo.used >= quotaInfo.limit && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              ⚠️ Quota atteint. Vous pourrez envoyer de nouvelles notifications demain.
            </Typography>
          )}
        </Box>
        <form onSubmit={handleSendNotification}>
          <Stack spacing={2} sx={{ mb: 2 }}>
            <TextField label="Titre de la notification" name="titre" value={notificationForm.titre} onChange={handleNotificationChange} required fullWidth />
            <TextField label="Message" name="message" value={notificationForm.message} onChange={handleNotificationChange} required fullWidth multiline rows={3} />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              sx={{ alignSelf: 'flex-start' }}
              disabled={quotaInfo.used >= quotaInfo.limit}
            >
              Envoyer à tous les abonnés
            </Button>
          </Stack>
          {notificationError && <Alert severity="error" sx={{ mb: 2 }}>{notificationError}</Alert>}
          {notificationSuccess && <Alert severity="success" sx={{ mb: 2 }}>{notificationSuccess}</Alert>}
        </form>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Historique des notifications</Typography>
        {loadingNotifications ? <CircularProgress /> : notificationsList.length === 0 ? (
          <Typography color="text.secondary">Aucune notification envoyée.</Typography>
        ) : (
          <Stack spacing={1}>
            {notificationsList.map(notif => (
              <Paper key={notif.id} sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold">{notif.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{notif.body}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(notif.created_at).toLocaleString('fr-FR')}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Bloc Staff */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Staff</Typography>
        <form onSubmit={handleAddStaff}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
            <TextField label="Nom" name="nom" value={staffForm.nom} onChange={handleStaffChange} required fullWidth />
            <TextField label="Prénom" name="prenom" value={staffForm.prenom} onChange={handleStaffChange} required fullWidth />
            <TextField label="Email" name="email" value={staffForm.email} onChange={handleStaffChange} required fullWidth />
            <TextField label="Téléphone" name="telephone" value={staffForm.telephone} onChange={handleStaffChange} fullWidth />
            <TextField label="Fonction" name="fonction" value={staffForm.fonction} onChange={handleStaffChange} required fullWidth />
            <TextField label="Type" value="staff" disabled fullWidth />
            <TextField label="Nom de la société" value={exposant.nom} disabled fullWidth />
          </Stack>
          {staffError && <Alert severity="error" sx={{ mb: 2 }}>{staffError}</Alert>}
          {staffSuccess && <Alert severity="success" sx={{ mb: 2 }}>{staffSuccess}</Alert>}
          <Button type="submit" variant="contained" color="primary">Ajouter le staff</Button>
        </form>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Liste du staff</Typography>
        {loadingStaff ? <CircularProgress /> : staffList.length === 0 ? (
          <Typography color="text.secondary">Aucun staff ajouté pour ce stand.</Typography>
        ) : (
          <Stack spacing={1}>
            {staffList.map(staff => (
              <Paper key={staff.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography><b>{staff.prenom} {staff.nom}</b> ({staff.email})</Typography>
                  <Typography variant="body2" color="text.secondary">Téléphone : {staff.telephone || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Fonction : {staff.fonction || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Badge : {staff.identifiant_badge}</Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={() => handleDownloadBadge(staff)}
                  sx={{ ml: 2 }}
                >
                  Télécharger badge
                </Button>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Bloc Scan */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Scan de contacts</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Gérez les contacts scannés par votre équipe
        </Typography>
        
        {/* Statistiques */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 2, minWidth: 120, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="h4">{scanStats.total}</Typography>
            <Typography variant="body2">Total contacts</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 120, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
            <Typography variant="h4">{scanStats.today}</Typography>
            <Typography variant="body2">Aujourd'hui</Typography>
          </Paper>
        </Box>

        {/* QR Code du stand */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            QR Code de votre stand
          </Typography>
          <Box sx={{ 
            display: 'inline-block', 
            p: 2, 
            border: '2px dashed grey', 
            borderRadius: 2,
            bgcolor: 'grey.50'
          }}>
            <QRCode value={generateQRCode()} size={160} fgColor="#1976d2" bgColor="#fff" includeMargin={true} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {generateQRCode()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Scannez ce QR code pour enregistrer un contact
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        
        {/* Liste des contacts scannés */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Contacts scannés</Typography>
        {loadingScan ? <CircularProgress /> : scannedContacts.length === 0 ? (
          <Typography color="text.secondary">Aucun contact scanné pour le moment.</Typography>
        ) : (
          <Stack spacing={1}>
            {scannedContacts.map(scan => (
              <Paper key={scan.id} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {scan.participant?.prenom} {scan.participant?.nom}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {scan.participant?.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {scan.participant?.fonction} - {scan.participant?.organisation}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(scan.created_at).toLocaleString('fr-FR')}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Bloc Personnalisation */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Personnalisation du stand</Typography>
        <form onSubmit={handleSavePersonalization}>
          <Stack spacing={2} direction="column" sx={{ mb: 2 }}>
            <TextField label="Description" name="description" value={personalizationForm.description} onChange={handlePersonalizationChange} fullWidth />
            <TextField label="Slogan" name="slogan" value={personalizationForm.slogan} onChange={handlePersonalizationChange} fullWidth />
            <TextField label="Message d'accueil" name="message_accueil" value={personalizationForm.message_accueil} onChange={handlePersonalizationChange} fullWidth />
            <TextField label="Logo URL" name="logo_url" value={personalizationForm.logo_url} onChange={handlePersonalizationChange} fullWidth />
            <TextField label="Site web" name="site_web" value={personalizationForm.site_web} onChange={handlePersonalizationChange} fullWidth />
            <TextField label="LinkedIn" name="linkedin" value={personalizationForm.linkedin} onChange={handlePersonalizationChange} fullWidth />
            <TextField label="Twitter" name="twitter" value={personalizationForm.twitter} onChange={handlePersonalizationChange} fullWidth />
            <TextField label="Facebook" name="facebook" value={personalizationForm.facebook} onChange={handlePersonalizationChange} fullWidth />
            <TextField label="Instagram" name="instagram" value={personalizationForm.instagram} onChange={handlePersonalizationChange} fullWidth />
          </Stack>
          {personalizationError && <Alert severity="error" sx={{ mb: 2 }}>{personalizationError}</Alert>}
          {personalizationSuccess && <Alert severity="success" sx={{ mb: 2 }}>{personalizationSuccess}</Alert>}
          <Button type="submit" variant="contained" color="primary">Sauvegarder</Button>
        </form>
        {/* Aperçu et bouton publier pour l'admin */}
        {typeof window !== 'undefined' && localStorage.getItem('admin_auth') === 'true' && (
          <Box sx={{ mt: 4, p: 2, bgcolor: '#f9f9f9', borderRadius: 2 }}>
            <Typography variant="subtitle2">Aperçu Stand (admin)</Typography>
            <Typography><b>Slogan :</b> {personalizationForm.slogan}</Typography>
            <Typography><b>Message d'accueil :</b> {personalizationForm.message_accueil}</Typography>
            <Typography><b>Site web :</b> {personalizationForm.site_web}</Typography>
            <Typography><b>LinkedIn :</b> {personalizationForm.linkedin}</Typography>
            <Typography><b>Twitter :</b> {personalizationForm.twitter}</Typography>
            <Typography><b>Facebook :</b> {personalizationForm.facebook}</Typography>
            <Typography><b>Instagram :</b> {personalizationForm.instagram}</Typography>
            <Typography><b>Logo :</b> <a href={personalizationForm.logo_url} target="_blank" rel="noopener noreferrer">{personalizationForm.logo_url}</a></Typography>
            <Button
              variant={exposant.publie ? "contained" : "outlined"}
              color={exposant.publie ? "success" : "primary"}
              onClick={async () => {
                await supabase.from('exposants').update({ publie: !exposant.publie }).eq('id', exposant.id);
                window.location.reload();
              }}
              sx={{ mt: 2 }}
            >
              {exposant.publie ? "Publié (Cacher)" : "Publier"}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}