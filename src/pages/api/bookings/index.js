import { readSheet, appendRow } from '@/lib/sheets';
import { getUser } from '@/lib/auth';
import { getQuotaForDate } from '@/lib/quota';

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}
function fmtDateTime(d) {
  return d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ').slice(0, 16);
}

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  // GET /api/bookings?date=YYYY-MM-DD  or  ?from=&to=
  if (req.method === 'GET') {
    let rows = await readSheet('Bookings');
    const { date, from, to } = req.query;
    if (date) rows = rows.filter(r => r.date === date);
    if (from) rows = rows.filter(r => r.date >= from);
    if (to)   rows = rows.filter(r => r.date <= to);
    return res.json(rows);
  }

  // POST /api/bookings  { date, supplier_id, qty, period }
  if (req.method === 'POST') {
    const { date, supplier_id, qty, period } = req.body;
    if (!date || !supplier_id || !qty || !period) {
      return res.status(400).json({ message: 'กรอกข้อมูลให้ครบ' });
    }

    // Check quota
    const quota = await getQuotaForDate(date);
    const remaining = period === 'morning' ? quota.remaining_morning : quota.remaining_afternoon;
    if (Number(qty) > remaining) {
      return res.status(400).json({ message: `โควต้า${period === 'morning' ? 'เช้า' : 'บ่าย'}คงเหลือ ${remaining} ไม่เพียงพอ` });
    }

    // Get supplier name
    const suppliers = await readSheet('Suppliers');
    const sup = suppliers.find(s => s.supplier_id === supplier_id);
    if (!sup) return res.status(400).json({ message: 'ไม่พบ Supplier' });

    const id = 'B' + Date.now();
    const now = new Date();
    await appendRow('Bookings', [
      id, date, supplier_id, sup.supplier_name, Number(qty),
      period, user.user_id, user.username, 'pending', fmtDateTime(now), '',
    ]);
    return res.status(201).json({ booking_id: id });
  }

  res.status(405).end();
}
