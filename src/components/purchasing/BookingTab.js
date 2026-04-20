import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sun, CloudSun, Store, ChevronRight, StickyNote, Eye, X, User as UserIcon, Calendar, Clock, Hash } from 'lucide-react';
import Select from 'react-select';
import DatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale/th';
import { addMonths } from 'date-fns';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';

registerLocale('th', th);

const toISO = (d) => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fromISO = (s) => (s ? new Date(`${s}T00:00:00`) : null);

const DAY_TH = ['วันอาทิตย์','วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์'];
const thaiDayFromISO = (s) => {
  if (!s) return '';
  const d = new Date(`${s}T00:00:00`);
  return DAY_TH[d.getDay()];
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? '#3b82f6' : '#e5e7eb',
    boxShadow: 'none',
    minHeight: '42px',
    '&:hover': { borderColor: state.isFocused ? '#3b82f6' : '#d1d5db' },
  }),
  menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 20 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#1f2937',
    fontSize: '0.875rem',
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
  singleValue: (base) => ({ ...base, fontSize: '0.875rem' }),
  input: (base) => ({ ...base, fontSize: '0.875rem' }),
};

const STATUS_LABEL = { pending: 'รอตรวจรับ', received: 'ตรวจรับแล้ว', received_diff: 'ยอดไม่ตรง' };
const STATUS_COLOR = { pending: 'bg-yellow-100 text-yellow-700', received: 'bg-green-100 text-green-700', received_diff: 'bg-orange-100 text-orange-700' };

export default function BookingTab({ user, showToast }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [suppliers, setSuppliers] = useState([]);
  const [quota, setQuota] = useState(null);
  const [allQuota, setAllQuota] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [form, setForm] = useState({ supplier_id: '', qty: '', period: 'morning', remark: '' });
  const [loading, setLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState(() => new Set([today]));
  const [viewBooking, setViewBooking] = useState(null);

  const { rangeFrom, rangeTo } = useMemo(() => ({
    rangeFrom: toISO(addMonths(new Date(), -1)),
    rangeTo:   toISO(addMonths(new Date(),  1)),
  }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sups, q, all, qAll] = await Promise.all([
        api.getSuppliers(true),
        api.getQuota(date),
        api.getBookingsRange(rangeFrom, rangeTo),
        api.getAllQuota(),
      ]);
      setSuppliers(sups);
      setQuota(q);
      setAllBookings(all);
      setAllQuota(qAll);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [date, rangeFrom, rangeTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setExpandedDates(prev => prev.has(date) ? prev : new Set([...prev, date]));
  }, [date]);

  const quotaByDay = useMemo(() => {
    const map = {};
    (allQuota || []).forEach(q => { map[q.Date] = Number(q.daily_quota_full) || 0; });
    return map;
  }, [allQuota]);

  const groups = useMemo(() => {
    const map = new Map();
    allBookings
      .filter(b => b.status !== 'cancelled')
      .forEach(b => {
        if (!map.has(b.date)) map.set(b.date, []);
        map.get(b.date).push(b);
      });
    return Array.from(map.entries())
      .map(([d, items]) => {
        const totalQty  = items.reduce((s, b) => s + Number(b.qty), 0);
        const dayQuota  = quotaByDay[thaiDayFromISO(d)] || 0;
        return {
          date: d,
          items,
          totalQty,
          quotaTotal: dayQuota,
          remaining:  dayQuota - totalQty,
          morning:    items.filter(b => b.period === 'morning').reduce((s, b) => s + Number(b.qty), 0),
          afternoon:  items.filter(b => b.period === 'afternoon').reduce((s, b) => s + Number(b.qty), 0),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allBookings, quotaByDay]);

  const toggleDate = (d) => setExpandedDates(prev => {
    const next = new Set(prev);
    next.has(d) ? next.delete(d) : next.add(d);
    return next;
  });

  const remaining_total = Number(quota?.remaining_total) || 0;
  const quota_total     = Number(quota?.quota_total)     || 0;
  const used_morning    = Number(quota?.used_morning)    || 0;
  const used_afternoon  = Number(quota?.used_afternoon)  || 0;

  async function submit() {
    if (!form.supplier_id || !form.qty || Number(form.qty) <= 0) {
      showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return;
    }
    setLoading(true);
    try {
      await api.createBooking({ date, ...form, qty: Number(form.qty) });
      const willOverflow = Number(form.qty) > remaining_total;
      showToast(willOverflow ? 'จองคิวสำเร็จ (เกินโควต้า)' : 'จองคิวสำเร็จ!', willOverflow ? 'error' : 'success');
      setForm(f => ({ ...f, supplier_id: '', qty: '', remark: '' }));
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

  return (
    <div className="space-y-4">
      {/* Subtitle */}
      <div>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-800">จองคิวสินค้า</h1>
            <p className="text-xs text-gray-500">จัดการการจองคิวและดูโควต้าประจำวัน</p>
          </div>
        </div>
        <div className="border-b border-gray-200" />
      </div>

      {/* Quota Bar — รวมทั้งวัน */}
      {quota && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">โควต้าประจำวัน — {quota.day}</h2>
            <span className="text-xs text-gray-400">จาก {quota_total.toLocaleString()} ชิ้น</span>
          </div>
          {(() => {
            const pct = quota_total > 0 ? Math.max(0, (remaining_total / quota_total) * 100) : 0;
            const color    = remaining_total <= 0 ? 'text-red-600'    : remaining_total < quota_total * 0.2 ? 'text-yellow-600' : 'text-green-600';
            const barColor = remaining_total <= 0 ? 'bg-red-400'      : remaining_total < quota_total * 0.2 ? 'bg-yellow-400'   : 'bg-green-400';
            return (
              <>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm text-gray-500">คงเหลือ</span>
                  <span className={`text-3xl font-bold ${color}`}>{remaining_total.toLocaleString()}</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-amber-50 rounded-lg p-2.5 flex items-center gap-2">
                    <Sun size={18} className="text-amber-500" />
                    <div>
                      <div className="text-xs text-gray-500">จองเช้าแล้ว</div>
                      <div className="text-sm font-semibold text-gray-800">{used_morning.toLocaleString()} ชิ้น</div>
                    </div>
                  </div>
                  <div className="bg-sky-50 rounded-lg p-2.5 flex items-center gap-2">
                    <CloudSun size={18} className="text-sky-500" />
                    <div>
                      <div className="text-xs text-gray-500">จองบ่ายแล้ว</div>
                      <div className="text-sm font-semibold text-gray-800">{used_afternoon.toLocaleString()} ชิ้น</div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">จองคิวสินค้า</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">วันที่</label>
            <DatePicker
              selected={fromISO(date)}
              onChange={(d) => setDate(toISO(d))}
              dateFormat="dd/MM/yyyy"
              locale="th"
              minDate={fromISO(rangeFrom)}
              maxDate={fromISO(rangeTo)}
              wrapperClassName="w-full"
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
              popperClassName="z-30"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">Supplier</label>
            <Select
              instanceId="supplier-select"
              value={suppliers.find(s => String(s.supplier_id) === String(form.supplier_id))
                ? { value: form.supplier_id, label: suppliers.find(s => String(s.supplier_id) === String(form.supplier_id)).supplier_name }
                : null}
              onChange={(opt) => setForm(f => ({ ...f, supplier_id: opt ? opt.value : '' }))}
              options={suppliers.map(s => ({ value: s.supplier_id, label: s.supplier_name }))}
              isDisabled={suppliers.length === 0}
              isClearable
              isSearchable
              placeholder={suppliers.length === 0 ? '-- ยังไม่มี Supplier --' : '-- เลือก Supplier --'}
              noOptionsMessage={() => 'ไม่พบ Supplier'}
              styles={selectStyles}
            />
            {suppliers.length === 0 && !loading && (
              <p className="text-xs text-amber-600 mt-1 inline-flex items-center gap-1">
                <Store size={13} /> ยังไม่มีข้อมูล Supplier — เพิ่มได้ที่แท็บ “Supplier”
              </p>
            )}
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
              {[
                { v: 'morning',   l: 'เช้า', Icon: Sun,      iconColor: 'text-amber-500' },
                { v: 'afternoon', l: 'บ่าย', Icon: CloudSun, iconColor: 'text-sky-500' },
              ].map(p => {
                const Icon = p.Icon;
                return (
                  <button key={p.v} onClick={() => setForm(f => ({ ...f, period: p.v }))}
                    className={`flex-1 py-2 rounded-xl border-2 font-medium text-sm transition inline-flex items-center justify-center gap-1.5 ${form.period === p.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <Icon size={16} className={p.iconColor} />
                    {p.l}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-500 mb-1 flex items-center gap-1">
              <StickyNote size={13} className="text-gray-400" /> หมายเหตุ <span className="text-gray-400">(ถ้ามี)</span>
            </label>
            <textarea rows={2} placeholder="รายละเอียดเพิ่มเติม เช่น เลขที่ PO, ผู้ติดต่อ, หมายเหตุพิเศษ"
              value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
        </div>
        <button onClick={submit} disabled={loading}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition">
          {loading ? 'กำลังบันทึก...' : 'ยืนยันจองคิว'}
        </button>
      </div>

      {/* All bookings grouped by date */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold text-gray-700">คิวการจองทั้งหมด</h2>
          <span className="text-xs text-gray-400">{formatDate(rangeFrom)} — {formatDate(rangeTo)}</span>
        </div>
        {loading ? (
          <p className="text-center text-gray-400 py-6">กำลังโหลด...</p>
        ) : groups.length === 0 ? (
          <p className="text-center text-gray-400 py-6">ยังไม่มีรายการในช่วง 1 เดือน</p>
        ) : (
          <div className="space-y-2">
            {groups.map(g => {
              const isOpen = expandedDates.has(g.date);
              const isToday = g.date === today;
              const isSelected = g.date === date;
              const remColor = g.remaining < 0 ? 'text-red-600' : g.remaining < g.quotaTotal * 0.2 ? 'text-yellow-600' : 'text-green-600';
              return (
                <div key={g.date} className={`border rounded-xl overflow-hidden ${isSelected ? 'border-blue-400' : 'border-gray-200'}`}>
                  <button onClick={() => toggleDate(g.date)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight size={16} className={`text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
                      <span className="font-medium text-gray-700">{formatDate(g.date)}</span>
                      {isToday && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">วันนี้</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                      <span className="inline-flex items-center gap-1"><Sun size={13} className="text-amber-500" />{g.morning.toLocaleString()}</span>
                      <span className="inline-flex items-center gap-1"><CloudSun size={13} className="text-sky-500" />{g.afternoon.toLocaleString()}</span>
                      <span className="font-semibold text-gray-700">{g.totalQty.toLocaleString()} ชิ้น</span>
                      <span className={`font-semibold ${remColor} hidden sm:inline`}>
                        คงเหลือ {g.remaining.toLocaleString()}
                      </span>
                      <span className="text-gray-400 hidden sm:inline">· {g.items.length} รายการ</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="overflow-x-auto bg-white">
                      <div className={`px-4 py-2 text-xs sm:hidden flex justify-between ${remColor}`}>
                        <span>โควต้า {g.quotaTotal.toLocaleString()}</span>
                        <span className="font-semibold">คงเหลือ {g.remaining.toLocaleString()}</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-gray-500 border-b">
                          <th className="py-2 px-4">Supplier</th><th className="py-2">จำนวน</th>
                          <th className="py-2">ช่วง</th><th className="py-2">สถานะ</th><th className="py-2 pr-4 text-right"></th>
                        </tr></thead>
                        <tbody>
                          {g.items.map(b => (
                            <tr key={b.booking_id} className="border-b last:border-0">
                              <td className="py-2 px-4 font-medium">{b.supplier_name}</td>
                              <td className="py-2">{Number(b.qty).toLocaleString()}</td>
                              <td className="py-2">
                                {b.period === 'morning'
                                  ? <Sun size={16} className="text-amber-500" />
                                  : <CloudSun size={16} className="text-sky-500" />}
                              </td>
                              <td className="py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[b.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {STATUS_LABEL[b.status] || b.status}
                                </span>
                              </td>
                              <td className="py-2 pr-4">
                                <div className="flex items-center justify-end gap-3">
                                  <button onClick={() => setViewBooking(b)} className="text-blue-500 hover:text-blue-700 text-xs inline-flex items-center gap-1">
                                    <Eye size={14} /> ดู
                                  </button>
                                  {b.status === 'pending' && b.user_id === user.user_id && (
                                    <button onClick={() => cancel(b.booking_id)} className="text-red-400 hover:text-red-600 text-xs">ยกเลิก</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {viewBooking && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setViewBooking(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">รายละเอียดการจอง</h3>
                <p className="text-xs text-gray-400 font-mono">{viewBooking.booking_id}</p>
              </div>
              <button onClick={() => setViewBooking(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-gray-500 inline-flex items-center gap-1.5"><Store size={14} /> Supplier</span>
                <span className="font-medium text-gray-800">{viewBooking.supplier_name}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-gray-500 inline-flex items-center gap-1.5"><Hash size={14} /> จำนวน</span>
                <span className="font-semibold text-gray-800">{Number(viewBooking.qty).toLocaleString()} ชิ้น</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-gray-500 inline-flex items-center gap-1.5">
                  {viewBooking.period === 'morning'
                    ? <><Sun size={14} className="text-amber-500" /> ช่วงเวลา</>
                    : <><CloudSun size={14} className="text-sky-500" /> ช่วงเวลา</>}
                </span>
                <span className="font-medium text-gray-800">{viewBooking.period === 'morning' ? 'เช้า' : 'บ่าย'}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-gray-500 inline-flex items-center gap-1.5"><Calendar size={14} /> วันที่จองคิว</span>
                <span className="font-medium text-gray-800">{formatDate(viewBooking.date)}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-gray-500">สถานะ</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[viewBooking.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[viewBooking.status] || viewBooking.status}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-gray-500 inline-flex items-center gap-1.5"><UserIcon size={14} /> ผู้จอง</span>
                <span className="font-medium text-gray-800">{viewBooking.username}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-gray-500 inline-flex items-center gap-1.5"><Clock size={14} /> วันเวลาที่จอง</span>
                <span className="font-medium text-gray-800">{viewBooking.created_at ? formatDateTime(viewBooking.created_at) : '-'}</span>
              </div>
              <div>
                <div className="text-gray-500 mb-1 inline-flex items-center gap-1.5"><StickyNote size={14} /> หมายเหตุ</div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-700 min-h-[2.5rem] whitespace-pre-wrap">
                  {viewBooking.remark || <span className="text-gray-400">— ไม่มีหมายเหตุ —</span>}
                </div>
              </div>
            </div>
            <button onClick={() => setViewBooking(null)}
              className="mt-5 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl transition">
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
