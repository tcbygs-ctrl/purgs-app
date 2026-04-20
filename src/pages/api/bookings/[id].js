import { readSheet, updateCell } from '@/lib/sheets';
import { getUser } from '@/lib/auth';

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  // DELETE /api/bookings/[id]  — cancel
  if (req.method === 'DELETE') {
    const { id } = req.query;
    const rows = await readSheet('Bookings');
    const idx = rows.findIndex(r => r.booking_id === id);
    if (idx < 0) return res.status(404).json({ message: 'ไม่พบรายการ' });

    const booking = rows[idx];
    if (booking.user_id !== user.user_id) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ยกเลิก' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'ยกเลิกได้เฉพาะรายการที่รอดำเนินการ' });
    }

    await updateCell('Bookings', idx + 2, 9, 'cancelled');
    return res.json({ ok: true });
  }

  res.status(405).end();
}
