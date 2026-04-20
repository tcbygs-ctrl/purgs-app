import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { api } from '@/lib/api';

const DAYS = ['วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์','วันอาทิตย์'];

export default function QuotaTab({ showToast }) {
  const [quotas, setQuotas] = useState([]);
  const [editing, setEditing] = useState(null); // Date (Thai day name)
  const [form, setForm] = useState({ daily_quota_full: '' });
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getAllQuota();
      setQuotas(Array.isArray(data) ? data : []);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(q) {
    setEditing(q.Date);
    setForm({ daily_quota_full: Number(q.daily_quota_full) || 0 });
  }

  async function save(day) {
    const qty = Number(form.daily_quota_full);
    if (!Number.isFinite(qty) || qty < 0) { showToast('กรอกตัวเลขไม่ติดลบ', 'error'); return; }
    setLoading(true);
    try {
      await api.updateQuota({ Date: day, daily_quota_full: qty });
      showToast('บันทึกโควต้าแล้ว');
      setEditing(null);
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  const byDay = Object.fromEntries(quotas.map(q => [q.Date, q]));
  const sorted = DAYS.map(d => byDay[d] || { Date: d, daily_quota_full: 0 });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-700">กำหนดโควต้าประจำวัน</h2>
        <p className="text-xs text-gray-500 mt-0.5">จำนวนรวมต่อวัน (ทั้งเช้าและบ่ายหักจากก้อนเดียวกัน)</p>
      </div>
      {loading && quotas.length === 0 ? (
        <p className="text-center text-gray-400 py-6">กำลังโหลด...</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(q => (
            <div key={q.Date} className="border rounded-xl p-4">
              {editing === q.Date ? (
                <div className="space-y-3">
                  <p className="font-medium text-gray-700">{q.Date}</p>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">โควต้ารวมทั้งวัน (ชิ้น)</label>
                    <input type="number" min="0" autoFocus value={form.daily_quota_full}
                      onChange={e => setForm({ daily_quota_full: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => save(q.Date)} disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg">บันทึก</button>
                    <button onClick={() => setEditing(null)} className="px-4 border rounded-lg text-sm text-gray-600">ยกเลิก</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-700">{q.Date}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      รวม <span className="font-semibold text-gray-800">{(Number(q.daily_quota_full) || 0).toLocaleString()}</span> ชิ้น
                    </p>
                  </div>
                  <button onClick={() => startEdit(q)} className="text-blue-500 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1">
                    <Pencil size={14} /> แก้ไข
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
