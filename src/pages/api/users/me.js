import { readSheet, updateCell } from '@/lib/sheets';
import { getUser, signToken } from '@/lib/auth';

// Users sheet columns: user_id(A), username(B), pin(C), role(D), active(E)
export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const rows = await readSheet('Users');
  const idx = rows.findIndex(r => r.user_id === user.user_id);
  if (idx < 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
  const sheetRow = idx + 2;
  const record = rows[idx];

  if (req.method === 'GET') {
    return res.json({
      user_id:  record.user_id,
      username: record.username,
      role:     record.role,
      active:   record.active,
    });
  }

  if (req.method === 'PUT') {
    const { username } = req.body;
    if (!username?.trim()) return res.status(400).json({ message: 'กรุณากรอกชื่อ' });
    await updateCell('Users', sheetRow, 2, username.trim());
    const token = await signToken({ user_id: user.user_id, username: username.trim(), role: user.role });
    return res.json({
      token,
      user: { user_id: user.user_id, username: username.trim(), role: user.role },
    });
  }

  res.status(405).end();
}
