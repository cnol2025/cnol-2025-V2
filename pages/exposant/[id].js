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
        <Typography sx={{ mb: 2 }}>{exposant.type_produits}</Typography>

        <Typography variant="subtitle1" sx={{ mb: 1 }}><b>Marques :</b></Typography>
        <ul>
          {(exposant.marques && exposant.marques.length > 0) ? (
            exposant.marques.map((marque, idx) => (
              <li key={idx}>{marque}</li>
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
                <b>{resp.fonction} :</b> {resp.nom} {resp.prenom} —
                {resp.telephones && resp.telephones.length > 0 && (
                  <> Num: {resp.telephones.join(', ')}</>
                )}
                {resp.emails && resp.emails.length > 0 && (
                  <> — Email: {resp.emails.join(', ')}</>
                )}
              </li>
            ))
          ) : (
            <li>Non renseigné</li>
          )}
        </ul>

        <Typography><b>Téléphones :</b></Typography>
        <ul>
          {(exposant.telephones && exposant.telephones.length > 0) ? (
            exposant.telephones.map((tel, idx) => <li key={idx}>{tel}</li>)
          ) : (
            <li>Non renseigné</li>
          )}
        </ul>
        <Typography><b>Emails :</b></Typography>
        <ul>
          {(exposant.emails && exposant.emails.length > 0) ? (
            exposant.emails.map((email, idx) => <li key={idx}>{email}</li>)
          ) : (
            <li>Non renseigné</li>
          )}
        </ul>
        <Typography><b>Adresses postales :</b></Typography>
        <ul>
          {(exposant.adresses && exposant.adresses.length > 0) ? (
            exposant.adresses.map((adr, idx) => <li key={idx}>{adr}</li>)
          ) : (
            <li>Non renseigné</li>
          )}
        </ul>
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