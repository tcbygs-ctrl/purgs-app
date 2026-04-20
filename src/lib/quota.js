import { readSheet } from './sheets';

// JS Date.getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
const DAY_TH = ['วันอาทิตย์','วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์'];

export function thaiDayFromDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_TH[d.getDay()];
}

export async function getQuotaForDate(dateStr) {
  const day = thaiDayFromDate(dateStr);

  const [quotaRows, bookingRows] = await Promise.all([
    readSheet('Quota'),
    readSheet('Bookings'),
  ]);

  const dayQuota = quotaRows.find(q => q.Date === day) || { daily_quota_full: 0 };
  const quota_total = Number(dayQuota.daily_quota_full) || 0;

  const dayBookings = bookingRows.filter(b => b.date === dateStr && b.status !== 'cancelled');
  let used_morning = 0, used_afternoon = 0;
  dayBookings.forEach(b => {
    const qty = Number(b.qty) || 0;
    if (b.period === 'morning')   used_morning   += qty;
    if (b.period === 'afternoon') used_afternoon += qty;
  });
  const used_total = used_morning + used_afternoon;

  return {
    day,
    quota_total,
    used_morning,
    used_afternoon,
    used_total,
    remaining_total: quota_total - used_total,
  };
}
