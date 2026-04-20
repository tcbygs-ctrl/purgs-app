import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import DashboardTab from '@/components/warehouse/DashboardTab';
import CheckinTab from '@/components/warehouse/CheckinTab';
import ReportTab from '@/components/ReportTab';

export default function Warehouse() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/login'); return; }
    const parsed = JSON.parse(u);
    if (parsed.role !== 'warehouse') { router.replace('/purchasing'); return; }
    setUser(parsed);
  }, []);

  if (!user) return null;

  return (
    <>
      <Head><title>คลังสินค้า — ระบบจองคิวสินค้า</title></Head>
      <Layout user={user} activeTab={tab} onTabChange={setTab} accent="orange">
        {showToast => (
          <>
            {tab === 'dashboard' && <DashboardTab user={user} showToast={showToast} />}
            {tab === 'checkin'   && <CheckinTab   user={user} showToast={showToast} />}
            {tab === 'report'    && <ReportTab    user={user} showToast={showToast} />}
          </>
        )}
      </Layout>
    </>
  );
}
