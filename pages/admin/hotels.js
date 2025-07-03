import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Box, Button, TextField, Typography, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, IconButton, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/router';
import useMediaQuery from '@mui/material/useMediaQuery';

const HotelsAdminPage = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const router = useRouter();

  // State for the form
  const [formData, setFormData] = useState({
    id: null,
    nom: '',
    adresse: '',
    contact: '',
    tarifs: '',
    lien_reservation: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // State for delete confirmation dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [hotelToDelete, setHotelToDelete] = useState(null);

  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    // Basic auth check
    if (localStorage.getItem('admin_auth') !== 'true') {
      router.replace('/admin-login');
    } else {
      setIsAuth(true);
      fetchHotels();
    }
  }, [router]);

  const fetchHotels = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('hotels').select('*').order('nom', { ascending: true });
    if (error) {
      toast.error("Erreur lors de la récupération des hôtels: " + error.message);
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
        toast.error("Le nom de l'hôtel est obligatoire.");
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
        toast.error(`Erreur: ${error.message}`);
    } else {
        toast.success(`Hôtel ${isEditing ? 'modifié' : 'ajouté'} avec succès!`);
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
        toast.error(`Erreur lors de la suppression: ${error.message}`);
    } else {
        toast.success("Hôtel supprimé avec succès!");
        fetchHotels();
    }
    handleCloseDeleteDialog();
  };


  if (!isAuth) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Toaster position="top-right" />
      <Typography variant="h4" gutterBottom>Gestion des Hôtels</Typography>

      <Paper sx={{ p: 2, mb: 4 }}>
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
      </Paper>

      <Typography variant="h5" gutterBottom>Liste des Hôtels</Typography>
      {loading ? <CircularProgress /> : (
        isMobile ? (
          <Stack spacing={2}>
            {hotels.map((hotel) => (
              <Paper key={hotel.id} sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box>
                    <Typography variant="h6">{hotel.nom}</Typography>
                    <Typography variant="body2" color="text.secondary">{hotel.adresse}</Typography>
                    <Typography variant="body2" color="text.secondary">{hotel.contact}</Typography>
                    <Typography variant="body2" color="text.secondary">{hotel.tarifs && hotel.tarifs.length > 50 ? hotel.tarifs.slice(0, 50) + '…' : hotel.tarifs}</Typography>
                    {hotel.lien_reservation && <Typography variant="body2"><a href={hotel.lien_reservation} target="_blank" rel="noopener noreferrer">Réserver</a></Typography>}
                  </Box>
                  <Stack spacing={1} sx={{ ml: 'auto' }}>
                    <IconButton onClick={() => startEditing(hotel)} color="primary"><EditIcon /></IconButton>
                    <IconButton onClick={() => handleClickOpenDeleteDialog(hotel)} color="error"><DeleteIcon /></IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : (
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
        )
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'hôtel "{hotelToDelete?.nom}" ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Annuler</Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default HotelsAdminPage; 