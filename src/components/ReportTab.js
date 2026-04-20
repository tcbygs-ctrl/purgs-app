import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Printer, Sun, CloudSun, LayoutDashboard, ClipboardList, Package, ClipboardCheck, Store, TrendingUp } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import Select from 'react-select';
import { th } from 'date-fns/locale/th';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

const multiSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
    boxShadow: 'none',
    minHeight: '38px',
    fontSize: '0.875rem',
    '&:hover': { borderColor: state.isFocused ? '#3b82f6' : '#d1d5db' },
  }),
  menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 20, fontSize: '0.875rem' }),
  multiValue: (base) => ({ ...base, backgroundColor: '#eff6ff', borderRadius: '0.5rem' }),
  multiValueLabel: (base) => ({ ...base, color: '#1d4ed8', fontSize: '0.8125rem' }),
};

registerLocale('th', th);

const toISO = (d) => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fromISO = (s) => (s ? new Date(`${s}T00:00:00`) : null);

export default function ReportTab({ showToast }) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [filter, setFilter] = useState({
    from: firstOfMonth,
    to: today,
    supplier_ids: [],
  });
  const [suppliers, setSuppliers] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [dashPeriod, setDashPeriod] = useState('daily');
  const [dashDate, setDashDate] = useState(today);
  const [dashData, setDashData] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  useEffect(() => {
    api.getSuppliers(false).then(setSuppliers).catch(() => {});
  }, []);

  const loadDash = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await api.getReportDashboard(dashPeriod, dashDate);
      setDashData(res);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setDashLoading(false); }
  }, [dashPeriod, dashDate, showToast]);

  useEffect(() => { loadDash(); }, [loadDash]);

  async function generate() {
    if (!filter.from || !filter.to) {
      showToast('กรุณาเลือกช่วงวันที่', 'error'); return;
    }
    if (filter.from > filter.to) {
      showToast('วันที่เริ่มต้นต้องไม่เกินวันสิ้นสุด', 'error'); return;
    }
    setLoading(true); setReport(null);
    try {
      const q = { from: filter.from, to: filter.to };
      if (filter.supplier_ids.length > 0) q.supplier_ids = filter.supplier_ids.join(',');
      const res = await api.getReport(q);
      setReport(res);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  const selectedSupplierNames = filter.supplier_ids
    .map(id => suppliers.find(s => s.supplier_id === id)?.supplier_name)
    .filter(Boolean);
  const title = filter.from === filter.to
    ? `รายงานวันที่ ${formatDate(filter.from)}`
    : `รายงาน ${formatDate(filter.from)} — ${formatDate(filter.to)}`;

  const periodLabel = { daily: 'ประจำวัน', weekly: 'ประจำสัปดาห์', monthly: 'ประจำเดือน' };

  return (
    <div className="space-y-4">
      {/* Dashboard */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-gray-700 inline-flex items-center gap-2">
            <LayoutDashboard size={18} className="text-blue-600" />
            Dashboard สรุปข้อมูล
          </h2>
          <div className="flex items-center gap-2">
            <DatePicker
              selected={fromISO(dashDate)}
              onChange={(d) => setDashDate(toISO(d))}
              dateFormat={dashPeriod === 'monthly' ? 'MM/yyyy' : 'dd/MM/yyyy'}
              showMonthYearPicker={dashPeriod === 'monthly'}
              locale="th"
              className="border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-36"
              popperClassName="z-30"
            />
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button key={p} onClick={() => setDashPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition inline-flex items-center gap-1.5 ${dashPeriod === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {periodLabel[p]}
            </button>
          ))}
        </div>

        {dashData && (
          <div className="text-xs text-gray-400 mb-3">
            ช่วง: {formatDate(dashData.from)} {dashData.from !== dashData.to && `→ ${formatDate(dashData.to)}`}
          </div>
        )}

        {dashLoading ? (
          <p className="text-center text-gray-400 py-6">กำลังโหลด...</p>
        ) : !dashData ? null : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Store size={13} /> Supplier
                </div>
                <div className="text-2xl font-bold text-blue-600">{dashData.summary.supplier_count.toLocaleString()}</div>
                <div className="text-xs text-gray-400">ราย</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <ClipboardList size={13} /> คิวจองทั้งหมด
                </div>
                <div className="text-2xl font-bold text-indigo-600">{dashData.summary.total_bookings.toLocaleString()}</div>
                <div className="text-xs text-gray-400">รายการ · {dashData.summary.total_booked.toLocaleString()} ชิ้น</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <ClipboardCheck size={13} /> ตรวจรับแล้ว
                </div>
                <div className="text-2xl font-bold text-green-600">{dashData.summary.total_received_count.toLocaleString()}</div>
                <div className="text-xs text-gray-400">รายการ · {dashData.summary.total_actual.toLocaleString()} ชิ้น</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Package size={13} /> รอตรวจรับ
                </div>
                <div className="text-2xl font-bold text-amber-600">{dashData.summary.pending_count.toLocaleString()}</div>
                <div className={`text-xs ${dashData.summary.total_diff === 0 ? 'text-gray-400' : 'text-red-500'}`}>
                  ส่วนต่าง {dashData.summary.total_diff > 0 ? '+' : ''}{dashData.summary.total_diff.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Supplier breakdown */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-700 text-sm inline-flex items-center gap-1.5">
                <TrendingUp size={14} className="text-gray-500" /> สรุปตาม Supplier
              </h3>
              <span className="text-xs text-gray-400">{dashData.suppliers.length} ราย</span>
            </div>
            {dashData.suppliers.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">ไม่มีข้อมูลในช่วงที่เลือก</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2 text-right">คิวจอง</th>
                      <th className="px-3 py-2 text-right">ยอดจอง</th>
                      <th className="px-3 py-2 text-right">ตรวจรับ</th>
                      <th className="px-3 py-2 text-right">รับจริง</th>
                      <th className="px-3 py-2 text-right">ส่วนต่าง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashData.suppliers.map(s => (
                      <tr key={s.supplier_id} className="border-t">
                        <td className="px-3 py-2 font-medium text-gray-800">{s.supplier_name}</td>
                        <td className="px-3 py-2 text-right">{s.booking_count.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold text-indigo-600">{s.total_booked.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-green-600 font-medium">{s.received_count.toLocaleString()}</span>
                          <span className="text-gray-400"> / {s.booking_count.toLocaleString()}</span>
                        </td>
                        <td className="px-3 py-2 text-right">{s.total_actual.toLocaleString()}</td>
                        <td className={`px-3 py-2 text-right font-medium ${s.received_count === 0 ? 'text-gray-400' : s.diff === 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {s.received_count === 0 ? '-' : `${s.diff > 0 ? '+' : ''}${s.diff.toLocaleString()}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">รายงาน</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-500 block mb-1">วันที่เริ่มต้น</label>
            <DatePicker
              selected={fromISO(filter.from)}
              onChange={(d) => setFilter(f => ({ ...f, from: toISO(d) }))}
              dateFormat="dd/MM/yyyy"
              locale="th"
              wrapperClassName="w-full"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              popperClassName="z-30"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">วันที่สิ้นสุด</label>
            <DatePicker
              selected={fromISO(filter.to)}
              onChange={(d) => setFilter(f => ({ ...f, to: toISO(d) }))}
              dateFormat="dd/MM/yyyy"
              locale="th"
              minDate={fromISO(filter.from)}
              wrapperClassName="w-full"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              popperClassName="z-30"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-500 block mb-1">
              Supplier <span className="text-gray-400">(เลือกได้หลายราย — เว้นว่าง = ทั้งหมด)</span>
            </label>
            <Select
              instanceId="report-supplier-multi"
              isMulti
              isClearable
              isSearchable
              closeMenuOnSelect={false}
              value={filter.supplier_ids
                .map(id => {
                  const s = suppliers.find(x => x.supplier_id === id);
                  return s ? { value: s.supplier_id, label: s.supplier_name } : null;
                })
                .filter(Boolean)}
              onChange={(opts) => setFilter(f => ({ ...f, supplier_ids: (opts || []).map(o => o.value) }))}
              options={suppliers.map(s => ({ value: s.supplier_id, label: s.supplier_name }))}
              placeholder="-- ทั้งหมด --"
              noOptionsMessage={() => 'ไม่พบ Supplier'}
              styles={multiSelectStyles}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={generate} disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm transition inline-flex items-center gap-1.5">
            <BarChart3 size={16} />
            {loading ? 'กำลังโหลด...' : 'ดูรายงาน'}
          </button>
          {report && (
            <button onClick={() => window.print()}
              className="border hover:bg-gray-50 text-gray-600 px-5 py-2 rounded-xl text-sm transition inline-flex items-center gap-1.5">
              <Printer size={16} />
              พิมพ์ / PDF
            </button>
          )}
        </div>
      </div>

      {/* Result */}
      {report && (
        <div id="report-output" className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-gray-700">{title}</h3>
              {selectedSupplierNames.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedSupplierNames.map(n => (
                    <span key={n} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{n}</span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-400 shrink-0">{formatDate(report.from)} → {formatDate(report.to)}</span>
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
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-3 py-2 font-medium">{r.supplier_name}</td>
                    <td className="px-3 py-2">
                      {r.period === 'morning' ? <Sun size={16} className="text-amber-500" />
                        : r.period === 'afternoon' ? <CloudSun size={16} className="text-sky-500" />
                        : '-'}
                    </td>
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
