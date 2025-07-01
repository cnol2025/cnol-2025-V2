import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Box, Typography, Grid, Card, CardContent, CardMedia, Chip, Stack, Divider, CircularProgress } from '@mui/material';
import { Facebook, Twitter, LinkedIn, Language } from '@mui/icons-material';

export default function IntervenantsPage() {
  const [intervenants, setIntervenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interventions, setInterventions] = useState({});

  useEffect(() => {
    fetchIntervenants();
  }, []);

  async function fetchIntervenants() {
    setLoading(true);
    const { data, error } = await supabase.from('intervenants').select('*').order('nom');
    if (!error && data) {
      setIntervenants(data);
      // Pour chaque intervenant, fetch ses interventions
      const allInterventions = {};
      for (const interv of data) {
        const { data: intvs } = await supabase.from('interventions').select('*').eq('intervenant_id', interv.id);
        allInterventions[interv.id] = intvs || [];
      }
      setInterventions(allInterventions);
    }
    setLoading(false);
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: 3 }}>
      <Typography variant="h3" fontWeight="bold" gutterBottom>Intervenants</Typography>
      {loading ? <CircularProgress /> : (
        <Grid container spacing={3}>
          {intervenants.map(interv => (
            <Grid item xs={12} md={6} key={interv.id}>
              <Card sx={{ display: 'flex', minHeight: 220 }}>
                <CardMedia
                  component="img"
                  image={interv.photo_url || '/images/avatar-placeholder.png'}
                  alt={interv.nom}
                  sx={{ width: 140, height: 180, objectFit: 'cover', borderRadius: 2, m: 2, bgcolor: '#eee' }}
                  onError={e => { e.target.src = '/images/avatar-placeholder.png'; }}
                />
                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight="bold">{interv.prenom} {interv.nom}</Typography>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>{interv.fonction}</Typography>
                  {/* Réseaux sociaux */}
                  {interv.reseaux_sociaux && (
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      {interv.reseaux_sociaux.facebook && (
                        <a href={interv.reseaux_sociaux.facebook} target="_blank" rel="noopener noreferrer"><Facebook color="primary" /></a>
                      )}
                      {interv.reseaux_sociaux.twitter && (
                        <a href={interv.reseaux_sociaux.twitter} target="_blank" rel="noopener noreferrer"><Twitter color="primary" /></a>
                      )}
                      {interv.reseaux_sociaux.linkedin && (
                        <a href={interv.reseaux_sociaux.linkedin} target="_blank" rel="noopener noreferrer"><LinkedIn color="primary" /></a>
                      )}
                      {interv.reseaux_sociaux.site && (
                        <a href={interv.reseaux_sociaux.site} target="_blank" rel="noopener noreferrer"><Language color="primary" /></a>
                      )}
                    </Stack>
                  )}
                  <Typography variant="body2" sx={{ mb: 2 }}>{interv.biographie}</Typography>
                  {interventions[interv.id] && interventions[interv.id].length > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Participations :</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {interventions[interv.id].map(part => (
                          <Chip key={part.id} label={`${part.type} : ${part.titre}`} sx={{ mb: 1 }} />
                        ))}
                      </Stack>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
} 