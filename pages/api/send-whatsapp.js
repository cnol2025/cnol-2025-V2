import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { to, text } = req.body;
  const apiKey = 'a0277b2830308ca6f14242075273d85d9ce2a4bf704d52b41fa76f38484a824b'; // clé de test

  try {
    const response = await fetch('https://api.wasenderapi.com/send-text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, text_body: text })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Wasender error:', data);
      throw new Error(data.error || JSON.stringify(data) || 'Erreur Wasender');
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 