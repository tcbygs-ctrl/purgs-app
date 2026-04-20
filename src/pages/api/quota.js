import { readSheet, updateRow, appendRow } from '@/lib/sheets';
import { getUser } from '@/lib/auth';
import { getQuotaForDate } from '@/lib/quota';

const DAYS_TH = ['วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์','วันอาทิตย์'];

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  // GET /api/quota?date=YYYY-MM-DD   → summary for a specific date
  // GET /api/quota                   → full list of all days (for QuotaTab)
  if (req.method === 'GET') {
    const { date } = req.query;
    if (date) {
      const quota = await getQuotaForDate(date);
      return res.json(quota);
    }
    const rows = await readSheet('Quota');
    const map = new Map(rows.filter(r => r.Date).map(r => [r.Date, r]));
    const list = DAYS_TH.map(d => {
      const r = map.get(d);
      return {
        ID: r?.ID || '',
        Date: d,
        daily_quota_full: Number(r?.daily_quota_full) || 0,
      };
    });
    return res.json(list);
  }

  // PUT /api/quota  { Date, daily_quota_full }
  if (req.method === 'PUT') {
    if (user.role !== 'purchasing') return res.status(403).json({ message: 'Forbidden' });
    const { Date: day, daily_quota_full } = req.body;
    if (!day || !DAYS_TH.includes(day)) return res.status(400).json({ message: 'ระบุชื่อวัน (ภาษาไทย) ให้ถูกต้อง' });
    const qty = Number(daily_quota_full);
    if (!Number.isFinite(qty) || qty < 0) return res.status(400).json({ message: 'ระบุจำนวนเป็นตัวเลขไม่ติดลบ' });

    const rows = await readSheet('Quota');
    const idx = rows.findIndex(r => r.Date === day);
    if (idx >= 0) {
      const id = rows[idx].ID || ('q-' + Date.now());
      await updateRow('Quota', idx + 2, [id, qty, day]);
    } else {
      await appendRow('Quota', ['q-' + Date.now(), qty, day]);
    }
    return res.json({ ok: true });
  }

  res.status(405).end();
}
