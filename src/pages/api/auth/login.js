import { readSheet } from '@/lib/sheets';
import { signToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { pin } = req.body;
  if (!pin || String(pin).length !== 4) {
    return res.status(400).json({ message: 'PIN ต้องมี 4 หลัก' });
  }

  const users = await readSheet('Users');
  const user = users.find(u => String(u.pin) === String(pin) && u.active === 'TRUE');

  if (!user) {
    return res.status(401).json({ message: 'PIN ไม่ถูกต้องหรือบัญชีถูกระงับ' });
  }

  const token = await signToken({
    user_id: user.user_id,
    username: user.username,
    role: user.role,
  });

  res.json({ token, user: { user_id: user.user_id, username: user.username, role: user.role } });
}
