import { useEffect, useState } from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, TextField, Button, CircularProgress, Stack, Pagination } from '@mui/material';
import GlassCard from './GlassCard';
import { useToast } from './Toast';
import { supabase } from '../lib/supabaseClient';
import useMediaQuery from '@mui/material/useMediaQuery';

export default function ExposantsAdmin() {
  const { showToast, ToastComponent } = useToast();
  const [exposants, setExposants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => { fetchExposants(); }, [search, page, pageSize]);

  async function fetchExposants() {
    setLoading(true);
    try {
      let query = supabase.from('exposants').select('*', { count: 'exact' });
      if (search) {
        query = query.or(`nom.ilike.%${search}%`);
      }
      query = query.order('nom', { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      setExposants(data || []);
      setTotal(count || 0);
    } catch (e) {
      showToast('Erreur lors du chargement des exposants', 'error');
    }
    setLoading(false);
  }

  function handleExportCSV() {
    const header = ['Nom', 'Email responsable', 'Téléphones', 'Adresses', 'Site web', 'Publié'];
    const rows = exposants.map(e => [
      e.nom,
      e.email_responsable,
      (e.telephones || []).join(' | '),
      (e.adresses || []).join(' | '),
      e.site_web,
      e.publie ? 'Oui' : 'Non'
    ]);
    const csv = [header, ...rows].map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exposants.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export CSV généré', 'success');
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Liste des Exposants</Typography>
      <GlassCard>
        <Box sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" mb={2}>
            <TextField
              label="Recherche nom..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              size="small"
              sx={{ minWidth: 220 }}
            />
            <Button variant="outlined" onClick={handleExportCSV}>Exporter CSV</Button>
          </Stack>
          <Box mb={1} color="#666">Total exposants : <b>{total}</b></Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : exposants.length === 0 ? (
            <Typography>Aucun exposant trouvé.</Typography>
          ) : isMobile ? (
            <Stack spacing={2}>
              {exposants.map((e, i) => (
                <Paper key={e.id || i} sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box>
                      <Typography variant="h6">{e.nom}</Typography>
                      <Typography variant="body2" color="text.secondary">{e.email_responsable}</Typography>
                      <Typography variant="body2" color="text.secondary">{(e.telephones || []).join(', ')}</Typography>
                      <Typography variant="body2" color="text.secondary">{(e.adresses || []).join(', ').length > 50 ? (e.adresses || []).join(', ').slice(0, 50) + '…' : (e.adresses || []).join(', ')}</Typography>
                      {e.site_web && <Typography variant="body2"><a href={e.site_web} target="_blank" rel="noopener noreferrer">{e.site_web}</a></Typography>}
                      <Typography variant="body2" color="text.secondary">Publié : {e.publie ? 'Oui' : 'Non'}</Typography>
                    </Box>
                    {/* Actions à ajouter ici si besoin */}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Email responsable</TableCell>
                    <TableCell>Téléphones</TableCell>
                    <TableCell>Adresses</TableCell>
                    <TableCell>Site web</TableCell>
                    <TableCell>Publié</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exposants.map((e, i) => (
                    <TableRow key={e.id || i}>
                      <TableCell>{e.nom}</TableCell>
                      <TableCell>{e.email_responsable}</TableCell>
                      <TableCell>{(e.telephones || []).join(', ')}</TableCell>
                      <TableCell>{(e.adresses || []).join(', ')}</TableCell>
                      <TableCell>{e.site_web && <a href={e.site_web} target="_blank" rel="noopener noreferrer">{e.site_web}</a>}</TableCell>
                      <TableCell>{e.publie ? 'Oui' : 'Non'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(total / pageSize)}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
              size="medium"
            />
          </Box>
        </Box>
      </GlassCard>
      <ToastComponent />
    </Box>
  );
} 