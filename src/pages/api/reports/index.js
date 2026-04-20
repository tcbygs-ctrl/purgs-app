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

  const { type, date, year, month, supplier_id, from, to } = req.query;

  const [allBookings, allWh] = await Promise.all([
    readSheet('Bookings'),
    readSheet('Warehouse_Check'),
  ]);

  let fromDate, toDate;

  if (type === 'daily') {
    fromDate = toDate = date;
  } else if (type === 'monthly') {
    const y = Number(year), m = Number(month);
    fromDate = `${y}-${String(m).padStart(2,'0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    toDate = `${y}-${String(m).padStart(2,'0')}-${lastDay}`;
  } else if (type === 'supplier') {
    fromDate = from; toDate = to;
  } else {
    return res.status(400).json({ message: 'ระบุ type: daily | monthly | supplier' });
  }

  let bookings = allBookings.filter(b => b.status !== 'cancelled' && b.date >= fromDate && b.date <= toDate);
  if (type === 'supplier' && supplier_id) {
    bookings = bookings.filter(b => b.supplier_id === supplier_id);
  }

  const whHistory = allWh.filter(w => w.date >= fromDate && w.date <= toDate);
  const rows = buildRows(bookings, whHistory);

  const total_booked = rows.reduce((s, r) => s + r.booked_qty, 0);
  const total_actual = rows.filter(r => r.actual_qty !== null).reduce((s, r) => s + r.actual_qty, 0);

  res.json({ from: fromDate, to: toDate, rows, total_booked, total_actual, total_diff: total_actual - total_booked });
}
