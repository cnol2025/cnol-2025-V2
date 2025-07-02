import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Divider, CircularProgress, Accordion, AccordionSummary, AccordionDetails, Grid } from '@mui/material';
import { supabase } from '../../lib/supabaseClient';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function AdminStatistiques() {
  const [loading, setLoading] = useState(false);
  const [classement, setClassement] = useState([]);
  const [searchParticipant, setSearchParticipant] = useState('');
  const [standsVisites, setStandsVisites] = useState([]);
  const [searchExposant, setSearchExposant] = useState('');
  const [visiteursStand, setVisiteursStand] = useState([]);
  const [statsFonction, setStatsFonction] = useState([]);
  const [statsVille, setStatsVille] = useState([]);
  const [statsJour, setStatsJour] = useState([]);
  const [statsSemaine, setStatsSemaine] = useState([]);
  const [statsMois, setStatsMois] = useState([]);

  // Classement des stands les plus visités
  const fetchClassement = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('exposant_id, exposant:exposant_id (nom, prenom, qualite_sponsoring)')
      .neq('exposant_id', null);
    if (error) return setLoading(false);
    // Agréger côté client
    const countByExposant = {};
    data.forEach(l => {
      const key = l.exposant_id;
      if (!countByExposant[key]) countByExposant[key] = { ...l.exposant, count: 0 };
      countByExposant[key].count++;
    });
    setClassement(Object.values(countByExposant).sort((a, b) => b.count - a.count));
    setLoading(false);
  };

  // Recherche stands visités par un participant
  const handleSearchParticipant = async () => {
    setLoading(true);
    const { data: inscrits } = await supabase
      .from('inscription')
      .select('id, nom, prenom, email')
      .ilike('nom', `%${searchParticipant}%`);
    if (!inscrits || inscrits.length === 0) {
      setStandsVisites([]);
      setLoading(false);
      return;
    }
    const participant = inscrits[0];
    const { data: leads } = await supabase
      .from('leads')
      .select('created_at, exposant:exposant_id (nom, prenom, qualite_sponsoring)')
      .eq('visiteur_id', participant.id);
    setStandsVisites(leads.map(l => ({ ...l, participant })));
    setLoading(false);
  };

  // Recherche visiteurs d'un stand (exposant)
  const handleSearchExposant = async () => {
    setLoading(true);
    const { data: exposants } = await supabase
      .from('inscription')
      .select('id, nom, prenom, qualite_sponsoring')
      .ilike('nom', `%${searchExposant}%`);
    if (!exposants || exposants.length === 0) {
      setVisiteursStand([]);
      setLoading(false);
      return;
    }
    const exposant = exposants[0];
    const { data: leads } = await supabase
      .from('leads')
      .select('created_at, visiteur:visiteur_id (nom, prenom, email)')
      .eq('exposant_id', exposant.id);
    setVisiteursStand(leads.map(l => ({ ...l, exposant })));
    setLoading(false);
  };

  // Export CSV générique
  const exportCSV = (rows, header, filename) => {
    const csvContent = [header, ...rows].map(row => row.map(val => `"${val || ''}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Stats par fonction (regroupement JS)
  const fetchStatsFonction = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inscription')
      .select('fonction');
    setLoading(false);
    if (!error && data) {
      const countByFonction = {};
      data.forEach(row => {
        const key = row.fonction || 'Non renseigné';
        countByFonction[key] = (countByFonction[key] || 0) + 1;
      });
      setStatsFonction(Object.entries(countByFonction).map(([fonction, count]) => ({ fonction, count })));
    }
  };

  // Stats par ville (regroupement JS)
  const fetchStatsVille = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inscription')
      .select('ville');
    setLoading(false);
    if (!error && data) {
      const countByVille = {};
      data.forEach(row => {
        // Normalisation : majuscules + trim
        const key = (row.ville || 'Non renseignée').toUpperCase().trim();
        countByVille[key] = (countByVille[key] || 0) + 1;
      });
      setStatsVille(Object.entries(countByVille).map(([ville, count]) => ({ ville, count })));
    }
  };

  // Stats par jour/semaine/mois
  const fetchStatsPeriodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inscription')
      .select('created_at');
    setLoading(false);
    if (!error && data) {
      // Par jour
      const countByDay = {};
      // Par semaine (année-semaine)
      const countByWeek = {};
      // Par mois
      const countByMonth = {};
      data.forEach(row => {
        const date = new Date(row.created_at);
        // Jour
        const dayKey = date.toISOString().slice(0, 10);
        countByDay[dayKey] = (countByDay[dayKey] || 0) + 1;
        // Semaine (année-semaine)
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const weekKey = `${year}-S${String(week).padStart(2, '0')}`;
        countByWeek[weekKey] = (countByWeek[weekKey] || 0) + 1;
        // Mois
        const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        countByMonth[monthKey] = (countByMonth[monthKey] || 0) + 1;
      });
      setStatsJour(Object.entries(countByDay).map(([periode, count]) => ({ periode, count })));
      setStatsSemaine(Object.entries(countByWeek).map(([periode, count]) => ({ periode, count })));
      setStatsMois(Object.entries(countByMonth).map(([periode, count]) => ({ periode, count })));
    }
  };

  // Helper semaine ISO
  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>Statistiques CNOL 2025</Typography>
      {/* Barre d'actions globales */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button variant="contained" onClick={fetchClassement}>Rafraîchir</Button>
        <Button variant="outlined">Export global</Button>
        <Button variant="outlined" onClick={() => window.print()}>Imprimer</Button>
      </Box>
      {/* Tuiles statistiques clés */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2}><Paper sx={{ p: 2, textAlign: 'center' }}>Total inscrits<br/><b>...</b></Paper></Grid>
        <Grid item xs={6} md={2}><Paper sx={{ p: 2, textAlign: 'center' }}>Validés<br/><b>...</b></Paper></Grid>
        <Grid item xs={6} md={2}><Paper sx={{ p: 2, textAlign: 'center' }}>Exposants<br/><b>...</b></Paper></Grid>
        <Grid item xs={6} md={2}><Paper sx={{ p: 2, textAlign: 'center' }}>Villes<br/><b>...</b></Paper></Grid>
        <Grid item xs={6} md={2}><Paper sx={{ p: 2, textAlign: 'center' }}>Réservations<br/><b>...</b></Paper></Grid>
      </Grid>
      {/* Recherche & filtres */}
      <Box sx={{ mb: 3 }}>
        <TextField label="Recherche globale" sx={{ mr: 2 }} />
        <TextField label="Filtre période" sx={{ mr: 2 }} />
        <TextField label="Filtre ville" sx={{ mr: 2 }} />
        <TextField label="Filtre fonction" sx={{ mr: 2 }} />
        <TextField label="Validé ?" sx={{ mr: 2 }} />
      </Box>
      {/* Accordéons statistiques détaillées */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}><b>Inscrits par ville</b></AccordionSummary>
        <AccordionDetails>
          {/* Bloc existant statsVille ici */}
          {statsVille.length > 0 && (
            <>
              <Button variant="outlined" sx={{ mb: 1 }} onClick={() => exportCSV(statsVille.map(v => [v.ville, v.count]), ['Ville', 'Nombre'], 'statistiques-par-ville.csv')}>Exporter CSV</Button>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ville</TableCell>
                    <TableCell>Nombre</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statsVille.slice().sort((a, b) => b.count - a.count).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.ville || 'Non renseignée'}</TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}><b>Inscrits par fonction</b></AccordionSummary>
        <AccordionDetails>
          {/* Bloc existant statsFonction ici */}
          {statsFonction.length > 0 && (
            <>
              <Button variant="outlined" sx={{ mb: 1 }} onClick={() => exportCSV(statsFonction.map(f => [f.fonction, f.count]), ['Fonction', 'Nombre'], 'statistiques-par-fonction.csv')}>Exporter CSV</Button>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fonction</TableCell>
                    <TableCell>Nombre</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statsFonction.slice().sort((a, b) => b.count - a.count).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.fonction || 'Non renseigné'}</TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}><b>Inscrits par période</b></AccordionSummary>
        <AccordionDetails>
          {/* Tabs ou accordéon pour jour/semaine/mois, ici placeholder */}
          <Typography>Par jour, semaine, mois (à compléter)</Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}><b>Classement stands les plus visités</b></AccordionSummary>
        <AccordionDetails>
          {/* Bloc existant classement ici */}
          {classement.length > 0 && (
            <>
              <Button variant="outlined" sx={{ mb: 1 }} onClick={() => exportCSV(classement.map(e => [e.prenom, e.nom, e.qualite_sponsoring, e.count]), ['Prénom', 'Nom', 'Sponsoring', 'Nombre de visiteurs'], 'classement-stands.csv')}>Exporter CSV</Button>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prénom</TableCell>
                    <TableCell>Nom</TableCell>
                    <TableCell>Sponsoring</TableCell>
                    <TableCell>Nombre de visiteurs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {classement.map((e, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{e.prenom}</TableCell>
                      <TableCell>{e.nom}</TableCell>
                      <TableCell>{e.qualite_sponsoring}</TableCell>
                      <TableCell>{e.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}><b>Recherche avancée</b></AccordionSummary>
        <AccordionDetails>
          <Typography>Recherche participants, exposants, etc. (à compléter)</Typography>
        </AccordionDetails>
      </Accordion>
      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: 'center', color: 'grey.600', fontSize: 13 }}>
        CNOL 2025 – Admin | Version 1.0 | Support : cnol.badge@gmail.com
      </Box>
    </Box>
  );
} 