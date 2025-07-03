import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Box, Button, Typography, Paper, Stack, TextField, Avatar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, InputLabel, FormControl, List, ListItem, ListItemAvatar, ListItemText, Divider, CircularProgress
} from '@mui/material';
import { Add, Edit, Delete, PhotoCamera, MoreVert } from '@mui/icons-material';

export default function IntervenantsAdmin() {
  const [intervenants, setIntervenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', fonction: '', organisation: '', biographie: '', photo_url: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [selectedIntervenant, setSelectedIntervenant] = useState(null);
  const [interventionForm, setInterventionForm] = useState({ type: '', titre: '', horaire: '', salle: '' });
  const [editInterventionId, setEditInterventionId] = useState(null);
  const [socials, setSocials] = useState({ facebook: '', instagram: '', linkedin: '', site: '' });

  useEffect(() => { fetchIntervenants(); }, []);

  async function fetchIntervenants() {
    setLoading(true);
    const { data, error } = await supabase.from('intervenants').select('*').order('nom');
    if (!error) setIntervenants(data);
    setLoading(false);
  }

  async function fetchInterventions(intervenant_id) {
    const { data } = await supabase.from('interventions').select('*').eq('intervenant_id', intervenant_id);
    setInterventions(data || []);
  }

  function handleOpen(intervenant = null) {
    setEditId(intervenant?.id || null);
    setForm(intervenant || { nom: '', prenom: '', fonction: '', organisation: '', biographie: '', photo_url: '' });
    setPhotoFile(null);
    setOpen(true);
    if (intervenant?.reseaux_sociaux) setSocials({
      facebook: intervenant.reseaux_sociaux.facebook || '',
      instagram: intervenant.reseaux_sociaux.instagram || '',
      linkedin: intervenant.reseaux_sociaux.linkedin || '',
      site: intervenant.reseaux_sociaux.site || ''
    });
    else setSocials({ facebook: '', instagram: '', linkedin: '', site: '' });
  }

  function handleClose() {
    setOpen(false);
    setEditId(null);
    setForm({ nom: '', prenom: '', fonction: '', organisation: '', biographie: '', photo_url: '' });
    setPhotoFile(null);
  }

  async function handleSave() {
    let photo_url = form.photo_url;
    if (photoFile) {
      const filePath = `photo_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('logos').upload(filePath, photoFile, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
        photo_url = urlData.publicUrl;
      }
    }
    if (editId) {
      await supabase.from('intervenants').update({ ...form, photo_url, reseaux_sociaux: socials }).eq('id', editId);
    } else {
      await supabase.from('intervenants').insert([{ ...form, photo_url, reseaux_sociaux: socials }]);
    }
    handleClose();
    fetchIntervenants();
  }

  async function handleDelete(id) {
    if (window.confirm('Supprimer cet intervenant ?')) {
      await supabase.from('intervenants').delete().eq('id', id);
      fetchIntervenants();
    }
  }

  // Gestion interventions
  function openInterventions(intervenant) {
    setSelectedIntervenant(intervenant);
    fetchInterventions(intervenant.id);
  }
  function closeInterventions() {
    setSelectedIntervenant(null);
    setInterventions([]);
    setInterventionForm({ type: '', titre: '', horaire: '', salle: '' });
    setEditInterventionId(null);
  }
  function handleInterventionChange(e) {
    setInterventionForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }
  async function saveIntervention() {
    if (editInterventionId) {
      await supabase.from('interventions').update(interventionForm).eq('id', editInterventionId);
    } else {
      await supabase.from('interventions').insert([{ ...interventionForm, intervenant_id: selectedIntervenant.id }]);
    }
    fetchInterventions(selectedIntervenant.id);
    setInterventionForm({ type: '', titre: '', horaire: '', salle: '' });
    setEditInterventionId(null);
  }
  function editIntervention(intervention) {
    setEditInterventionId(intervention.id);
    setInterventionForm(intervention);
  }
  async function deleteIntervention(id) {
    if (window.confirm('Supprimer cette intervention ?')) {
      await supabase.from('interventions').delete().eq('id', id);
      fetchInterventions(selectedIntervenant.id);
    }
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>Gestion des Intervenants</Typography>
      <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ mb: 2 }}>Ajouter un intervenant</Button>
      {loading ? <CircularProgress /> : (
        <List>
          {intervenants.map(interv => (
            <React.Fragment key={interv.id}>
              <ListItem
                alignItems="flex-start"
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  boxShadow: 1,
                  mb: 2,
                  background: '#fff',
                }}
                secondaryAction={
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <IconButton onClick={() => handleOpen(interv)} title="Modifier"><Edit /></IconButton>
                    <IconButton onClick={() => handleDelete(interv.id)} title="Supprimer"><Delete /></IconButton>
                    <IconButton onClick={() => openInterventions(interv)} title="Participations"><MoreVert /></IconButton>
                  </Stack>
                }
              >
                <ListItemAvatar>
                  <Box sx={{ width: 120, height: 160, mr: 2, borderRadius: 2, overflow: 'hidden', bgcolor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={interv.photo_url || '/images/avatar-placeholder.png'}
                      alt={interv.nom}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.src = '/images/avatar-placeholder.png'; }}
                    />
                  </Box>
                </ListItemAvatar>
                <ListItemText
                  primary={<b style={{ fontSize: 20 }}>{interv.prenom} {interv.nom}</b>}
                  secondary={<>
                    <Typography component="span" variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>{interv.fonction}</Typography>
                    {interv.organisation && <span> — {interv.organisation}</span>}
                    <br />
                    <span style={{ color: '#444' }}>{interv.biographie}</span>
                  </>}
                  sx={{ ml: 2 }}
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
      {/* Dialog intervenant */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Modifier' : 'Ajouter'} un intervenant</DialogTitle>
        <DialogContent>
          <Stack direction="column" spacing={2} alignItems="center">
            <Avatar
              src={photoFile ? URL.createObjectURL(photoFile) : form.photo_url}
              sx={{ width: 96, height: 96, mb: 1 }}
            />
            <Button variant="outlined" component="label" startIcon={<PhotoCamera />}>
              Photo
              <input type="file" accept="image/*" hidden onChange={e => setPhotoFile(e.target.files[0])} />
            </Button>
          </Stack>
          <TextField label="Prénom" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} fullWidth />
          <TextField label="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} fullWidth />
          <TextField label="Fonction" value={form.fonction} onChange={e => setForm(f => ({ ...f, fonction: e.target.value }))} fullWidth />
          <TextField label="Organisation" value={form.organisation} onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))} fullWidth />
          <TextField label="Biographie" value={form.biographie} onChange={e => setForm(f => ({ ...f, biographie: e.target.value }))} fullWidth multiline minRows={3} />
          <TextField label="Facebook" value={socials.facebook} onChange={e => setSocials(s => ({ ...s, facebook: e.target.value }))} fullWidth />
          <TextField label="Instagram" value={socials.instagram} onChange={e => setSocials(s => ({ ...s, instagram: e.target.value }))} fullWidth />
          <TextField label="LinkedIn" value={socials.linkedin} onChange={e => setSocials(s => ({ ...s, linkedin: e.target.value }))} fullWidth />
          <TextField label="Site web" value={socials.site} onChange={e => setSocials(s => ({ ...s, site: e.target.value }))} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
      {/* Dialog interventions */}
      <Dialog open={!!selectedIntervenant} onClose={closeInterventions} maxWidth="sm" fullWidth>
        <DialogTitle>Interventions de {selectedIntervenant?.prenom} {selectedIntervenant?.nom}</DialogTitle>
        <DialogContent>
          <List>
            {interventions.map(interv => (
              <ListItem key={interv.id} secondaryAction={
                <Stack direction="row" spacing={1}>
                  <IconButton onClick={() => editIntervention(interv)} title="Modifier"><Edit /></IconButton>
                  <IconButton onClick={() => deleteIntervention(interv.id)} title="Supprimer"><Delete /></IconButton>
                </Stack>
              }>
                <ListItemText
                  primary={<b>{interv.titre}</b>}
                  secondary={<>
                    <span>{interv.type} — {interv.horaire} — {interv.salle}</span>
                  </>}
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Ajouter / Modifier une intervention</Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Type" name="type" value={interventionForm.type} onChange={handleInterventionChange} fullWidth />
            <TextField label="Titre" name="titre" value={interventionForm.titre} onChange={handleInterventionChange} fullWidth />
            <TextField label="Horaire" name="horaire" value={interventionForm.horaire} onChange={handleInterventionChange} fullWidth />
            <TextField label="Salle" name="salle" value={interventionForm.salle} onChange={handleInterventionChange} fullWidth />
            <Button variant="contained" onClick={saveIntervention}>{editInterventionId ? 'Modifier' : 'Ajouter'}</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInterventions}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 