import { readSheet } from '@/lib/sheets';
import { signToken } from '@/lib/auth';

function isActive(v) {
  const s = String(v ?? '').trim().toUpperCase();
  return s !== 'FALSE' && s !== 'NO' && s !== '0';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const pin = String(req.body?.pin ?? '').trim();
    if (!pin || pin.length !== 4) {
      return res.status(400).json({ message: 'PIN ต้องมี 4 หลัก' });
    }

    if (!process.env.SPREADSHEET_ID) {
      return res.status(500).json({ message: 'Server ยังไม่ได้ตั้งค่า SPREADSHEET_ID' });
    }

    const users = await readSheet('Users');
    const matched = users.find(u => String(u.pin ?? '').trim() === pin);

    if (!matched) {
      return res.status(401).json({ message: 'PIN ไม่ถูกต้อง' });
    }
    if (!isActive(matched.active)) {
      return res.status(401).json({ message: 'บัญชีถูกระงับการใช้งาน' });
    }

    const token = await signToken({
      user_id: matched.user_id,
      username: matched.username,
      role: matched.role,
    });

    res.json({
      token,
      user: { user_id: matched.user_id, username: matched.username, role: matched.role },
    });
  } catch (err) {
    console.error('[login] error:', err);
    return res.status(500).json({
      message: `เข้าสู่ระบบล้มเหลว: ${err.message || 'ไม่ทราบสาเหตุ'}`,
    });
  }
}
