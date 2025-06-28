import cookie from 'cookie';

export default async function handler(req, res) {
  try {
    console.log('Headers cookie:', req.headers.cookie);
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    const session = cookies['cnol-session'];
    if (!session) {
      return res.status(401).json({ message: 'Non connecté' });
    }
    let sessionData;
    try {
      sessionData = JSON.parse(decodeURIComponent(session));
    } catch (e) {
      sessionData = JSON.parse(session);
    }
    return res.status(200).json({ session: sessionData });
  } catch (e) {
    console.error('Erreur /api/session:', e, 'Cookie brut:', req.headers.cookie);
    return res.status(500).json({ message: 'Erreur serveur session' });
  }
} 