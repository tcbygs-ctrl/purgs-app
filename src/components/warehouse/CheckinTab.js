import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export default function CheckinTab({ user, showToast }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard(date);
      setItems(data);
      const init = {};
      data.filter(b => b.status === 'pending').forEach(b => {
        init[b.booking_id] = { actual_qty: '', remark: '', diff: null };
      });
      setForms(init);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  function calcDiff(id, booked) {
    setForms(f => {
      const qty = f[id]?.actual_qty;
      const diff = qty !== '' && qty !== undefined ? Number(qty) - Number(booked) : null;
      return { ...f, [id]: { ...f[id], diff } };
    });
  }

  async function submit(b) {
    const f = forms[b.booking_id];
    if (!f || f.actual_qty === '') { showToast('กรุณากรอกจำนวนที่รับจริง', 'error'); return; }
    if (f.diff !== 0 && !f.remark?.trim()) { showToast('กรุณาระบุ Remark เมื่อยอดไม่ตรง', 'error'); return; }
    setSavingId(b.booking_id);
    try {
      const res = await api.checkIn({ booking_id: b.booking_id, actual_qty: Number(f.actual_qty), remark: f.remark });
      showToast(res.diff === 0 ? 'ตรวจรับสำเร็จ ✓' : `ตรวจรับแล้ว ส่วนต่าง ${res.diff > 0 ? '+' : ''}${res.diff}`,
                res.diff === 0 ? 'success' : 'info');
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSavingId(null); }
  }

  const pending = items.filter(b => b.status === 'pending');
  const checked = items.filter(b => b.status !== 'pending');

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">วันที่</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <button onClick={load} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm">โหลด</button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">กำลังโหลด...</div>
      ) : pending.length === 0 && checked.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">ไม่มีรายการวันนี้</div>
      ) : null}

      {/* Pending cards */}
      {pending.map(b => {
        const f = forms[b.booking_id] || { actual_qty: '', remark: '', diff: null };
        return (
          <div key={b.booking_id} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-800">{b.supplier_name}</p>
                <p className="text-sm text-gray-500">{b.period === 'morning' ? '☀️ เช้า' : '🌤️ บ่าย'} · จอง {Number(b.qty).toLocaleString()} ชิ้น</p>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">รอตรวจรับ</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-sm text-gray-600 block mb-1">จำนวนที่รับจริง *</label>
                <input type="number" min="0" placeholder={`จอง ${b.qty} ชิ้น`}
                  value={f.actual_qty}
                  onChange={e => {
                    const v = e.target.value;
                    setForms(prev => ({ ...prev, [b.booking_id]: { ...prev[b.booking_id], actual_qty: v, diff: v !== '' ? Number(v) - Number(b.qty) : null } }));
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
              </div>
              {f.diff !== null && (
                <p className={`text-sm font-medium ${f.diff === 0 ? 'text-green-600' : 'text-red-500'}`}>
                  ส่วนต่าง: {f.diff > 0 ? '+' : ''}{f.diff} {f.diff === 0 ? '✓ ยอดตรง' : '⚠️ ยอดไม่ตรง'}
                </p>
              )}
              {f.diff !== null && f.diff !== 0 && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Remark <span className="text-red-500">*</span></label>
                  <textarea rows={2} placeholder="ระบุสาเหตุ..."
                    value={f.remark}
                    onChange={e => setForms(prev => ({ ...prev, [b.booking_id]: { ...prev[b.booking_id], remark: e.target.value } }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none" />
                </div>
              )}
              <button onClick={() => submit(b)} disabled={savingId === b.booking_id}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                {savingId === b.booking_id ? 'กำลังบันทึก...' : 'ยืนยันการตรวจรับ'}
              </button>
            </div>
          </div>
        );
      })}

      {/* Checked summary */}
      {checked.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-600 mb-3">ตรวจรับแล้ว ({checked.length} รายการ)</h3>
          <div className="space-y-2">
            {checked.map(b => (
              <div key={b.booking_id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{b.supplier_name}</p>
                  <p className="text-xs text-gray-400">
                    {b.period === 'morning' ? 'เช้า' : 'บ่าย'} · จอง {b.qty} / รับ {b.warehouse?.actual_qty ?? '-'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {b.status === 'received' ? '✓ ตรง' : '⚠️ ไม่ตรง'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
