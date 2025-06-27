import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Avatar, Chip, CircularProgress } from '@mui/material';
import { supabase } from '../../lib/supabaseClient';

export default function FicheExposant() {
  const router = useRouter();
  const { id } = router.query;
  const [exposant, setExposant] = useState(null);
  const [marquesList, setMarquesList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchExposant();
      fetchMarques();
    }
    async function fetchExposant() {
      setLoading(true);
      const { data, error } = await supabase.from('exposants').select('*').eq('id', id).single();
      setExposant(data);
      setLoading(false);
    }
    async function fetchMarques() {
      const { data } = await supabase.from('marques_produits').select('*').eq('exposant_id', id);
      setMarquesList(data || []);
    }
  }, [id]);

  if (loading || !exposant) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /><Typography sx={{ mt: 2 }}>Chargement de la fiche exposant...</Typography></Box>;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Button variant="outlined" onClick={() => router.push('/mon-espace')} sx={{ mb: 2 }}>Retour</Button>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {exposant.logo_url && (
            <Avatar src={exposant.logo_url} alt={exposant.nom} sx={{ width: 80, height: 80, mr: 3 }} />
          )}
          <Box>
            <Typography variant="h5" fontWeight="bold">{exposant.nom}</Typography>
            <Chip label={exposant.sponsoring_level || 'Standard'} color="primary" size="small" sx={{ mt: 1 }} />
          </Box>
        </Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}><b>Type de produits :</b></Typography>
        <Typography sx={{ mb: 2 }}>{exposant.description}</Typography>

        <Typography variant="subtitle1" sx={{ mb: 1 }}><b>Marques :</b></Typography>
        <ul>
          {marquesList && marquesList.length > 0 ? (
            marquesList.map(marque => (
              <li key={marque.id}>
                <b>{marque.nom}</b>{marque.description && ` : ${marque.description}`}
              </li>
            ))
          ) : (
            <li>Aucune marque/produit renseigné.</li>
          )}
        </ul>

        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}><b>Les responsables de la société :</b></Typography>
        <ul>
          {exposant.responsables && exposant.responsables.length > 0 ? (
            exposant.responsables.map((resp, idx) => (
              <li key={idx}>
                <b>{resp.fonction} :</b> {resp.nom} {resp.prenom} — Num: {resp.telephone}
              </li>
            ))
          ) : (
            <li>Non renseigné</li>
          )}
        </ul>

        <Typography><b>Téléphone :</b> {exposant.telephone}</Typography>
        <Typography><b>Email :</b> {exposant.email_responsable}</Typography>
        <Typography><b>Adresse postale :</b> {exposant.adresse_postale}</Typography>
        <Typography><b>Site web :</b> <a href={exposant.site_web} target="_blank" rel="noopener noreferrer">{exposant.site_web}</a></Typography>
        <Typography><b>Réseaux sociaux :</b></Typography>
        <ul>
          <li>Facebook : {exposant.facebook}</li>
          <li>Instagram : {exposant.instagram}</li>
          <li>LinkedIn : {exposant.linkedin}</li>
          <li>Twitter : {exposant.twitter}</li>
        </ul>
      </Paper>
    </Box>
  );
} 