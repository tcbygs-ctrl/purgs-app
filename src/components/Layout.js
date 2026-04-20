import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Toast from './Toast';

export default function Layout({ user, children, activeTab, onTabChange, accent = 'blue' }) {
  const router = useRouter();
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  const purchasingTabs = [
    { id: 'booking',   label: '📋 จองคิว' },
    { id: 'suppliers', label: '🏪 Supplier' },
    { id: 'quota',     label: '⚙️ โควต้า' },
    { id: 'report',    label: '📊 รายงาน' },
  ];
  const warehouseTabs = [
    { id: 'dashboard', label: '🖥️ Dashboard' },
    { id: 'checkin',   label: '✅ ตรวจรับ' },
    { id: 'report',    label: '📊 รายงาน' },
  ];
  const tabs = user?.role === 'warehouse' ? warehouseTabs : purchasingTabs;
  const accentActive = accent === 'orange' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white';

  return (
    <div className="bg-gray-100 min-h-screen">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <span className="font-bold text-gray-800 hidden sm:block">ระบบจองคิวสินค้า</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${user?.role === 'warehouse' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
              {user?.role === 'warehouse' ? '🏭 คลังสินค้า' : '🛒 จัดซื้อ'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:block">{user?.username}</span>
            <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">ออก</button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 pb-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => onTabChange(t.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${activeTab === t.id ? accentActive : 'text-gray-600 hover:bg-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4">
        {/* Pass showToast to children via cloneElement */}
        {typeof children === 'function' ? children(showToast) : children}
      </div>
    </div>
  );
}
