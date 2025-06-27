import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, Paper, Divider, Button, CircularProgress, TextField, Stack, Alert, Avatar, IconButton, Chip } from '@mui/material';
import { supabase } from '../lib/supabaseClient';
import QRCode from 'qrcode.react';
import PhotoCamera from '@mui/icons-material/PhotoCamera';

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
  const [form, setForm] = useState({
    logo_url: exposant?.logo_url || '',
    type_produits: exposant?.type_produits || '',
    marques: exposant?.marques || [''],
    responsables: exposant?.responsables || [{ fonction: '', nom: '', prenom: '', telephones: [''], emails: [''] }],
    telephones: exposant?.telephones || [''],
    emails: exposant?.emails || [''],
    adresses: exposant?.adresses || [''],
    site_web: exposant?.site_web || '',
    facebook: exposant?.facebook || '',
    instagram: exposant?.instagram || '',
    linkedin: exposant?.linkedin || '',
    twitter: exposant?.twitter || ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Gestion logo
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // TODO: upload réel sur Supabase Storage, ici on simule l'URL locale
    const url = URL.createObjectURL(file);
    setForm(f => ({ ...f, logo_url: url }));
  };

  // Gestion responsables dynamiques
  const handleResponsableChange = (idx, field, value) => {
    setForm(f => {
      const responsables = [...f.responsables];
      responsables[idx][field] = value;
      return { ...f, responsables };
    });
  };
  const addResponsable = () => setForm(f => ({ ...f, responsables: [...f.responsables, { fonction: '', nom: '', prenom: '', telephones: [''], emails: [''] }] }));
  const removeResponsable = (idx) => setForm(f => ({ ...f, responsables: f.responsables.filter((_, i) => i !== idx) }));
  // Téléphones dynamiques pour chaque responsable
  const handleResponsableTelChange = (rIdx, tIdx, value) => {
    setForm(f => {
      const responsables = [...f.responsables];
      const tels = [...(responsables[rIdx].telephones || [''])];
      tels[tIdx] = value;
      responsables[rIdx].telephones = tels;
      return { ...f, responsables };
    });
  };
  const addResponsableTel = (rIdx) => {
    setForm(f => {
      const responsables = [...f.responsables];
      responsables[rIdx].telephones = [...(responsables[rIdx].telephones || ['']), ''];
      return { ...f, responsables };
    });
  };
  const removeResponsableTel = (rIdx, tIdx) => {
    setForm(f => {
      const responsables = [...f.responsables];
      responsables[rIdx].telephones = responsables[rIdx].telephones.filter((_, i) => i !== tIdx);
      return { ...f, responsables };
    });
  };
  // Emails dynamiques pour chaque responsable
  const handleResponsableEmailChange = (rIdx, eIdx, value) => {
    setForm(f => {
      const responsables = [...f.responsables];
      const emails = [...(responsables[rIdx].emails || [''])];
      emails[eIdx] = value;
      responsables[rIdx].emails = emails;
      return { ...f, responsables };
    });
  };
  const addResponsableEmail = (rIdx) => {
    setForm(f => {
      const responsables = [...f.responsables];
      responsables[rIdx].emails = [...(responsables[rIdx].emails || ['']), ''];
      return { ...f, responsables };
    });
  };
  const removeResponsableEmail = (rIdx, eIdx) => {
    setForm(f => {
      const responsables = [...f.responsables];
      responsables[rIdx].emails = responsables[rIdx].emails.filter((_, i) => i !== eIdx);
      return { ...f, responsables };
    });
  };

  // Gestion marques dynamiques
  const handleMarqueChange = (idx, value) => {
    setForm(f => {
      const marques = [...f.marques];
      marques[idx] = value;
      return { ...f, marques };
    });
  };
  const addMarque = () => setForm(f => ({ ...f, marques: [...f.marques, ''] }));
  const removeMarque = (idx) => setForm(f => ({ ...f, marques: f.marques.filter((_, i) => i !== idx) }));

  // Gestion champs simples
  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Fonctions utilitaires pour téléphones dynamiques
  const handleTelChange = (idx, value) => {
    setForm(f => {
      const telephones = [...f.telephones];
      telephones[idx] = value;
      return { ...f, telephones };
    });
  };
  const addTel = () => setForm(f => ({ ...f, telephones: [...f.telephones, ''] }));
  const removeTel = (idx) => setForm(f => ({ ...f, telephones: f.telephones.filter((_, i) => i !== idx) }));

  // Fonctions utilitaires pour adresses dynamiques
  const handleAdresseChange = (idx, value) => {
    setForm(f => {
      const adresses = [...f.adresses];
      adresses[idx] = value;
      return { ...f, adresses };
    });
  };
  const addAdresse = () => setForm(f => ({ ...f, adresses: [...f.adresses, ''] }));
  const removeAdresse = (idx) => setForm(f => ({ ...f, adresses: f.adresses.filter((_, i) => i !== idx) }));

  // Sauvegarde
  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const { error } = await supabase.from('exposants').update({
        logo_url: form.logo_url,
        type_produits: form.type_produits,
        marques: form.marques,
        responsables: form.responsables,
        telephones: form.telephones,
        emails: form.emails,
        adresses: form.adresses,
        site_web: form.site_web,
        facebook: form.facebook,
        instagram: form.instagram,
        linkedin: form.linkedin,
        twitter: form.twitter
      }).eq('id', exposant.id);
      if (error) setError("Erreur lors de la sauvegarde : " + error.message);
      else setSuccess('Fiche exposant sauvegardée !');
    } catch (err) {
      setError("Erreur : " + err.message);
    }
    setLoading(false);
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

      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Avatar src={exposant?.logo_url || undefined} alt={exposant?.nom} sx={{ width: 120, height: 120, mb: 2, fontSize: 48 }}>
            {(!exposant?.logo_url && exposant?.nom) ? exposant.nom[0].toUpperCase() : ''}
          </Avatar>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>{exposant?.nom}</Typography>
          <Chip label={exposant?.sponsoring_level || 'Standard'} color="primary" size="medium" sx={{ mb: 2 }} />
        </Paper>
      </Box>

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
        <Typography variant="h5" fontWeight="bold" gutterBottom>Personnalisation de la fiche exposant</Typography>
        <form onSubmit={handleSave}>
          <Stack spacing={2}>
            {/* Logo */}
            <Box>
              <Typography variant="subtitle1">Logo</Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={form.logo_url || undefined} alt="logo" sx={{ width: 80, height: 80, bgcolor: !form.logo_url ? 'grey.200' : undefined, color: 'primary.main', fontWeight: 'bold' }}>
                  {!form.logo_url && 'Logo'}
                </Avatar>
                <IconButton color="primary" component="label">
                  <PhotoCamera />
                  <input hidden type="file" accept="image/*" onChange={handleLogoChange} />
                </IconButton>
                <TextField label="Logo URL" name="logo_url" value={form.logo_url} onChange={handleChange} fullWidth sx={{ ml: 2 }} />
              </Stack>
            </Box>
            {/* Type de produits */}
            <TextField label="Type de produits" name="type_produits" value={form.type_produits} onChange={handleChange} fullWidth multiline minRows={2} />
            {/* Marques dynamiques */}
            <Typography variant="subtitle1">Marques / Produits</Typography>
            {(form.marques || []).map((marque, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <TextField label={`Marque ou produit #${idx+1}`} value={marque} onChange={e => handleMarqueChange(idx, e.target.value)} fullWidth />
                <Button color="error" onClick={() => removeMarque(idx)} disabled={form.marques.length === 1}>Supprimer</Button>
              </Stack>
            ))}
            <Button onClick={addMarque} variant="outlined">Ajouter une marque/produit</Button>
            {/* Responsables dynamiques */}
            <Typography variant="subtitle1">Les responsables de la société</Typography>
            {(form.responsables || []).map((resp, idx) => (
              <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                <Stack spacing={1}>
                  <TextField label="Poste" value={resp.fonction} onChange={e => handleResponsableChange(idx, 'fonction', e.target.value)} fullWidth />
                  <TextField label="Nom" value={resp.nom} onChange={e => handleResponsableChange(idx, 'nom', e.target.value)} fullWidth />
                  <TextField label="Prénom" value={resp.prenom} onChange={e => handleResponsableChange(idx, 'prenom', e.target.value)} fullWidth />
                  <Typography variant="subtitle2">Téléphones</Typography>
                  {(resp.telephones || []).map((tel, tIdx) => (
                    <Stack key={tIdx} direction="row" spacing={1}>
                      <TextField label={`Téléphone #${tIdx+1}`} value={tel} onChange={e => handleResponsableTelChange(idx, tIdx, e.target.value)} fullWidth />
                      <Button color="error" onClick={() => removeResponsableTel(idx, tIdx)} disabled={resp.telephones.length === 1}>Supprimer</Button>
                    </Stack>
                  ))}
                  <Button onClick={() => addResponsableTel(idx)} variant="outlined">Ajouter un téléphone</Button>
                  <Typography variant="subtitle2">Emails</Typography>
                  {(resp.emails || []).map((mail, eIdx) => (
                    <Stack key={eIdx} direction="row" spacing={1}>
                      <TextField label={`Email #${eIdx+1}`} value={mail} onChange={e => handleResponsableEmailChange(idx, eIdx, e.target.value)} fullWidth />
                      <Button color="error" onClick={() => removeResponsableEmail(idx, eIdx)} disabled={resp.emails.length === 1}>Supprimer</Button>
                    </Stack>
                  ))}
                  <Button onClick={() => addResponsableEmail(idx)} variant="outlined">Ajouter un email</Button>
                  <Button color="error" onClick={() => removeResponsable(idx)} disabled={form.responsables.length === 1}>Supprimer ce responsable</Button>
                </Stack>
              </Paper>
            ))}
            <Button onClick={addResponsable} variant="outlined">Ajouter un responsable</Button>
            {/* Téléphones */}
            <Typography variant="subtitle1">Téléphone(s)</Typography>
            {(form.telephones || []).map((tel, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <TextField label={`Téléphone #${idx+1}`} value={tel} onChange={e => handleTelChange(idx, e.target.value)} fullWidth />
                <Button color="error" onClick={() => removeTel(idx)} disabled={form.telephones.length === 1}>Supprimer</Button>
              </Stack>
            ))}
            <Button onClick={addTel} variant="outlined">Ajouter un téléphone</Button>
            {/* Emails */}
            <Typography variant="subtitle1">Email(s)</Typography>
            {(form.emails || []).map((email, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <TextField label={`Email #${idx+1}`} value={email} onChange={e => handleChange(e)} fullWidth />
                <Button color="error" onClick={() => handleChange({ target: { name: 'emails', value: form.emails.filter((_, i) => i !== idx) } })} disabled={form.emails.length === 1}>Supprimer</Button>
              </Stack>
            ))}
            <Button onClick={() => handleChange({ target: { name: 'emails', value: [...form.emails, ''] } })} variant="outlined">Ajouter un email</Button>
            {/* Adresses */}
            <Typography variant="subtitle1">Adresse(s) postale(s)</Typography>
            {(form.adresses || []).map((adr, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <TextField label={`Adresse #${idx+1}`} value={adr} onChange={e => handleAdresseChange(idx, e.target.value)} fullWidth />
                <Button color="error" onClick={() => removeAdresse(idx)} disabled={form.adresses.length === 1}>Supprimer</Button>
              </Stack>
            ))}
            <Button onClick={addAdresse} variant="outlined">Ajouter une adresse</Button>
            {/* Site web */}
            <TextField label="Site web" name="site_web" value={form.site_web} onChange={handleChange} fullWidth />
            {/* Réseaux sociaux */}
            <TextField label="Facebook" name="facebook" value={form.facebook} onChange={handleChange} fullWidth />
            <TextField label="Instagram" name="instagram" value={form.instagram} onChange={handleChange} fullWidth />
            <TextField label="LinkedIn" name="linkedin" value={form.linkedin} onChange={handleChange} fullWidth />
            <TextField label="Twitter" name="twitter" value={form.twitter} onChange={handleChange} fullWidth />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <Button type="submit" variant="contained" color="primary" disabled={loading}>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</Button>
            <Button variant="outlined" color="secondary" onClick={() => setForm({
              logo_url: '',
              type_produits: 'Montures, Lentilles, Accessoires',
              marques: ['Biolens', 'OptiView', 'VisionX'],
              responsables: [
                { fonction: 'Directeur', nom: 'Dupont', prenom: 'Jean', telephones: ['0600000001'], emails: ['jean.dupont@exemple.com'] },
                { fonction: 'Responsable Commercial', nom: 'Martin', prenom: 'Sophie', telephones: ['0600000002'], emails: ['sophie.martin@exemple.com'] }
              ],
              telephones: ['0600000003', '0600000004'],
              emails: ['contact@exposant.com', 'info@exposant.com'],
              adresses: ['123 rue de la Vue, Casablanca', '456 avenue des Opticiens, Rabat'],
              site_web: 'https://www.exposant.com',
              facebook: 'exposantfb',
              instagram: '@exposantinsta',
              linkedin: 'exposant-linkedin',
              twitter: '@exposanttw'
            })}>
              Préremplir
            </Button>
          </Stack>
        </form>
      </Paper>

      {/* Après le Paper d'aperçu fiche exposant : */}
      <Box sx={{ mt: 2, mb: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3 }}
          onClick={async () => {
            await supabase.from('exposants').update({ publie: !exposant.publie }).eq('id', exposant.id);
            window.location.reload();
          }}
        >
          {exposant.publie ? "Publié (Cacher)" : "Publier"}
        </Button>
      </Box>
    </Box>
  );
}