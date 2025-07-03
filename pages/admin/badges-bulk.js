import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Pagination } from '@mui/material';

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

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>Liste des inscrits à traiter (badges bulk)</Typography>
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