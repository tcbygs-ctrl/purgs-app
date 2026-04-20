const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export function formatDate(iso) {
  if (!iso) return '';
  const d = String(iso).slice(0, 10).split('-');
  if (d.length !== 3) return iso;
  const [y, m, day] = d;
  return `${day}/${m}/${y}`;
}

export function formatDateTH(iso) {
  if (!iso) return '';
  const d = String(iso).slice(0, 10).split('-');
  if (d.length !== 3) return iso;
  const [y, m, day] = d;
  return `${Number(day)} ${TH_MONTHS[Number(m) - 1] || ''} ${y}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const s = String(value).replace('T', ' ');
  const [datePart, timePart = ''] = s.split(' ');
  const d = datePart.split('-');
  if (d.length !== 3) return value;
  const [y, m, day] = d;
  const hm = timePart ? timePart.slice(0, 5) : '';
  return hm ? `${day}/${m}/${y} ${hm}` : `${day}/${m}/${y}`;
}
