import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Box, Button, TextField, Typography, List, ListItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Stack, CircularProgress, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ListIcon from '@mui/icons-material/List';
import DownloadIcon from '@mui/icons-material/Download';
import toast from 'react-hot-toast';

export default function MasterclassAdmin() {
  // ... (reprendre toute la logique et l'UI de AdminMasterclassPage ici, sans layout global ni bouton retour)
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Gestion des masterclass</Typography>
      {/* ... UI masterclass ... */}
    </Box>
  );
} 