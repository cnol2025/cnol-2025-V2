import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Box, Button, Typography, Paper, Stack, TextField, Avatar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, InputLabel, FormControl, List, ListItem, ListItemAvatar, ListItemText, Divider, CircularProgress
} from '@mui/material';
import { Add, Edit, Delete, PhotoCamera } from '@mui/icons-material';

export default function AdminIntervenants() {
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
      const { data, error } = await supabase.storage.from('intervenants').upload(`photo_${Date.now()}.jpg`, photoFile, { upsert: true });
      if (!error) photo_url = supabase.storage.from('intervenants').getPublicUrl(data.path).publicUrl;
    }
    if (editId) {
      await supabase.from('intervenants').update({ ...form, photo_url }).eq('id', editId);
    } else {
      await supabase.from('intervenants').insert([{ ...form, photo_url }]);
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
              <ListItem alignItems="flex-start" secondaryAction={
                <Stack direction="row" spacing={1}>
                  <IconButton onClick={() => handleOpen(interv)}><Edit /></IconButton>
                  <IconButton onClick={() => handleDelete(interv.id)}><Delete /></IconButton>
                  <Button size="small" onClick={() => openInterventions(interv)}>Participations</Button>
                </Stack>
              }>
                <ListItemAvatar>
                  <Avatar src={interv.photo_url} alt={interv.nom} sx={{ width: 56, height: 56 }} />
                </ListItemAvatar>
                <ListItemText
                  primary={<b>{interv.prenom} {interv.nom}</b>}
                  secondary={<>
                    <Typography component="span" variant="body2" color="text.primary">{interv.fonction}</Typography>
                    {interv.organisation && <> — {interv.organisation}</>}
                    <br />
                    {interv.biographie}
                  </>}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
      {/* Dialog intervenant */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Modifier' : 'Ajouter'} un intervenant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={form.photo_url} sx={{ width: 64, height: 64 }} />
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
      {/* Dialog interventions */}
      <Dialog open={!!selectedIntervenant} onClose={closeInterventions} maxWidth="sm" fullWidth>
        <DialogTitle>Participations de {selectedIntervenant?.prenom} {selectedIntervenant?.nom}</DialogTitle>
        <DialogContent>
          <List>
            {interventions.map(interv => (
              <ListItem key={interv.id} secondaryAction={
                <Stack direction="row" spacing={1}>
                  <IconButton onClick={() => editIntervention(interv)}><Edit /></IconButton>
                  <IconButton onClick={() => deleteIntervention(interv.id)}><Delete /></IconButton>
                </Stack>
              }>
                <ListItemText
                  primary={<b>{interv.type} : {interv.titre}</b>}
                  secondary={<>
                    {interv.horaire && <span>Horaire : {interv.horaire} — </span>}
                    {interv.salle && <span>Salle : {interv.salle}</span>}
                  </>}
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Ajouter / Modifier une participation</Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select name="type" value={interventionForm.type} label="Type" onChange={handleInterventionChange}>
                <MenuItem value="conférence">Conférence</MenuItem>
                <MenuItem value="atelier">Atelier</MenuItem>
                <MenuItem value="masterclass">Masterclass</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Titre" name="titre" value={interventionForm.titre} onChange={handleInterventionChange} fullWidth />
            <TextField label="Horaire" name="horaire" value={interventionForm.horaire} onChange={handleInterventionChange} fullWidth />
            <TextField label="Salle" name="salle" value={interventionForm.salle} onChange={handleInterventionChange} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInterventions}>Fermer</Button>
          <Button onClick={saveIntervention} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 