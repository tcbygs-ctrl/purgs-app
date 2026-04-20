import { readSheet } from './sheets';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export async function getQuotaForDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayName = DAY_NAMES[date.getDay()];

  const [quotaRows, bookingRows] = await Promise.all([
    readSheet('Quota'),
    readSheet('Bookings'),
  ]);

  const dayQuota = quotaRows.find(q => q.day_of_week === dayName) || {
    quota_morning: 0, quota_afternoon: 0,
  };

  const dayBookings = bookingRows.filter(b => b.date === dateStr && b.status !== 'cancelled');
  let used_morning = 0, used_afternoon = 0;
  dayBookings.forEach(b => {
    if (b.period === 'morning')   used_morning   += Number(b.qty) || 0;
    if (b.period === 'afternoon') used_afternoon += Number(b.qty) || 0;
  });

  return {
    day: dayName,
    quota_morning:       Number(dayQuota.quota_morning),
    quota_afternoon:     Number(dayQuota.quota_afternoon),
    used_morning,
    used_afternoon,
    remaining_morning:   Number(dayQuota.quota_morning)   - used_morning,
    remaining_afternoon: Number(dayQuota.quota_afternoon) - used_afternoon,
  };
}
