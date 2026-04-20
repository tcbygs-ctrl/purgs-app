import { readSheet, appendRow, updateCell } from '@/lib/sheets';
import { getUser } from '@/lib/auth';

function fmtDateTime(d) {
  return d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ').slice(0, 16);
}

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();

  const { booking_id, actual_qty, remark } = req.body;
  if (!booking_id || actual_qty === undefined) {
    return res.status(400).json({ message: 'กรอกข้อมูลให้ครบ' });
  }

  const bookings = await readSheet('Bookings');
  const idx = bookings.findIndex(b => b.booking_id === booking_id);
  if (idx < 0) return res.status(404).json({ message: 'ไม่พบรายการจอง' });

  const booking = bookings[idx];
  const diff = Number(actual_qty) - Number(booking.qty);

  if (diff !== 0 && (!remark || !remark.trim())) {
    return res.status(400).json({ message: 'กรุณาระบุ Remark เมื่อยอดไม่ตรง' });
  }

  const whId = 'W' + Date.now();
  await appendRow('Warehouse_Check', [
    whId, booking_id, booking.date, booking.supplier_name,
    booking.qty, Number(actual_qty), diff,
    remark || '', user.username, fmtDateTime(new Date()),
  ]);

  const newStatus = diff === 0 ? 'received' : 'received_diff';
  const sheetRow = idx + 2;
  await updateCell('Bookings', sheetRow, 9, newStatus);
  if (remark) await updateCell('Bookings', sheetRow, 11, remark);

  res.json({ ok: true, diff });
}
