import { readSheet } from '@/lib/sheets';
import { getUser } from '@/lib/auth';

function buildRows(bookings, whHistory) {
  return bookings.map(b => {
    const wh = whHistory.find(w => w.booking_id === b.booking_id) || {};
    return {
      date:          b.date,
      supplier_name: b.supplier_name,
      period:        b.period,
      booked_qty:    Number(b.qty) || 0,
      actual_qty:    wh.actual_qty !== undefined ? Number(wh.actual_qty) : null,
      diff:          wh.diff !== undefined ? Number(wh.diff) : null,
      remark:        wh.remark || '',
      status:        b.status,
    };
  });
}

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();

  const { from, to, supplier_ids } = req.query;
  if (!from || !to) {
    return res.status(400).json({ message: 'ต้องระบุ from และ to' });
  }

  const supplierSet = supplier_ids
    ? new Set(String(supplier_ids).split(',').map(s => s.trim()).filter(Boolean))
    : null;

  const [allBookings, allWh] = await Promise.all([
    readSheet('Bookings'),
    readSheet('Warehouse_Check'),
  ]);

  let bookings = allBookings.filter(
    b => b.status !== 'cancelled' && b.date >= from && b.date <= to
  );
  if (supplierSet && supplierSet.size > 0) {
    bookings = bookings.filter(b => supplierSet.has(b.supplier_id));
  }

  const whHistory = allWh.filter(w => w.date >= from && w.date <= to);
  const rows = buildRows(bookings, whHistory);

  const total_booked = rows.reduce((s, r) => s + r.booked_qty, 0);
  const total_actual = rows.filter(r => r.actual_qty !== null).reduce((s, r) => s + r.actual_qty, 0);

  res.json({ from, to, rows, total_booked, total_actual, total_diff: total_actual - total_booked });
}
