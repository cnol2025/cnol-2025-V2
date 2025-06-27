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

  if (!exposant.publie) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Cette fiche exposant n'est pas encore publiée.</Typography></Box>;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Button variant="outlined" onClick={() => router.push('/mon-espace')} sx={{ mb: 2 }}>Retour</Button>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Avatar src={exposant.logo_url || undefined} alt={exposant.nom} sx={{ width: 120, height: 120, mb: 2, fontSize: 48 }}>
            {(!exposant.logo_url && exposant.nom) ? exposant.nom[0].toUpperCase() : ''}
          </Avatar>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>{exposant.nom}</Typography>
          {exposant.sponsoring_level && <Chip label={exposant.sponsoring_level.toUpperCase()} color="primary" size="medium" sx={{ mb: 2 }} />}
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Type de produits :</Typography>
          <Typography sx={{ mb: 2 }}>{exposant.type_produits}</Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Marques :</Typography>
          <ul style={{ marginBottom: 16 }}>
            {(exposant.marques && exposant.marques.length > 0) ? (
              exposant.marques.map((marque, idx) => (
                <li key={idx}>{marque}</li>
              ))
            ) : (
              <li>Aucune marque/produit renseigné.</li>
            )}
          </ul>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Les responsables de la société :</Typography>
          <ul style={{ marginBottom: 16 }}>
            {exposant.responsables && exposant.responsables.length > 0 ? (
              exposant.responsables.map((resp, idx) => (
                <li key={idx} style={{ marginBottom: 8 }}>
                  <b>{resp.fonction} :</b> {resp.nom} {resp.prenom}
                  {resp.telephones && resp.telephones.length > 0 && (
                    <div style={{ fontSize: 14, marginLeft: 8 }}>Num : {resp.telephones.join(', ')}</div>
                  )}
                  {resp.emails && resp.emails.length > 0 && (
                    <div style={{ fontSize: 14, marginLeft: 8 }}>Email : {resp.emails.join(', ')}</div>
                  )}
                </li>
              ))
            ) : (
              <li>Non renseigné</li>
            )}
          </ul>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Téléphones :</Typography>
          <ul style={{ marginBottom: 16 }}>
            {(exposant.telephones && exposant.telephones.length > 0) ? (
              exposant.telephones.map((tel, idx) => <li key={idx}>{tel}</li>)
            ) : (
              <li>Non renseigné</li>
            )}
          </ul>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Emails :</Typography>
          <ul style={{ marginBottom: 16 }}>
            {(exposant.emails && exposant.emails.length > 0) ? (
              exposant.emails.map((email, idx) => <li key={idx}>{email}</li>)
            ) : (
              <li>Non renseigné</li>
            )}
          </ul>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Adresses postales :</Typography>
          <ul style={{ marginBottom: 16 }}>
            {(exposant.adresses && exposant.adresses.length > 0) ? (
              exposant.adresses.map((adr, idx) => <li key={idx}>{adr}</li>)
            ) : (
              <li>Non renseigné</li>
            )}
          </ul>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Site web :</Typography>
          <Typography sx={{ mb: 2 }}><a href={exposant.site_web} target="_blank" rel="noopener noreferrer">{exposant.site_web}</a></Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>Réseaux sociaux :</Typography>
          <ul>
            <li>Facebook : {exposant.facebook}</li>
            <li>Instagram : {exposant.instagram}</li>
            <li>LinkedIn : {exposant.linkedin}</li>
            <li>Twitter : {exposant.twitter}</li>
          </ul>
        </Box>
      </Paper>
    </Box>
  );
} 