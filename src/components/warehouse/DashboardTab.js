import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const STATUS_COLOR = { pending: 'bg-yellow-100 text-yellow-700', received: 'bg-green-100 text-green-700', received_diff: 'bg-orange-100 text-orange-700' };
const STATUS_LABEL = { pending: 'รอตรวจรับ', received: 'ตรวจรับแล้ว', received_diff: 'ยอดไม่ตรง' };

export default function DashboardTab({ showToast }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.getDashboard(date));
      setLastUpdate(new Date().toLocaleTimeString('th-TH'));
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const morning = items.filter(b => b.period === 'morning');
  const afternoon = items.filter(b => b.period === 'afternoon');

  const stats = [
    { label: 'รายการทั้งหมด', value: items.length, color: 'text-blue-600' },
    { label: 'ตรวจรับแล้ว', value: items.filter(b => b.status !== 'pending').length, color: 'text-green-600' },
    { label: 'รอตรวจรับ', value: items.filter(b => b.status === 'pending').length, color: 'text-yellow-600' },
    { label: 'ยอดจอง (ชิ้น)', value: items.reduce((s, b) => s + (Number(b.qty) || 0), 0).toLocaleString(), color: 'text-gray-700' },
  ];

  function PeriodTable({ list, title }) {
    if (!list.length) return null;
    return (
      <div className="mb-4">
        <h3 className="font-semibold text-gray-600 mb-2 px-1">{title}</h3>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">จอง</th>
                <th className="px-4 py-3 text-right">รับจริง</th>
                <th className="px-4 py-3 text-right">ส่วนต่าง</th>
                <th className="px-4 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {list.map(b => {
                const diff = b.warehouse ? Number(b.warehouse.diff) : null;
                return (
                  <tr key={b.booking_id} className="border-t">
                    <td className="px-4 py-3 font-medium">{b.supplier_name}</td>
                    <td className="px-4 py-3 text-right">{Number(b.qty).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{b.warehouse ? Number(b.warehouse.actual_qty).toLocaleString() : '-'}</td>
                    <td className={`px-4 py-3 text-right font-medium ${diff === null ? '' : diff === 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status] || 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">วันที่</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
        </div>
        <button onClick={load} disabled={loading}
          className="mt-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm">
          {loading ? '...' : '🔄 รีเฟรช'}
        </button>
        <span className="ml-auto text-xs text-gray-400">อัปเดต: {lastUpdate}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">กำลังโหลด...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">ไม่มีรายการวันนี้</div>
      ) : (
        <>
          <PeriodTable list={morning} title="☀️ เช้า" />
          <PeriodTable list={afternoon} title="🌤️ บ่าย" />
        </>
      )}
    </div>
  );
}
