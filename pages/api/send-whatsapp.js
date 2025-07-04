import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { to, text } = req.body;
  const apiKey = 'VOTRE_CLE_API'; // Remplace par ta clé API valide

  try {
    const response = await fetch('https://wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, text })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Wasender error:', data);
      throw new Error(data.error || data.message || JSON.stringify(data) || 'Erreur Wasender');
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 