import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function ReportTab({ showToast }) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const [type, setType] = useState('daily');
  const [params, setParams] = useState({
    date: today,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    supplier_id: '',
    from: today,
    to: today,
  });
  const [suppliers, setSuppliers] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getSuppliers(false).then(setSuppliers).catch(() => {});
  }, []);

  async function generate() {
    setLoading(true); setReport(null);
    try {
      const q = { type };
      if (type === 'daily')    { q.date = params.date; }
      if (type === 'monthly')  { q.year = params.year; q.month = params.month; }
      if (type === 'supplier') { q.supplier_id = params.supplier_id; q.from = params.from; q.to = params.to; }
      const res = await api.getReport(q);
      setReport(res);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  const title = type === 'daily' ? `รายงานวันที่ ${params.date}` :
    type === 'monthly' ? `รายงานเดือน ${params.month}/${params.year}` :
    `รายงาน Supplier`;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">รายงาน</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-500 block mb-1">ประเภท</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="daily">รายวัน</option>
              <option value="monthly">รายเดือน</option>
              <option value="supplier">ตาม Supplier</option>
            </select>
          </div>

          {type === 'daily' && (
            <div>
              <label className="text-sm text-gray-500 block mb-1">วันที่</label>
              <input type="date" value={params.date} onChange={e => setParams(p => ({ ...p, date: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          )}

          {type === 'monthly' && (
            <>
              <div>
                <label className="text-sm text-gray-500 block mb-1">ปี</label>
                <input type="number" value={params.year} onChange={e => setParams(p => ({ ...p, year: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">เดือน</label>
                <select value={params.month} onChange={e => setParams(p => ({ ...p, month: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm">
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === 'supplier' && (
            <>
              <div>
                <label className="text-sm text-gray-500 block mb-1">Supplier</label>
                <select value={params.supplier_id} onChange={e => setParams(p => ({ ...p, supplier_id: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm">
                  <option value="">-- เลือก --</option>
                  {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">ตั้งแต่</label>
                <input type="date" value={params.from} onChange={e => setParams(p => ({ ...p, from: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">ถึง</label>
                <input type="date" value={params.to} onChange={e => setParams(p => ({ ...p, to: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={generate} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm transition">
            {loading ? 'กำลังโหลด...' : '📊 ดูรายงาน'}
          </button>
          {report && (
            <button onClick={() => window.print()}
              className="border hover:bg-gray-50 text-gray-600 px-5 py-2 rounded-xl text-sm transition">
              🖨️ พิมพ์ / PDF
            </button>
          )}
        </div>
      </div>

      {/* Result */}
      {report && (
        <div id="report-output" className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">{title}</h3>
            <span className="text-sm text-gray-400">{report.from} → {report.to}</span>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'ยอดจองรวม', value: (report.total_booked || 0).toLocaleString(), bg: 'bg-blue-50', c: 'text-blue-600' },
              { label: 'ยอดรับจริง', value: (report.total_actual || 0).toLocaleString(), bg: 'bg-green-50', c: 'text-green-600' },
              { label: 'ส่วนต่างรวม', value: ((report.total_diff || 0) > 0 ? '+' : '') + (report.total_diff || 0).toLocaleString(), bg: (report.total_diff || 0) === 0 ? 'bg-gray-50' : 'bg-red-50', c: (report.total_diff || 0) === 0 ? 'text-gray-600' : 'text-red-600' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <div className={`text-xl font-bold ${s.c}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-2">วันที่</th><th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">ช่วง</th><th className="px-3 py-2 text-right">จอง</th>
                  <th className="px-3 py-2 text-right">รับจริง</th><th className="px-3 py-2 text-right">ส่วนต่าง</th>
                  <th className="px-3 py-2">Remark</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2 font-medium">{r.supplier_name}</td>
                    <td className="px-3 py-2">{r.period === 'morning' ? '☀️' : r.period === 'afternoon' ? '🌤️' : '-'}</td>
                    <td className="px-3 py-2 text-right">{r.booked_qty.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.actual_qty !== null ? r.actual_qty.toLocaleString() : '-'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${r.diff === null ? '' : r.diff === 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {r.diff === null ? '-' : `${r.diff > 0 ? '+' : ''}${r.diff.toLocaleString()}`}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{r.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
