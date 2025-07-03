import React, { useEffect, useState } from 'react';
import { 
  Box, Button, TextField, MenuItem, Select, InputLabel, FormControl, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox,
  CircularProgress, Stack, Pagination, Divider, Chip
} from '@mui/material';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import useMediaQuery from '@mui/material/useMediaQuery';

const participantTypes = [
  { value: 'exposant', label: 'Exposant' },
  { value: 'intervenant', label: 'Intervenant' },
  { value: 'vip', label: 'VIP' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'opticien', label: 'Opticien' },
  { value: 'ophtalmologue', label: 'Ophtalmologue' },
  { value: 'orthoptiste', label: 'Orthoptiste' },
  { value: 'étudiant', label: 'Étudiant' },
  { value: 'presse', label: 'Presse' },
  { value: 'autre', label: 'Autre' },
];

const statusFilters = [
  { value: '', label: 'Tous statuts' },
  { value: 'validated', label: 'Validé' },
  { value: 'pending', label: 'Non validé' },
];

const PAGE_SIZE = 10;

export default function InscriptionsAdmin() {
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('recent');
  const [totalCount, setTotalCount] = useState(0);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', participant_type: 'opticien', sponsoring_level: 'platinum',
    email: '', telephone: '', ville: '', fonction: '', organisation: ''
  });
  const [adding, setAdding] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');

  useEffect(() => { fetchInscriptions(); }, [page, search, typeFilter, statusFilter, sortOrder]);

  async function fetchInscriptions() {
    setLoading(true);
    try {
      let query = supabase.from('inscription').select('*', { count: 'exact' });
      if (sortOrder === 'recent') query = query.order('created_at', { ascending: false });
      else if (sortOrder === 'alpha') query = query.order('nom', { ascending: true }).order('prenom', { ascending: true });
      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      let countQuery = supabase.from('inscription').select('id', { count: 'exact', head: true });
      if (search) {
        query = query.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%`);
        countQuery = countQuery.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%`);
      }
      if (statusFilter) {
        query = query.eq('valide', statusFilter === 'validated');
        countQuery = countQuery.eq('valide', statusFilter === 'validated');
      }
      if (typeFilter) {
        query = query.ilike('fonction', typeFilter);
        countQuery = countQuery.ilike('fonction', typeFilter);
      }
      const { data, error, count } = await query.limit(PAGE_SIZE);
      const { count: total } = await countQuery;
      if (error) toast.error(`Erreur chargement : ${error.message}`);
      else {
        setInscriptions(data || []);
        setTotalCount(total || 0);
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
    setLoading(false);
  }

  async function validerInscription(id) {
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `cnol2025-${id}` }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        fetchInscriptions();
      } else {
        toast.error(`Erreur : ${result.message}`);
      }
    } catch {
      toast.error('Erreur réseau ou serveur');
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    const { nom, prenom, participant_type, sponsoring_level, email, telephone, ville, fonction, organisation } = formData;
    if (!nom.trim() || !prenom.trim()) {
      toast.error('Nom et prénom sont obligatoires');
      setAdding(false);
      return;
    }
    function generateBadgeCode() {
      const digits = Math.floor(100 + Math.random() * 900);
      const letters = Array(3).fill(0).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
      return `${digits}${letters}`;
    }
    let badgeCode;
    let isUnique = false;
    while (!isUnique) {
      badgeCode = generateBadgeCode();
      if (!inscriptions.some(i => i.identifiant_badge === badgeCode)) isUnique = true;
    }
    try {
      const { data: inserted, error } = await supabase.from('inscription').insert([
        {
          nom: nom.trim(), prenom: prenom.trim(), participant_type,
          sponsoring_level: participant_type === 'exposant' ? sponsoring_level : null,
          fonction: fonction.trim() || (participant_type.charAt(0).toUpperCase() + participant_type.slice(1)),
          organisation: participant_type === 'exposant' ? organisation.trim() : null,
          email: email.trim(), telephone: telephone.trim(), ville: ville.trim(),
          identifiant_badge: badgeCode, valide: false, scanned: false, created_at: new Date().toISOString(),
        },
      ]).select().single();
      if (error) toast.error(`Erreur ajout : ${error.message}`);
      else {
        toast.success('Inscription ajoutée !');
        setFormData({ nom: '', prenom: '', participant_type: 'opticien', sponsoring_level: 'platinum', email: '', telephone: '', ville: '', fonction: '', organisation: '' });
        fetchInscriptions();
      }
    } catch (err) {
      toast.error(`Erreur serveur : ${err.message}`);
    }
    setAdding(false);
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handlePrintBadge(inscrit) {
    window.open(`/api/generatedbadge?id=${inscrit.id}`, '_blank');
  }

  async function exportCSV() {
    try {
      const { data, error } = await supabase.from('inscription').select('*');
      if (error) throw error;
      const header = Object.keys(data[0] || {});
      const rows = data.map(row => header.map(h => row[h]));
      const csvContent = [header, ...rows].map(row => row.map(val => `"${val || ''}"`).join(',')).join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inscriptions.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Erreur export CSV');
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Liste des inscrits</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Recherche" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} label="Statut" onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            {statusFilters.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">Tous</MenuItem>
            {participantTypes.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={exportCSV}>Exporter CSV</Button>
        <Button variant="outlined" onClick={() => setSortOrder(sortOrder === 'recent' ? 'alpha' : 'recent')}>
          Trier {sortOrder === 'recent' ? 'A-Z' : 'par date'}
        </Button>
      </Stack>
      {isMobile ? (
        <Stack spacing={2}>
          {inscriptions.map((row) => (
            <Paper key={row.id} sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box>
                  <Typography variant="h6">{row.prenom} {row.nom}</Typography>
                  <Typography variant="body2" color="text.secondary">{row.email}</Typography>
                  <Typography variant="body2" color="text.secondary">{row.ville}</Typography>
                  <Typography variant="body2" color="text.secondary">{row.fonction && (row.fonction.length > 50 ? row.fonction.slice(0, 50) + '…' : row.fonction)}</Typography>
                  <Typography variant="body2" color="text.secondary">{row.participant_type}</Typography>
                </Box>
                <Stack spacing={1} sx={{ ml: 'auto' }}>
                  <Button size="small" variant="outlined" onClick={() => handlePrintBadge(row)}>Badge</Button>
                  <Button size="small" variant="outlined" onClick={() => validerInscription(row.id)}>{row.valide ? 'Validé' : 'Valider'}</Button>
                </Stack>
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
                <TableCell>Prénom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Ville</TableCell>
                <TableCell>Fonction</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Validé</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8}><CircularProgress /></TableCell></TableRow>
              ) : inscriptions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.nom}</TableCell>
                  <TableCell>{row.prenom}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.ville}</TableCell>
                  <TableCell>{row.fonction}</TableCell>
                  <TableCell>{row.participant_type}</TableCell>
                  <TableCell>
                    <Checkbox checked={row.valide} onChange={() => validerInscription(row.id)} />
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handlePrintBadge(row)}>Badge</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
        <Pagination count={Math.ceil(totalCount / PAGE_SIZE)} page={page} onChange={(_, v) => setPage(v)} />
      </Stack>
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" sx={{ mb: 1 }}>Ajouter un inscrit</Typography>
      <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <TextField label="Nom" name="nom" value={formData.nom} onChange={handleChange} required />
        <TextField label="Prénom" name="prenom" value={formData.prenom} onChange={handleChange} required />
        <TextField label="Email" name="email" value={formData.email} onChange={handleChange} />
        <TextField label="Téléphone" name="telephone" value={formData.telephone} onChange={handleChange} />
        <TextField label="Ville" name="ville" value={formData.ville} onChange={handleChange} />
        <TextField label="Fonction" name="fonction" value={formData.fonction} onChange={handleChange} />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select name="participant_type" value={formData.participant_type} label="Type" onChange={handleChange}>
            {participantTypes.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
          </Select>
        </FormControl>
        {formData.participant_type === 'exposant' && (
          <TextField label="Organisation" name="organisation" value={formData.organisation} onChange={handleChange} />
        )}
        {formData.participant_type === 'exposant' && (
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Sponsoring</InputLabel>
            <Select name="sponsoring_level" value={formData.sponsoring_level} label="Sponsoring" onChange={handleChange}>
              <MenuItem value="">Aucun</MenuItem>
              <MenuItem value="platinum">Platinum</MenuItem>
              <MenuItem value="gold">Gold</MenuItem>
              <MenuItem value="silver">Silver</MenuItem>
            </Select>
          </FormControl>
        )}
        <Button type="submit" variant="contained" disabled={adding}>{adding ? 'Ajout...' : 'Ajouter'}</Button>
      </Box>
    </Box>
  );
} 