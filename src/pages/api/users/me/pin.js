import { readSheet, updateCell } from '@/lib/sheets';
import { getUser } from '@/lib/auth';

// PUT /api/users/me/pin   { current_pin, new_pin }
export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.method !== 'PUT') return res.status(405).end();

  const { current_pin, new_pin } = req.body;
  if (!current_pin || !new_pin) {
    return res.status(400).json({ message: 'กรุณากรอก PIN ปัจจุบันและ PIN ใหม่' });
  }
  if (!/^\d{4}$/.test(String(new_pin))) {
    return res.status(400).json({ message: 'PIN ใหม่ต้องเป็นตัวเลข 4 หลัก' });
  }

  const rows = await readSheet('Users');
  const idx = rows.findIndex(r => r.user_id === user.user_id);
  if (idx < 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

  if (String(rows[idx].pin) !== String(current_pin)) {
    return res.status(401).json({ message: 'PIN ปัจจุบันไม่ถูกต้อง' });
  }

  await updateCell('Users', idx + 2, 3, String(new_pin));
  return res.json({ ok: true });
}
