import { readSheet, updateRow, appendRow } from '@/lib/sheets';
import { getUser } from '@/lib/auth';
import { getQuotaForDate } from '@/lib/quota';

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  // GET /api/quota?date=YYYY-MM-DD
  if (req.method === 'GET') {
    const { date } = req.query;
    if (!date) {
      const rows = await readSheet('Quota');
      return res.json(rows);
    }
    const quota = await getQuotaForDate(date);
    return res.json(quota);
  }

  // PUT /api/quota  { day_of_week, quota_morning, quota_afternoon }
  if (req.method === 'PUT') {
    if (user.role !== 'purchasing') return res.status(403).json({ message: 'Forbidden' });
    const { day_of_week, quota_morning, quota_afternoon } = req.body;
    const rows = await readSheet('Quota');
    const idx = rows.findIndex(r => r.day_of_week === day_of_week);
    if (idx >= 0) {
      // row in sheet = idx + 2 (1 header + 1-based)
      await updateRow('Quota', idx + 2, [day_of_week, Number(quota_morning), Number(quota_afternoon)]);
    } else {
      await appendRow('Quota', [day_of_week, Number(quota_morning), Number(quota_afternoon)]);
    }
    return res.json({ ok: true });
  }

  res.status(405).end();
}
