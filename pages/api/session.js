import cookie from 'cookie';

export default async function handler(req, res) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const session = cookies['cnol-session'];
  if (!session) {
    return res.status(401).json({ message: 'Non connecté' });
  }
  try {
    const sessionData = JSON.parse(decodeURIComponent(session));
    return res.status(200).json({ session: sessionData });
  } catch (e) {
    return res.status(400).json({ message: 'Session invalide' });
  }
} 