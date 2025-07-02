import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Divider, CircularProgress } from '@mui/material';
import { supabase } from '../../lib/supabaseClient';

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
        const key = row.ville || 'Non renseignée';
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
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>Statistiques - CNOL</Typography>
        <Button variant="contained" onClick={fetchClassement} sx={{ mb: 2 }}>Afficher classement stands les plus visités</Button>
        <Button variant="contained" onClick={fetchStatsFonction} sx={{ mb: 2, mr: 2 }}>Inscrits par fonction</Button>
        <Button variant="contained" onClick={fetchStatsVille} sx={{ mb: 2, mr: 2 }}>Inscrits par ville</Button>
        <Button variant="contained" onClick={fetchStatsPeriodes} sx={{ mb: 2 }}>Inscrits par période</Button>
        {loading && <CircularProgress sx={{ ml: 2 }} />}
        {classement.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Classement des stands les plus visités</Typography>
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
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6">Recherche stands visités par un participant</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField label="Nom participant" value={searchParticipant} onChange={e => setSearchParticipant(e.target.value)} />
          <Button variant="contained" onClick={handleSearchParticipant}>Rechercher</Button>
        </Box>
        {standsVisites.length > 0 && (
          <>
            <Button variant="outlined" sx={{ mb: 1 }} onClick={() => exportCSV(standsVisites.map(s => [s.participant.prenom, s.participant.nom, s.exposant?.prenom, s.exposant?.nom, s.exposant?.qualite_sponsoring, s.created_at && new Date(s.created_at).toLocaleString()]), ['Prénom participant', 'Nom participant', 'Prénom exposant', 'Nom exposant', 'Sponsoring', 'Date/Heure'], 'stands-visites-par-participant.csv')}>Exporter CSV</Button>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Prénom exposant</TableCell>
                  <TableCell>Nom exposant</TableCell>
                  <TableCell>Sponsoring</TableCell>
                  <TableCell>Date/Heure</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {standsVisites.map((s, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{s.exposant?.prenom}</TableCell>
                    <TableCell>{s.exposant?.nom}</TableCell>
                    <TableCell>{s.exposant?.qualite_sponsoring}</TableCell>
                    <TableCell>{s.created_at && new Date(s.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6">Recherche visiteurs d'un stand (exposant)</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField label="Nom exposant" value={searchExposant} onChange={e => setSearchExposant(e.target.value)} />
          <Button variant="contained" onClick={handleSearchExposant}>Rechercher</Button>
        </Box>
        {visiteursStand.length > 0 && (
          <>
            <Button variant="outlined" sx={{ mb: 1 }} onClick={() => exportCSV(visiteursStand.map(v => [v.exposant.prenom, v.exposant.nom, v.visiteur?.prenom, v.visiteur?.nom, v.visiteur?.email, v.created_at && new Date(v.created_at).toLocaleString()]), ['Prénom exposant', 'Nom exposant', 'Prénom visiteur', 'Nom visiteur', 'Email visiteur', 'Date/Heure'], 'visiteurs-stand.csv')}>Exporter CSV</Button>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Prénom visiteur</TableCell>
                  <TableCell>Nom visiteur</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Date/Heure</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visiteursStand.map((v, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{v.visiteur?.prenom}</TableCell>
                    <TableCell>{v.visiteur?.nom}</TableCell>
                    <TableCell>{v.visiteur?.email}</TableCell>
                    <TableCell>{v.created_at && new Date(v.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        {statsFonction.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Inscrits par fonction</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fonction</TableCell>
                  <TableCell>Nombre</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statsFonction.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.fonction || 'Non renseigné'}</TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        {statsVille.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Inscrits par ville</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ville</TableCell>
                  <TableCell>Nombre</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statsVille.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.ville || 'Non renseignée'}</TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        {statsJour.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Inscrits par jour</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Jour</TableCell>
                  <TableCell>Nombre</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statsJour.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.periode}</TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        {statsSemaine.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Inscrits par semaine</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Semaine</TableCell>
                  <TableCell>Nombre</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statsSemaine.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.periode}</TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        {statsMois.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>Inscrits par mois</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Mois</TableCell>
                  <TableCell>Nombre</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statsMois.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.periode}</TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Paper>
    </Box>
  );
} 