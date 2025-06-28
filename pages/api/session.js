import cookie from 'cookie';

export default async function handler(req, res) {
  let cookieLib = cookie;
  // Sécurité : fallback si import échoue
  if (!cookieLib || typeof cookieLib.parse !== 'function') {
    try {
      cookieLib = require('cookie');
    } catch (e) {
      console.error('Impossible d\'importer le module cookie:', e);
      return res.status(500).json({ message: 'Erreur serveur session (cookie module)' });
    }
  }
  try {
    console.log('Headers cookie:', req.headers.cookie);
    const cookies = req.headers.cookie ? cookieLib.parse(req.headers.cookie) : {};
    const session = cookies['cnol-session'];
    if (!session) {
      return res.status(401).json({ message: 'Non connecté' });
    }
    let sessionData;
    try {
      sessionData = JSON.parse(session);
    } catch (e1) {
      try {
        sessionData = JSON.parse(decodeURIComponent(session));
      } catch (e2) {
        console.error('Erreur parsing session cookie:', e1, e2, 'Cookie brut:', session);
        return res.status(500).json({ message: 'Erreur serveur session' });
      }
    }
    return res.status(200).json({ session: sessionData });
  } catch (e) {
    console.error('Erreur /api/session:', e, 'Cookie brut:', req.headers.cookie);
    return res.status(500).json({ message: 'Erreur serveur session' });
  }
} 