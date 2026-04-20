import { readSheet, appendRow } from '@/lib/sheets';
import { getUser } from '@/lib/auth';

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  // GET /api/suppliers?active=true
  if (req.method === 'GET') {
    let rows = await readSheet('Suppliers');
    if (req.query.active === 'true') rows = rows.filter(r => r.active === 'TRUE');
    return res.json(rows);
  }

  // POST /api/suppliers  { supplier_name, contact }
  if (req.method === 'POST') {
    const { supplier_name, contact } = req.body;
    if (!supplier_name?.trim()) return res.status(400).json({ message: 'กรุณากรอกชื่อ Supplier' });
    const id = 'S' + Date.now();
    await appendRow('Suppliers', [id, supplier_name.trim(), contact || '', 'TRUE']);
    return res.status(201).json({ supplier_id: id });
  }

  res.status(405).end();
}
