import { readSheet } from '@/lib/sheets';
import { getUser } from '@/lib/auth';

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getRange(period, dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (period === 'weekly') {
    const dow = d.getDay(); // 0=Sun..6=Sat
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: toISO(mon), to: toISO(sun) };
  }
  if (period === 'monthly') {
    const y = d.getFullYear(), m = d.getMonth();
    return { from: toISO(new Date(y, m, 1)), to: toISO(new Date(y, m + 1, 0)) };
  }
  return { from: dateStr, to: dateStr };
}

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();

  const { period = 'daily', date } = req.query;
  if (!date) return res.status(400).json({ message: 'ต้องระบุ date' });

  const { from, to } = getRange(period, date);

  const [bookings, whChecks] = await Promise.all([
    readSheet('Bookings'),
    readSheet('Warehouse_Check'),
  ]);

  const rangeBookings = bookings.filter(
    b => b.status !== 'cancelled' && b.date >= from && b.date <= to
  );
  const rangeWh = whChecks.filter(w => w.date >= from && w.date <= to);

  const bySup = new Map();
  rangeBookings.forEach(b => {
    const key = b.supplier_id;
    if (!bySup.has(key)) {
      bySup.set(key, {
        supplier_id: b.supplier_id,
        supplier_name: b.supplier_name,
        booking_count: 0,
        total_booked: 0,
        received_count: 0,
        received_diff_count: 0,
        pending_count: 0,
        total_actual: 0,
      });
    }
    const s = bySup.get(key);
    s.booking_count += 1;
    s.total_booked += Number(b.qty) || 0;
    const wh = rangeWh.find(w => w.booking_id === b.booking_id);
    if (wh) {
      s.received_count += 1;
      s.total_actual += Number(wh.actual_qty) || 0;
      if (Number(wh.diff) !== 0) s.received_diff_count += 1;
    } else {
      s.pending_count += 1;
    }
  });

  const suppliers = Array.from(bySup.values())
    .map(s => ({ ...s, diff: s.total_actual - s.total_booked }))
    .sort((a, b) => b.total_booked - a.total_booked);

  const summary = {
    supplier_count:       suppliers.length,
    total_bookings:       rangeBookings.length,
    total_booked:         suppliers.reduce((s, x) => s + x.total_booked, 0),
    total_received_count: suppliers.reduce((s, x) => s + x.received_count, 0),
    total_actual:         suppliers.reduce((s, x) => s + x.total_actual, 0),
  };
  summary.pending_count = summary.total_bookings - summary.total_received_count;
  summary.total_diff    = summary.total_actual - summary.total_booked;

  res.json({ period, from, to, summary, suppliers });
}
