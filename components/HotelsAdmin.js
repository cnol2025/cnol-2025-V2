import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GlassCard from './GlassCard';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './Toast';

export default function HotelsAdmin() {
  const { showToast, ToastComponent } = useToast();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: null, nom: '', adresse: '', contact: '', tarifs: '', lien_reservation: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [hotelToDelete, setHotelToDelete] = useState(null);

  useEffect(() => { fetchHotels(); }, []);

  const fetchHotels = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('hotels').select('*').order('nom', { ascending: true });
    if (error) {
      showToast("Erreur lors de la récupération des hôtels: " + error.message, 'error');
    } else {
      setHotels(data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nom) {
      showToast("Le nom de l'hôtel est obligatoire.", 'error');
      return;
    }
    const upsertData = {
      nom: formData.nom,
      adresse: formData.adresse,
      contact: formData.contact,
      tarifs: formData.tarifs,
      lien_reservation: formData.lien_reservation,
    };
    let promise;
    if (isEditing) {
      promise = supabase.from('hotels').update(upsertData).eq('id', formData.id);
    } else {
      promise = supabase.from('hotels').insert([upsertData]);
    }
    const { error } = await promise;
    if (error) {
      showToast(`Erreur: ${error.message}`, 'error');
    } else {
      showToast(`Hôtel ${isEditing ? 'modifié' : 'ajouté'} avec succès!`, 'success');
      resetForm();
      fetchHotels();
    }
  };

  const startEditing = (hotel) => {
    setFormData({
      id: hotel.id,
      nom: hotel.nom,
      adresse: hotel.adresse || '',
      contact: hotel.contact || '',
      tarifs: hotel.tarifs || '',
      lien_reservation: hotel.lien_reservation || '',
    });
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({ id: null, nom: '', adresse: '', contact: '', tarifs: '', lien_reservation: '' });
    setIsEditing(false);
  };

  const handleClickOpenDeleteDialog = (hotel) => {
    setHotelToDelete(hotel);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setHotelToDelete(null);
  };

  const handleDelete = async () => {
    if (!hotelToDelete) return;
    const { error } = await supabase.from('hotels').delete().eq('id', hotelToDelete.id);
    if (error) {
      showToast(`Erreur lors de la suppression: ${error.message}`, 'error');
    } else {
      showToast("Hôtel supprimé avec succès!", 'success');
      fetchHotels();
    }
    handleCloseDeleteDialog();
  };

  return (
    <Box sx={{ p: 2, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Gestion des Hôtels</Typography>
      <GlassCard>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>{isEditing ? 'Modifier un hôtel' : 'Ajouter un nouvel hôtel'}</Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField label="Nom de l'hôtel" name="nom" value={formData.nom} onChange={handleInputChange} required fullWidth />
              <TextField label="Adresse" name="adresse" value={formData.adresse} onChange={handleInputChange} fullWidth />
              <TextField label="Contact (Email, Tél)" name="contact" value={formData.contact} onChange={handleInputChange} fullWidth />
              <TextField label="Tarifs négociés" name="tarifs" value={formData.tarifs} onChange={handleInputChange} fullWidth multiline rows={2} />
              <TextField label="Lien de réservation (optionnel)" name="lien_reservation" value={formData.lien_reservation} onChange={handleInputChange} fullWidth />
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" color="primary">{isEditing ? 'Mettre à jour' : 'Ajouter'}</Button>
                {isEditing && <Button variant="outlined" onClick={resetForm}>Annuler l'édition</Button>}
              </Stack>
            </Stack>
          </form>
        </Box>
      </GlassCard>
      <Box mt={4} />
      <Typography variant="h5" gutterBottom>Liste des Hôtels</Typography>
      {loading ? <CircularProgress /> : (
        <GlassCard>
          <Box sx={{ p: 2 }}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Adresse</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Tarifs</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hotels.map((hotel) => (
                    <TableRow key={hotel.id}>
                      <TableCell>{hotel.nom}</TableCell>
                      <TableCell>{hotel.adresse}</TableCell>
                      <TableCell>{hotel.contact}</TableCell>
                      <TableCell>{hotel.tarifs}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => startEditing(hotel)} color="primary"><EditIcon /></IconButton>
                        <IconButton onClick={() => handleClickOpenDeleteDialog(hotel)} color="error"><DeleteIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </GlassCard>
      )}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'hôtel "{hotelToDelete?.nom}" ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Annuler</Button>
          <Button onClick={handleDelete} color="error">Supprimer</Button>
        </DialogActions>
      </Dialog>
      <ToastComponent />
    </Box>
  );
} 