import cookie from 'cookie';

export default async function handler(req, res) {
  try {
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    const session = cookies['cnol-session'];
    if (!session) {
      return res.status(401).json({ message: 'Non connecté' });
    }
    const sessionData = JSON.parse(decodeURIComponent(session));
    return res.status(200).json({ session: sessionData });
  } catch (e) {
    console.error('Erreur /api/session:', e);
    return res.status(500).json({ message: 'Erreur serveur session' });
  }
} 