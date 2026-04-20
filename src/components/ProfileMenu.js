import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { User, Pencil, KeyRound, LogOut, ChevronDown, X } from 'lucide-react';
import { api } from '@/lib/api';

export default function ProfileMenu({ user, onUserUpdate, showToast }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'profile' | 'pin' | null
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center font-semibold text-sm">
          {(user?.username || '?').charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-gray-700 hidden sm:block">{user?.username}</span>
        <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-1 z-40">
          <div className="px-3 py-2 border-b">
            <p className="text-sm font-medium text-gray-800">{user?.username}</p>
            <p className="text-xs text-gray-500">{user?.role === 'warehouse' ? 'คลังสินค้า' : 'จัดซื้อ'}</p>
          </div>
          <MenuItem Icon={Pencil}   label="แก้ไขชื่อผู้ใช้" onClick={() => { setOpen(false); setModal('profile'); }} />
          <MenuItem Icon={KeyRound} label="เปลี่ยน PIN"       onClick={() => { setOpen(false); setModal('pin'); }} />
          <div className="border-t mt-1 pt-1">
            <MenuItem Icon={LogOut} label="ออกจากระบบ" onClick={logout} danger />
          </div>
        </div>
      )}

      {modal === 'profile' && (
        <ProfileModal user={user} onClose={() => setModal(null)} onSaved={onUserUpdate} showToast={showToast} />
      )}
      {modal === 'pin' && (
        <PinModal onClose={() => setModal(null)} showToast={showToast} />
      )}
    </div>
  );
}

function MenuItem({ Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition ${danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
      <Icon size={15} />
      {label}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ProfileModal({ user, onClose, onSaved, showToast }) {
  const [username, setUsername] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!username.trim()) { showToast?.('กรุณากรอกชื่อ', 'error'); return; }
    if (username.trim() === user?.username) { onClose(); return; }
    setSaving(true);
    try {
      const res = await api.updateMe({ username: username.trim() });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onSaved?.(res.user);
      showToast?.('บันทึกชื่อใหม่แล้ว');
      onClose();
    } catch (e) { showToast?.(e.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="แก้ไขข้อมูลผู้ใช้" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">รหัสผู้ใช้</label>
          <input value={user?.user_id || ''} disabled
            className="w-full border rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">ชื่อที่แสดง</label>
          <input autoFocus value={username} onChange={e => setUsername(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">บทบาท</label>
          <input value={user?.role === 'warehouse' ? 'คลังสินค้า' : 'จัดซื้อ'} disabled
            className="w-full border rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-500" />
        </div>
        <button onClick={save} disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl mt-2 transition">
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </Modal>
  );
}

function PinModal({ onClose, showToast }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!/^\d{4}$/.test(currentPin)) { showToast?.('PIN ปัจจุบันต้องเป็นตัวเลข 4 หลัก', 'error'); return; }
    if (!/^\d{4}$/.test(newPin))     { showToast?.('PIN ใหม่ต้องเป็นตัวเลข 4 หลัก', 'error'); return; }
    if (newPin !== confirmPin)       { showToast?.('PIN ใหม่และยืนยัน PIN ไม่ตรงกัน', 'error'); return; }
    if (newPin === currentPin)       { showToast?.('PIN ใหม่ต้องไม่ตรงกับ PIN เดิม', 'error'); return; }
    setSaving(true);
    try {
      await api.changePin(currentPin, newPin);
      showToast?.('เปลี่ยน PIN สำเร็จ');
      onClose();
    } catch (e) { showToast?.(e.message, 'error'); }
    finally { setSaving(false); }
  }

  const pinInput = (val, set, placeholder, autoFocus) => (
    <input type="password" inputMode="numeric" maxLength={4} autoFocus={autoFocus}
      placeholder={placeholder} value={val}
      onChange={e => set(e.target.value.replace(/\D/g, '').slice(0, 4))}
      className="w-full border rounded-xl px-3 py-2 text-sm tracking-widest text-center focus:outline-none focus:border-blue-500" />
  );

  return (
    <Modal title="เปลี่ยน PIN" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">PIN ปัจจุบัน</label>
          {pinInput(currentPin, setCurrentPin, '••••', true)}
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">PIN ใหม่</label>
          {pinInput(newPin, setNewPin, '••••')}
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">ยืนยัน PIN ใหม่</label>
          {pinInput(confirmPin, setConfirmPin, '••••')}
        </div>
        <button onClick={save} disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl mt-2 transition">
          {saving ? 'กำลังบันทึก...' : 'เปลี่ยน PIN'}
        </button>
      </div>
    </Modal>
  );
}
