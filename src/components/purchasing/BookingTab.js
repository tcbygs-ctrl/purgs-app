import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const STATUS_LABEL = { pending: 'รอตรวจรับ', received: 'ตรวจรับแล้ว', received_diff: 'ยอดไม่ตรง' };
const STATUS_COLOR = { pending: 'bg-yellow-100 text-yellow-700', received: 'bg-green-100 text-green-700', received_diff: 'bg-orange-100 text-orange-700' };

export default function BookingTab({ user, showToast }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [suppliers, setSuppliers] = useState([]);
  const [quota, setQuota] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState({ supplier_id: '', qty: '', period: 'morning' });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sups, q, bks] = await Promise.all([
        api.getSuppliers(true),
        api.getQuota(date),
        api.getBookings(date),
      ]);
      setSuppliers(sups);
      setQuota(q);
      setBookings(bks);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const remaining = quota
    ? { morning: quota.remaining_morning, afternoon: quota.remaining_afternoon }
    : { morning: 0, afternoon: 0 };

  async function submit() {
    if (!form.supplier_id || !form.qty || Number(form.qty) <= 0) {
      showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return;
    }
    const rem = form.period === 'morning' ? remaining.morning : remaining.afternoon;
    if (Number(form.qty) > rem) {
      showToast(`โควต้าคงเหลือ ${rem} ไม่เพียงพอ`, 'error'); return;
    }
    setLoading(true);
    try {
      await api.createBooking({ date, ...form, qty: Number(form.qty) });
      showToast('จองคิวสำเร็จ!');
      setForm(f => ({ ...f, supplier_id: '', qty: '' }));
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function cancel(id) {
    if (!confirm('ยืนยันยกเลิก?')) return;
    try {
      await api.cancelBooking(id);
      showToast('ยกเลิกแล้ว');
      await load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');

  return (
    <div className="space-y-4">
      {/* Quota Bar */}
      {quota && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-3">โควต้าประจำวัน — {quota.day}</h2>
          <div className="grid grid-cols-2 gap-4">
            {[{ key: 'morning', label: '☀️ เช้า' }, { key: 'afternoon', label: '🌤️ บ่าย' }].map(p => {
              const rem = remaining[p.key];
              const total = quota[`quota_${p.key}`];
              const pct = total > 0 ? Math.max(0, (rem / total) * 100) : 0;
              const color = rem <= 0 ? 'text-red-600' : rem < 200 ? 'text-yellow-600' : 'text-green-600';
              const barColor = rem <= 0 ? 'bg-red-400' : rem < 200 ? 'bg-yellow-400' : 'bg-green-400';
              return (
                <div key={p.key} className="rounded-xl p-4 bg-gray-50">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm text-gray-500">{p.label}</span>
                    <span className={`text-2xl font-bold ${color}`}>{rem.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1 text-right">จาก {total.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">จองคิวสินค้า</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">วันที่</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">Supplier</label>
            <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
              <option value="">-- เลือก Supplier --</option>
              {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">จำนวน (ชิ้น)</label>
            <input type="number" min="1" placeholder="0"
              value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">ช่วงเวลา</label>
            <div className="flex gap-2">
              {[{ v: 'morning', l: '☀️ เช้า' }, { v: 'afternoon', l: '🌤️ บ่าย' }].map(p => (
                <button key={p.v} onClick={() => setForm(f => ({ ...f, period: p.v }))}
                  className={`flex-1 py-2 rounded-xl border-2 font-medium text-sm transition ${form.period === p.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {p.l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={submit} disabled={loading}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition">
          {loading ? 'กำลังบันทึก...' : 'ยืนยันจองคิว'}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-3">รายการจอง ({date})</h2>
        {loading ? (
          <p className="text-center text-gray-400 py-6">กำลังโหลด...</p>
        ) : activeBookings.length === 0 ? (
          <p className="text-center text-gray-400 py-6">ยังไม่มีรายการ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Supplier</th><th className="pb-2">จำนวน</th>
                <th className="pb-2">ช่วง</th><th className="pb-2">สถานะ</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {activeBookings.map(b => (
                  <tr key={b.booking_id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{b.supplier_name}</td>
                    <td className="py-2">{Number(b.qty).toLocaleString()}</td>
                    <td className="py-2">{b.period === 'morning' ? '☀️' : '🌤️'}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {b.status === 'pending' && b.user_id === user.user_id && (
                        <button onClick={() => cancel(b.booking_id)} className="text-red-400 hover:text-red-600 text-xs">ยกเลิก</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
