import { setupSheets } from '@/lib/sheets';

// GET /api/setup  — รันครั้งแรกเพื่อสร้าง sheet + headers
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  // Simple secret guard so only admin can call this
  if (req.query.secret !== process.env.JWT_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const result = await setupSheets();
  res.json(result);
}
