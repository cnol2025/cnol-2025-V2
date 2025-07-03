import { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Grid, Paper, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import InscriptionsAdmin from '../../components/InscriptionsAdmin';
import AteliersAdmin from '../../components/AteliersAdmin';
import MasterclassAdmin from '../../components/MasterclassAdmin';
import IntervenantsAdmin from '../../components/IntervenantsAdmin';
import NotificationsAdmin from '../../components/NotificationsAdmin';
import StatistiquesAdmin from '../../components/StatistiquesAdmin';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const drawerWidth = 220;

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon /> },
  { text: 'Statistiques', icon: <BarChartIcon /> },
  { text: 'Inscriptions', icon: <PeopleIcon /> },
  { text: 'Exposants', icon: <BusinessIcon /> },
  { text: 'Ateliers', icon: <EventIcon /> },
  { text: 'Masterclass', icon: <EventIcon /> },
  { text: 'Intervenants', icon: <PeopleIcon /> },
  { text: 'Notifications', icon: <NotificationsIcon /> },
  { text: 'Paramètres', icon: <SettingsIcon /> },
];

export default function Administration() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState('Dashboard');
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Placeholders stats (à remplacer par vraies données)
  const stats = [
    { label: 'Total inscrits', value: '...' },
    { label: 'Validés', value: '...' },
    { label: 'Exposants', value: '...' },
    { label: 'Villes', value: '...' },
    { label: 'Réservations', value: '...' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap>Admin CNOL</Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem button key={item.text} selected={selected === item.text} onClick={() => { setSelected(item.text); setMobileOpen(false); }}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ p: 2, textAlign: 'center', fontSize: 13, color: 'grey.600' }}>
        CNOL 2025 – Admin<br />Version 1.0<br />Support : cnol.badge@gmail.com
      </Box>
    </Box>
  );

  function handlePublishProgramme() {
    // Publie le dernier programme (le plus récent)
    (async () => {
      const { data, error } = await supabase
        .from('programme_general')
        .select('id')
        .order('date_publication', { ascending: false })
        .limit(1)
        .single();
      if (error || !data) {
        toast.error('Aucun programme à publier.');
        return;
      }
      // Dépublie tous les autres
      await supabase.from('programme_general').update({ publie: false }).neq('id', data.id);
      // Publie celui-ci
      const { error: pubErr } = await supabase.from('programme_general').update({ publie: true }).eq('id', data.id);
      if (pubErr) {
        toast.error('Erreur lors de la publication du programme.');
      } else {
        toast.success('Programme publié !');
      }
    })();
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f6fa' }}>
      {/* Sidebar */}
      <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` }, bgcolor: '#222' }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">Administration</Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 4 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}>
        {selected === 'Dashboard' && (
          <>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>Dashboard d'administration</Typography>
            {/* Tuiles statistiques clés - À remplacer */}
            <Box sx={{ display: 'flex', gap: 3, mb: 4, justifyContent: 'center' }}>
              <Button variant="contained" color="primary" size="large" sx={{ minWidth: 220, minHeight: 80, fontSize: 22 }} onClick={() => window.open('/scan-badge', '_blank')}>Scanner badge</Button>
              <Button variant="contained" color="secondary" size="large" sx={{ minWidth: 220, minHeight: 80, fontSize: 22 }} onClick={() => window.open('/scan-ticket', '_blank')}>Scanner ticket</Button>
              <Button variant="contained" color="success" size="large" sx={{ minWidth: 220, minHeight: 80, fontSize: 22 }} onClick={handlePublishProgramme}>Publier programme</Button>
            </Box>
            {/* Accès rapide */}
            <Typography variant="h6" sx={{ mb: 2 }}>Accès rapide</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="contained" onClick={() => setSelected('Statistiques')}>Voir les statistiques</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="contained" onClick={() => setSelected('Inscriptions')}>Gérer les inscriptions</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="contained">Gérer les exposants</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="contained" onClick={async () => { setSelected('Ateliers'); setTimeout(() => { const ateliersBtn = document.querySelector('[data-open-internal-atelier]'); if (ateliersBtn) ateliersBtn.click(); }, 300); }}>Ouvrir réservations ateliers</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="contained" onClick={async () => { setSelected('Masterclass'); setTimeout(() => { const masterBtn = document.querySelector('[data-open-internal-masterclass]'); if (masterBtn) masterBtn.click(); }, 300); }}>Ouvrir réservations masterclass</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="contained" onClick={() => setSelected('Intervenants')}>Gérer les intervenants</Button></Grid>
            </Grid>
            {/* Placeholder logs récents */}
            <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Dernières actions</Typography>
            <Paper sx={{ p: 2, minHeight: 80 }}>Aucune action récente.</Paper>
          </>
        )}
        {selected === 'Inscriptions' && <InscriptionsAdmin />}
        {selected === 'Ateliers' && <AteliersAdmin />}
        {selected === 'Masterclass' && <MasterclassAdmin />}
        {selected === 'Intervenants' && <IntervenantsAdmin />}
        {selected === 'Notifications' && <NotificationsAdmin />}
        {selected === 'Statistiques' && <StatistiquesAdmin />}
      </Box>
    </Box>
  );
} 