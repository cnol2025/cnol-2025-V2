import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Pagination, Button, TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

export default function BadgesBulkAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [sending, setSending] = useState({});
  const [sent, setSent] = useState({});
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [waNumber, setWaNumber] = useState('');
  const [waText, setWaText] = useState('Bonjour, ceci est un test WhatsApp depuis CNOL.');
  const [waResult, setWaResult] = useState(null);

  useEffect(() => {
    fetch('/api/badges-bulk-list')
      .then(res => res.json())
      .then(data => {
        setRows(data.rows || []);
        setLoading(false);
      });
  }, []);

  const filteredRows = rows.filter(row =>
    row.name && row.name.toLowerCase().includes(search.toLowerCase())
  );
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!a.name) return 1;
    if (!b.name) return -1;
    return sortAsc
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  });
  const paginatedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const exportToCSV = () => {
    const headers = ['Nom','Email','Téléphone','Magasin','Ville','Type'];
    const csvRows = [
      headers.join(','),
      ...rows.map(row => [
        row.name,
        row.email,
        row.number,
        row.magasin,
        row.ville,
        row.type
      ].map(val => '"' + (val ? String(val).replace(/"/g, '""') : '') + '"').join(','))
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'badges_a_traiter.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSend = async (row) => {
    setSending((prev) => ({ ...prev, [row.id]: true }));
    try {
      const res = await fetch('/api/send-badge-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      if (res.ok) {
        setSent((prev) => ({ ...prev, [row.id]: true }));
      } else {
        alert('Erreur lors de l\'envoi');
      }
    } catch (e) {
      alert('Erreur lors de l\'envoi');
    }
    setSending((prev) => ({ ...prev, [row.id]: false }));
  };

  const handleSendWhatsApp = async () => {
    setWaResult(null);
    try {
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: waNumber, text: waText }),
      });
      const data = await res.json();
      if (data.success) setWaResult('✅ Message WhatsApp envoyé !');
      else setWaResult('❌ Erreur : ' + (data.error || '')); 
    } catch (e) {
      setWaResult('❌ Erreur réseau');
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>Liste des inscrits à traiter (badges bulk)</Typography>
      {/* Formulaire de test WhatsApp */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <TextField
          label="Numéro WhatsApp"
          size="small"
          value={waNumber}
          onChange={e => setWaNumber(e.target.value)}
          sx={{ width: 200 }}
        />
        <TextField
          label="Message"
          size="small"
          value={waText}
          onChange={e => setWaText(e.target.value)}
          sx={{ width: 350 }}
        />
        <Button variant="outlined" onClick={handleSendWhatsApp}>Envoyer WhatsApp</Button>
        {waResult && <span>{waResult}</span>}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          label="Recherche nom"
          size="small"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mr: 2, width: 250 }}
        />
        <IconButton onClick={() => setSortAsc(v => !v)}>
          {sortAsc ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
        </IconButton>
      </Box>
      <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={exportToCSV}>
        Exporter CSV
      </Button>
      {loading ? <CircularProgress /> : (
        <Paper sx={{ p: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Magasin</TableCell>
                <TableCell>Ville</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.map((row, i) => (
                <TableRow key={row.email + i}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.number}</TableCell>
                  <TableCell>{row.magasin}</TableCell>
                  <TableCell>{row.ville}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>
                    {sent[row.id] ? (
                      <span style={{ color: 'green' }}>Envoyé</span>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleSend(row)}
                        disabled={sending[row.id]}
                      >
                        {sending[row.id] ? 'Envoi...' : 'Envoyer'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            count={Math.ceil(rows.length / pageSize)}
            page={page}
            onChange={(_, v) => setPage(v)}
            sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
          />
        </Paper>
      )}
    </Box>
  );
} 