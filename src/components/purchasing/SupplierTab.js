import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function SupplierTab({ showToast }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ supplier_name: '', contact: '' });

  async function load() {
    setLoading(true);
    try { setSuppliers(await api.getSuppliers(false)); }
    catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(s) {
    setEditTarget(s);
    setForm({ supplier_name: s.supplier_name, contact: s.contact });
    setShowForm(true);
  }
  function cancelEdit() {
    setEditTarget(null); setForm({ supplier_name: '', contact: '' }); setShowForm(false);
  }

  async function save() {
    if (!form.supplier_name.trim()) { showToast('กรุณากรอกชื่อ Supplier', 'error'); return; }
    setLoading(true);
    try {
      if (editTarget) {
        await api.updateSupplier(editTarget.supplier_id, form);
      } else {
        await api.addSupplier(form);
      }
      showToast('บันทึกสำเร็จ');
      cancelEdit();
      await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function toggleActive(s) {
    try {
      await api.updateSupplier(s.supplier_id, { ...s, active: s.active !== 'TRUE' });
      await load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">จัดการ Supplier</h2>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition">
            + เพิ่ม Supplier
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-600">{editTarget ? 'แก้ไข' : 'เพิ่ม'} Supplier</h3>
            <input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
              placeholder="ชื่อ Supplier *"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
              placeholder="ผู้ติดต่อ / เบอร์โทร"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            <div className="flex gap-2">
              <button onClick={save} disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm py-2 rounded-xl">
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button onClick={cancelEdit} className="px-4 border rounded-xl text-sm text-gray-600 hover:bg-gray-100">ยกเลิก</button>
            </div>
          </div>
        )}

        {loading && !showForm ? (
          <p className="text-center text-gray-400 py-6">กำลังโหลด...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2">ชื่อ Supplier</th><th className="pb-2">ผู้ติดต่อ</th>
                <th className="pb-2">สถานะ</th><th className="pb-2"></th>
              </tr></thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.supplier_id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{s.supplier_name}</td>
                    <td className="py-2 text-gray-500">{s.contact || '-'}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.active === 'TRUE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active === 'TRUE' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => startEdit(s)} className="text-blue-500 hover:text-blue-700 text-xs">แก้ไข</button>
                        <button onClick={() => toggleActive(s)}
                          className={`text-xs ${s.active === 'TRUE' ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}>
                          {s.active === 'TRUE' ? 'ปิด' : 'เปิด'}
                        </button>
                      </div>
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
