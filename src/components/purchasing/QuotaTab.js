import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_TH = { Monday:'จันทร์', Tuesday:'อังคาร', Wednesday:'พุธ', Thursday:'พฤหัส', Friday:'ศุกร์', Saturday:'เสาร์', Sunday:'อาทิตย์' };

export default function QuotaTab({ showToast }) {
  const [quotas, setQuotas] = useState([]);
  const [editing, setEditing] = useState(null); // day_of_week
  const [form, setForm] = useState({ morning: '', afternoon: '' });
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { setQuotas(await api.getAllQuota()); }
    catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(q) {
    setEditing(q.day_of_week);
    setForm({ morning: q.quota_morning, afternoon: q.quota_afternoon });
  }

  async function save() {
    setLoading(true);
    try {
      await api.updateQuota({ day_of_week: editing, quota_morning: Number(form.morning), quota_afternoon: Number(form.afternoon) });
      showToast('บันทึกโควต้าแล้ว');
      setEditing(null);
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  const sorted = [...quotas].sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week));

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="font-semibold text-gray-700 mb-4">กำหนดโควต้าประจำวัน</h2>
      {loading ? <p className="text-center text-gray-400 py-6">กำลังโหลด...</p> : (
        <div className="space-y-2">
          {sorted.map(q => (
            <div key={q.day_of_week} className="border rounded-xl p-4">
              {editing === q.day_of_week ? (
                <div className="space-y-3">
                  <p className="font-medium text-gray-700">วัน{DAY_TH[q.day_of_week]}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">เช้า (ชิ้น)</label>
                      <input type="number" min="0" value={form.morning}
                        onChange={e => setForm(f => ({ ...f, morning: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">บ่าย (ชิ้น)</label>
                      <input type="number" min="0" value={form.afternoon}
                        onChange={e => setForm(f => ({ ...f, afternoon: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={save} disabled={loading}
                      className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg">บันทึก</button>
                    <button onClick={() => setEditing(null)} className="px-4 border rounded-lg text-sm text-gray-600">ยกเลิก</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-700">วัน{DAY_TH[q.day_of_week]}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      เช้า <span className="font-medium text-gray-700">{Number(q.quota_morning).toLocaleString()}</span> ·
                      บ่าย <span className="font-medium text-gray-700">{Number(q.quota_afternoon).toLocaleString()}</span>
                    </p>
                  </div>
                  <button onClick={() => startEdit(q)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">แก้ไข</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
