import { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';

export default function NotificationsAdmin() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setResult({ success: false, message: data.message || "Une erreur est survenue." });
      } else {
        setResult({ success: true, message: data.message });
        setTitle('');
        setBody('');
        setUrl('');
      }
    } catch (err) {
      setResult({ success: false, message: "Erreur de connexion au serveur." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Envoyer une Notification Push
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Ce message sera envoyé à tous les utilisateurs ayant activé les notifications.
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Titre de la notification"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Corps du message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            required
            multiline
            rows={4}
            sx={{ mb: 2 }}
          />
          <TextField
            label="URL (Optionnel)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
            placeholder="Ex: /ateliers"
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !title || !body}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : "Envoyer la notification"}
          </Button>
        </form>
        {result && (
          <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 3 }}>
            {result.message}
          </Alert>
        )}
      </Paper>
    </Box>
  );
} 