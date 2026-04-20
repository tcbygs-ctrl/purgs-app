import { useState, useCallback } from 'react';
import {
  Package, ClipboardList, Store, Settings, BarChart3,
  LayoutDashboard, ClipboardCheck, Warehouse, ShoppingCart,
} from 'lucide-react';
import Toast from './Toast';
import ProfileMenu from './ProfileMenu';

export default function Layout({ user, onUserUpdate, children, activeTab, onTabChange, accent = 'blue' }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  const purchasingTabs = [
    { id: 'booking',   label: 'จองคิว',   Icon: ClipboardList },
    { id: 'suppliers', label: 'Supplier', Icon: Store },
    { id: 'quota',     label: 'โควต้า',   Icon: Settings },
    { id: 'report',    label: 'รายงาน',   Icon: BarChart3 },
  ];
  const warehouseTabs = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'checkin',   label: 'ตรวจรับ',   Icon: ClipboardCheck },
    { id: 'report',    label: 'รายงาน',    Icon: BarChart3 },
  ];
  const tabs = user?.role === 'warehouse' ? warehouseTabs : purchasingTabs;
  const accentActive = accent === 'orange' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white';
  const RoleIcon = user?.role === 'warehouse' ? Warehouse : ShoppingCart;

  const activeAccent = accent === 'orange' ? 'text-orange-600' : 'text-blue-600';

  return (
    <div className="bg-gray-100 min-h-screen">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top bar */}
      <nav className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={22} className="text-gray-700" />
            <span className="font-bold text-gray-800 hidden sm:block">ระบบจองคิวสินค้า</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${user?.role === 'warehouse' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
              <RoleIcon size={13} />
              {user?.role === 'warehouse' ? 'คลังสินค้า' : 'จัดซื้อ'}
            </span>
          </div>
          <ProfileMenu user={user} onUserUpdate={onUserUpdate} showToast={showToast} />
        </div>
        {/* Desktop tabs */}
        <div className="max-w-5xl mx-auto px-4 hidden sm:flex gap-1 pb-2 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.Icon;
            return (
              <button key={t.id} onClick={() => onTabChange(t.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap inline-flex items-center gap-1.5 ${activeTab === t.id ? accentActive : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4 pb-24 sm:pb-4">
        {typeof children === 'function' ? children(showToast) : children}
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-stretch">
          {tabs.map(t => {
            const Icon = t.Icon;
            const isActive = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => onTabChange(t.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition ${isActive ? activeAccent : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon size={20} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
