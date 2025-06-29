// 1. Dans getServerSideProps, ajouter la récupération des stands visités
export const getServerSideProps = async ({ req }) => {
  // ... code existant jusqu'à userWithReservations ...

  // 5. Récupérer les stands visités directement depuis la base de données
  const { data: standsVisitesData, error: standsVisitesError } = await supabase
    .from('stands_visites')
    .select(`
      *,
      exposant:exposants(*)
    `)
    .eq('user_code', userData.identifiant_badge)
    .order('created_at', { ascending: false });

  if (standsVisitesError) {
    console.error("Erreur de récupération des stands visités:", standsVisitesError);
  }

  // 6. Combiner toutes les données
  const userWithAllData = {
    ...userData,
    reservations_ateliers: ateliersData || [],
    reservations_masterclass: masterclassData || [],
    stands_visites: standsVisitesData || [], // Ajouter ici
  };

  return {
    props: {
      user: userWithAllData,
    },
  };
};

// 2. Dans le composant, initialiser les stands visités depuis les props
export default function MonEspace({ user }) {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [exposantsList, setExposantsList] = useState([]);
  
  // Initialiser avec les données reçues depuis getServerSideProps
  const [standsVisites, setStandsVisites] = useState(user.stands_visites || []);
  const [loadingStandsVisites, setLoadingStandsVisites] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  // ... reste du code existant ...

  useEffect(() => {
    // ... code existant pour les autres fonctions ...

    // 3. Modifier la fonction fetchStandsVisites pour être plus robuste
    const fetchStandsVisites = async () => {
      setLoadingStandsVisites(true);
      try {
        // Essayer d'abord l'API existante
        const res = await fetch('/api/user-space', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: user.identifiant_badge, email: user.email })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.stands_visites && data.stands_visites.length > 0) {
            setStandsVisites(data.stands_visites);
          }
        } else {
          // Si l'API échoue, utiliser directement Supabase
          const { data: directStandsData, error } = await supabase
            .from('stands_visites')
            .select(`
              *,
              exposant:exposants(*)
            `)
            .eq('user_code', user.identifiant_badge)
            .order('created_at', { ascending: false });

          if (!error && directStandsData) {
            setStandsVisites(directStandsData);
          }
        }
      } catch (e) {
        console.error('Erreur lors de la récupération des stands visités:', e);
        // Fallback vers Supabase direct en cas d'erreur
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('stands_visites')
            .select(`
              *,
              exposant:exposants(*)
            `)
            .eq('user_code', user.identifiant_badge)
            .order('created_at', { ascending: false });

          if (!fallbackError && fallbackData) {
            setStandsVisites(fallbackData);
          }
        } catch (fallbackE) {
          console.error('Erreur fallback stands visités:', fallbackE);
        }
      }
      setLoadingStandsVisites(false);
    };

    // Ne charger que si on n'a pas déjà les données ou si elles sont vides
    if (user && user.identifiant_badge && (!standsVisites || standsVisites.length === 0)) {
      fetchStandsVisites();
    }

    // ... reste du code existant ...
  }, [user.identifiant_badge, user.email]);

  // 4. Ajouter une fonction pour rafraîchir les stands visités
  const refreshStandsVisites = async () => {
    setLoadingStandsVisites(true);
    try {
      const { data: refreshedData, error } = await supabase
        .from('stands_visites')
        .select(`
          *,
          exposant:exposants(*)
        `)
        .eq('user_code', user.identifiant_badge)
        .order('created_at', { ascending: false });

      if (!error && refreshedData) {
        setStandsVisites(refreshedData);
      }
    } catch (e) {
      console.error('Erreur lors du rafraîchissement:', e);
    }
    setLoadingStandsVisites(false);
  };

  // ... reste du composant inchangé ...

  // Dans le JSX, ajouter un bouton de rafraîchissement
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      {/* ... code existant jusqu'à la section Stands visités ... */}
      
      {/* Section Stands visités - avec bouton de rafraîchissement */}
      {user.valide && (
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 2, borderRadius: 4, boxShadow: 1, background: '#f7f7f7' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                <QrCodeScanner sx={{ mr: 1, verticalAlign: 'middle' }} />
                Stands visités
              </Typography>
              <IconButton onClick={refreshStandsVisites} disabled={loadingStandsVisites}>
                {loadingStandsVisites ? <CircularProgress size={24} /> : <Refresh />}
              </IconButton>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<QrCodeScanner />}
              href="/scan-stand-visiteur"
              sx={{ mb: 2 }}
            >
              Scanner un stand
            </Button>
            {loadingStandsVisites ? (
              <CircularProgress sx={{ ml: 2 }} />
            ) : standsVisites.length > 0 ? (
              <List>
                {standsVisites.map((sv, idx) => (
                  <ListItem key={`${sv.id}-${idx}`} divider={idx < standsVisites.length - 1}>
                    <ListItemAvatar>
                      <Avatar src={sv.exposant?.logo_url || undefined}>
                        {sv.exposant?.nom ? sv.exposant.nom[0].toUpperCase() : '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={sv.exposant?.nom || 'Stand inconnu'}
                      secondary={
                        <>
                          {sv.exposant?.type_produits && (
                            <Typography component="span" variant="body2" color="text.primary">
                              Produits : {sv.exposant.type_produits}
                            </Typography>
                          )}
                          <br />
                          {sv.created_at && `Visité le ${new Date(sv.created_at).toLocaleString('fr-FR')}`}
                        </>
                      }
                    />
                    {sv.exposant?.id && (
                      <IconButton
                        edge="end"
                        aria-label="download"
                        onClick={() => handleDownloadExposantFiche(sv.exposant?.id, sv.exposant?.nom)}
                      >
                        <Download />
                      </IconButton>
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucun stand visité pour l'instant.
              </Typography>
            )}
          </Paper>
        </Grid>
      )}

      {/* ... reste du code ... */}
    </Box>
  );
}
