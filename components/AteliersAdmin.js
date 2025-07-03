import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Box, Button, TextField, Typography, List, ListItem, IconButton, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Stack, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ListIcon from '@mui/icons-material/List';
import DownloadIcon from '@mui/icons-material/Download';
import toast from 'react-hot-toast';

export default function AteliersAdmin() {
  const [ateliers, setAteliers] = useState([])
  const [newAtelier, setNewAtelier] = useState({
    titre: '', intervenant: '', date_heure: '', salle: '', places: ''
  })
  const [openAtelierId, setOpenAtelierId] = useState(null)
  const [internalResas, setInternalResas] = useState([])
  const [internalForm, setInternalForm] = useState({ nom: '', prenom: '', email: '', telephone: '' })
  const [internalError, setInternalError] = useState('')
  const [editAtelier, setEditAtelier] = useState(null)
  const [editForm, setEditForm] = useState({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' })
  const [editError, setEditError] = useState('')
  const [openListAtelierId, setOpenListAtelierId] = useState(null)
  const [listResas, setListResas] = useState([])
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  useEffect(() => { fetchAteliers() }, [])

  const fetchAteliers = async () => {
    const { data, error } = await supabase.from('ateliers').select('*').order('date_heure')
    if (!error) setAteliers(data)
  }

  const handleAdd = async () => {
    setAddError('')
    setAddSuccess('')
    if (!newAtelier.titre || !newAtelier.intervenant || !newAtelier.date_heure || !newAtelier.salle || !newAtelier.places) {
      setAddError('Tous les champs sont obligatoires')
      return
    }
    const { error } = await supabase.from('ateliers').insert([newAtelier])
    if (error) {
      setAddError('Erreur lors de l\'ajout : ' + error.message)
      console.error('Erreur ajout atelier:', error)
    } else {
      setAddSuccess('Atelier ajouté avec succès !')
      setNewAtelier({ titre: '', intervenant: '', date_heure: '', salle: '', places: '' })
      fetchAteliers()
    }
  }

  const handleDelete = async (id) => {
    await supabase.from('ateliers').delete().eq('id', id)
    fetchAteliers()
  }

  const fetchInternalResas = async (atelierId) => {
    const { data } = await supabase.from('reservations_ateliers').select('*').eq('atelier_id', atelierId).eq('type', 'interne')
    setInternalResas(data || [])
  }

  const handleOpenInternal = async (atelierId) => {
    setOpenAtelierId(atelierId)
    await fetchInternalResas(atelierId)
  }

  const handleAddInternal = async () => {
    setInternalError('')
    if (!internalForm.nom || !internalForm.prenom || !internalForm.email || !internalForm.telephone) {
      setInternalError('Tous les champs sont obligatoires')
      return
    }
    if (internalResas.length >= 15) {
      setInternalError('Limite de 15 réservations internes atteinte')
      return
    }
    const { data: user } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email, telephone, participant_type')
      .eq('email', internalForm.email.trim())
      .single();
    if (!user) {
      setInternalError("Cet utilisateur n'existe pas dans la base des inscrits. Veuillez l'ajouter d'abord.");
      return;
    }
    const { error: insertError } = await supabase
      .from('reservations_ateliers')
      .insert({
        atelier_id: openAtelierId,
        participant_id: user.id,
        type: user.participant_type === 'exposant' || user.participant_type === 'intervenant' || user.participant_type === 'vip' || user.participant_type === 'organisation' ? 'interne' : 'externe',
        valide: true,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
      });
    if (insertError) {
      console.error('Erreur insertion directe:', insertError);
      setInternalError('Erreur lors de l\'ajout : ' + insertError.message);
    } else {
      setInternalForm({ nom: '', prenom: '', email: '', telephone: '' });
      await fetchInternalResas(openAtelierId);
      toast.success('Participant ajouté à l\'atelier !');
    }
  }

  const handleOpenEdit = (atelier) => {
    setEditAtelier(atelier)
    setEditForm({
      titre: atelier.titre,
      intervenant: atelier.intervenant,
      date_heure: atelier.date_heure,
      salle: atelier.salle,
      places: atelier.places
    })
    setEditError('')
  }

  const handleEdit = async () => {
    setEditError('')
    if (!editForm.titre || !editForm.date_heure) {
      setEditError('Titre et date/heure obligatoires')
      return
    }
    const { error } = await supabase.from('ateliers').update(editForm).eq('id', editAtelier.id)
    if (error) {
      setEditError('Erreur lors de la modification')
    } else {
      setEditAtelier(null)
      fetchAteliers()
    }
  }

  const handleExport = async (atelier) => {
    const { data: resas } = await supabase
      .from('reservations_ateliers')
      .select('*')
      .eq('atelier_id', atelier.id)
    const header = [
      'Titre atelier', 'Intervenant', 'Jour/heure', 'Salle', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Type', 'Validé', 'Scanné'
    ]
    const rows = (resas || []).map(r => [
      atelier.titre,
      atelier.intervenant,
      atelier.date_heure,
      atelier.salle,
      r.nom,
      r.prenom,
      r.email,
      r.telephone || '',
      r.type,
      r.valide ? 'Oui' : 'Non',
      r.scanned ? 'Oui' : 'Non'
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atelier-${atelier.titre.replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenList = async (atelierId) => {
    setOpenListAtelierId(atelierId)
    const { data } = await supabase.from('reservations_ateliers').select('*').eq('atelier_id', atelierId)
    setListResas(data || [])
  }

  const handleValidate = async (resaId) => {
    const res = await fetch('/api/valider-reservation-atelier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
      toast.success('Réservation validée et ticket envoyé !')
      fetchInternalResas(openAtelierId)
      handleOpenList(openAtelierId)
    } else {
      toast.error('Erreur lors de la validation')
    }
  }

  const handleRefuse = async (resaId) => {
    const res = await fetch('/api/refuser-reservation-atelier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
      toast.success('Réservation refusée')
      fetchInternalResas(openAtelierId)
      handleOpenList(openAtelierId)
    } else {
      toast.error('Erreur lors du refus')
    }
  }

  const handleResendTicket = async (resaId) => {
    const res = await fetch('/api/renvoyer-ticket-atelier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resaId })
    })
    if (res.ok) {
      toast.success('Ticket renvoyé !')
    } else {
      toast.error('Erreur lors du renvoi du ticket')
    }
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      <Typography variant="h4" gutterBottom>Gestion des Ateliers</Typography>
      <pre style={{ background: '#eee', padding: 8, fontSize: 12, marginBottom: 16 }}>
        {JSON.stringify(ateliers, null, 2)}
      </pre>
      {Array.isArray(ateliers) && ateliers.length === 0 && (
        <Typography color="error">Aucun atelier trouvé ou erreur de chargement.</Typography>
      )}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Ajouter un atelier</Typography>
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
          <TextField
            label="Titre"
            value={newAtelier.titre}
            onChange={(e) => setNewAtelier({ ...newAtelier, titre: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Intervenant"
            value={newAtelier.intervenant}
            onChange={(e) => setNewAtelier({ ...newAtelier, intervenant: e.target.value })}
            fullWidth
            required
          />
        </Stack>
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
          <TextField
            label="Date et heure"
            type="datetime-local"
            value={newAtelier.date_heure}
            onChange={(e) => setNewAtelier({ ...newAtelier, date_heure: e.target.value })}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Salle"
            value={newAtelier.salle}
            onChange={(e) => setNewAtelier({ ...newAtelier, salle: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Places"
            type="number"
            value={newAtelier.places}
            onChange={(e) => setNewAtelier({ ...newAtelier, places: e.target.value })}
            fullWidth
            required
          />
        </Stack>
        {addError && <Typography color="error" sx={{ mb: 2 }}>{addError}</Typography>}
        {addSuccess && <Typography color="success.main" sx={{ mb: 2 }}>{addSuccess}</Typography>}
        <Button variant="contained" color="primary" onClick={handleAdd} fullWidth={isMobile}>
          Ajouter l'atelier
        </Button>
      </Paper>
      <Typography variant="h6" gutterBottom>Liste des ateliers</Typography>
      <Stack spacing={2}>
        {ateliers.map(atelier => (
          <Paper key={atelier.id} sx={{ p: 2, mb: 2 }}>
            <Stack spacing={1}>
              <Typography variant="h6">{atelier.titre}</Typography>
              <Typography><b>Intervenant :</b> {atelier.intervenant}</Typography>
              <Typography><b>Date/Heure :</b> {new Date(atelier.date_heure).toLocaleString()}</Typography>
              <Typography><b>Salle :</b> {atelier.salle}</Typography>
              <Typography><b>Places :</b> {atelier.places}</Typography>
              <Typography><b>Places restantes :</b> {atelier.places - (atelier.reservations_validated || 0)}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                <Button variant="outlined" color="primary" onClick={() => handleOpenInternal(atelier.id)} fullWidth={isMobile}>Réservations internes</Button>
                <Button variant="outlined" color="secondary" onClick={() => handleOpenList(atelier.id)} startIcon={<ListIcon />} fullWidth={isMobile}>Liste inscrits</Button>
                <Button variant="outlined" color="success" onClick={() => handleExport(atelier)} startIcon={<DownloadIcon />} fullWidth={isMobile}>Exporter</Button>
                <Button variant={atelier.publie ? 'outlined' : 'contained'} color={atelier.publie ? 'warning' : 'success'} onClick={async () => { await supabase.from('ateliers').update({ publie: !atelier.publie }).eq('id', atelier.id); fetchAteliers(); }} fullWidth={isMobile}>{atelier.publie ? 'Cacher' : 'Publier'}</Button>
                <Button variant="outlined" color="warning" onClick={() => handleOpenEdit(atelier)} startIcon={<EditIcon />} fullWidth={isMobile}>Modifier</Button>
                <Button variant="outlined" color="error" onClick={() => handleDelete(atelier.id)} startIcon={<DeleteIcon />} fullWidth={isMobile}>Supprimer</Button>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
      {/* Dialogs ... (voir code complet pour les dialogs internes, liste, modification) */}
    </Box>
  )
} 