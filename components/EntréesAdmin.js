import { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Stack, TextField, Select, MenuItem, Pagination } from '@mui/material';
import GlassCard from './GlassCard';
import { useToast } from './Toast';

export default function EntréesAdmin() {
  const { showToast, ToastComponent } = useToast();
  const [entrees, setEntrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchEntrees();
    // eslint-disable-next-line
  }, [search, sort, page, pageSize]);

  async function fetchEntrees() {
    setLoading(true);
    try {
      let url = `/api/entrees?search=${encodeURIComponent(search)}&sort=${sort}&page=${page}&pageSize=${pageSize}`;
      const res = await fetch(url);
      const data = await res.json();
      setEntrees(data.entrees);
      setTotal(data.total);
    } catch (e) {
      showToast('Erreur lors du chargement des entrées', 'error');
    }
    setLoading(false);
  }

  function handleExportCSV() {
    const header = ['Nom','Prénom','Email','Date / heure'];
    const rows = entrees.map(e => [e.inscription.nom, e.inscription.prenom, e.inscription.email, new Date(e.scanned_at).toLocaleString()]);
    const csv = [header, ...rows].map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entrees.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export CSV généré', 'success');
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Entrées scannées</Typography>
      <GlassCard>
        <Box sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" mb={2}>
            <TextField
              label="Recherche nom, prénom, email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              size="small"
              sx={{ minWidth: 220 }}
            />
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" onClick={handleExportCSV}>Exporter CSV</Button>
              <Select value={sort} onChange={e => setSort(e.target.value)} size="small">
                <MenuItem value="desc">Plus récentes en haut</MenuItem>
                <MenuItem value="asc">Plus anciennes en haut</MenuItem>
              </Select>
            </Stack>
          </Stack>
          <Box mb={1} color="#666">Total entrées : <b>{total}</b></Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : entrees.length === 0 ? (
            <Typography>Aucune entrée scannée.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Prénom</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Date / heure</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entrees.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell>{entry.inscription.nom}</TableCell>
                    <TableCell>{entry.inscription.prenom}</TableCell>
                    <TableCell>{entry.inscription.email}</TableCell>
                    <TableCell>{new Date(entry.scanned_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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