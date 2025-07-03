import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Pagination, Button } from '@mui/material';

export default function BadgesBulkAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    fetch('/api/badges-bulk-list')
      .then(res => res.json())
      .then(data => {
        setRows(data.rows || []);
        setLoading(false);
      });
  }, []);

  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

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

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>Liste des inscrits à traiter (badges bulk)</Typography>
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