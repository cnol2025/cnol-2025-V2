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
  // ... (reprendre toute la logique et l'UI de AdminAteliers ici, sans layout global ni bouton retour)
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Gestion des ateliers</Typography>
      {/* ... UI ateliers ... */}
    </Box>
  );
} 