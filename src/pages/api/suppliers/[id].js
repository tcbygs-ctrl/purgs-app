import { readSheet, updateRow } from '@/lib/sheets';
import { getUser } from '@/lib/auth';

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.query;
  const rows = await readSheet('Suppliers');
  const idx = rows.findIndex(r => r.supplier_id === id);
  if (idx < 0) return res.status(404).json({ message: 'ไม่พบ Supplier' });
  const sheetRow = idx + 2;

  // PUT /api/suppliers/[id]  { supplier_name, contact, active }
  if (req.method === 'PUT') {
    const { supplier_name, contact, active } = req.body;
    await updateRow('Suppliers', sheetRow, [
      id,
      supplier_name?.trim() ?? rows[idx].supplier_name,
      contact ?? rows[idx].contact,
      active !== undefined ? String(active).toUpperCase() : rows[idx].active,
    ]);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
