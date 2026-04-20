import { readSheet } from '@/lib/sheets';
import { getUser } from '@/lib/auth';

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();

  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'ต้องระบุ date' });

  const [bookings, whChecks] = await Promise.all([
    readSheet('Bookings'),
    readSheet('Warehouse_Check'),
  ]);

  const dayBookings = bookings.filter(b => b.date === date && b.status !== 'cancelled');
  const dayWh = whChecks.filter(w => w.date === date);

  const result = dayBookings.map(b => {
    const wh = dayWh.find(w => w.booking_id === b.booking_id) || null;
    return { ...b, warehouse: wh };
  });

  res.json(result);
}
