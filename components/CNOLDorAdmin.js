import { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Stack } from '@mui/material';
import GlassCard from './GlassCard';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './Toast';

export default function CNOLDorAdmin() {
  // Toast
  const { showToast, ToastComponent } = useToast();
  // Opticien de l'année
  const [opticiens, setOpticiens] = useState([]);
  const [loadingOpticien, setLoadingOpticien] = useState(true);
  // Vitrine de l'année
  const [vitrines, setVitrines] = useState([]);
  const [loadingVitrine, setLoadingVitrine] = useState(true);

  useEffect(() => {
    fetchOpticiens();
    fetchVitrines();
    // eslint-disable-next-line
  }, []);

  async function fetchOpticiens() {
    setLoadingOpticien(true);
    const { data, error } = await supabase.from('cnol_opticien_annee').select('*').order('created_at', { ascending: false });
    if (error) showToast("Erreur lors du chargement des opticiens", 'error');
    setOpticiens(data || []);
    setLoadingOpticien(false);
  }
  async function fetchVitrines() {
    setLoadingVitrine(true);
    const { data, error } = await supabase.from('cnol_vitrine_annee').select('*').order('created_at', { ascending: false });
    if (error) showToast("Erreur lors du chargement des vitrines", 'error');
    setVitrines(data || []);
    setLoadingVitrine(false);
  }

  function exportOpticienCSV() {
    const header = ['Nom','Prénom','Email','Téléphone','Ville','Nom du magasin','Motivation','Date'];
    const rows = opticiens.map(o => [o.nom, o.prenom, o.email, o.telephone, o.ville, o.nom_magasin, o.motivation, o.created_at]);
    downloadCSV([header, ...rows], 'cnol_opticien_annee.csv');
    showToast('Export CSV Opticien de l\'année généré', 'success');
  }
  function exportVitrineCSV() {
    const header = ['Nom responsable','Email','Téléphone','Ville','Nom du magasin','Description vitrine','Date'];
    const rows = vitrines.map(v => [v.nom_responsable, v.email, v.telephone, v.ville, v.nom_magasin, v.description_vitrine, v.created_at]);
    downloadCSV([header, ...rows], 'cnol_vitrine_annee.csv');
    showToast('Export CSV Vitrine de l\'année généré', 'success');
  }
  function downloadCSV(rows, filename) {
    const csv = rows.map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>CNOL d'Or – Administration</Typography>
      <Stack spacing={3}>
        <GlassCard>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Candidatures Opticien de l'année</Typography>
              <Button variant="outlined" onClick={exportOpticienCSV}>Exporter CSV</Button>
            </Box>
            {loadingOpticien ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Prénom</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell>Ville</TableCell>
                    <TableCell>Nom du magasin</TableCell>
                    <TableCell>Motivation</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {opticiens.map(o => (
                    <TableRow key={o.id}>
                      <TableCell>{o.nom}</TableCell>
                      <TableCell>{o.prenom}</TableCell>
                      <TableCell>{o.email}</TableCell>
                      <TableCell>{o.telephone}</TableCell>
                      <TableCell>{o.ville}</TableCell>
                      <TableCell>{o.nom_magasin}</TableCell>
                      <TableCell>{o.motivation}</TableCell>
                      <TableCell>{o.created_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </GlassCard>
        <GlassCard>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Candidatures Meilleure vitrine de l'année</Typography>
              <Button variant="outlined" onClick={exportVitrineCSV}>Exporter CSV</Button>
            </Box>
            {loadingVitrine ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nom responsable</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell>Ville</TableCell>
                    <TableCell>Nom du magasin</TableCell>
                    <TableCell>Description vitrine</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vitrines.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>{v.nom_responsable}</TableCell>
                      <TableCell>{v.email}</TableCell>
                      <TableCell>{v.telephone}</TableCell>
                      <TableCell>{v.ville}</TableCell>
                      <TableCell>{v.nom_magasin}</TableCell>
                      <TableCell>{v.description_vitrine}</TableCell>
                      <TableCell>{v.created_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </GlassCard>
      </Stack>
      <ToastComponent />
    </Box>
  );
} 