import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import BookingTab from '@/components/purchasing/BookingTab';
import SupplierTab from '@/components/purchasing/SupplierTab';
import QuotaTab from '@/components/purchasing/QuotaTab';
import ReportTab from '@/components/ReportTab';

export default function Purchasing() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('booking');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/login'); return; }
    const parsed = JSON.parse(u);
    if (parsed.role !== 'purchasing') { router.replace('/warehouse'); return; }
    setUser(parsed);
  }, []);

  if (!user) return null;

  return (
    <>
      <Head><title>จัดซื้อ — ระบบจองคิวสินค้า</title></Head>
      <Layout user={user} activeTab={tab} onTabChange={setTab} accent="blue">
        {showToast => (
          <>
            {tab === 'booking'   && <BookingTab   user={user} showToast={showToast} />}
            {tab === 'suppliers' && <SupplierTab  user={user} showToast={showToast} />}
            {tab === 'quota'     && <QuotaTab     user={user} showToast={showToast} />}
            {tab === 'report'    && <ReportTab    user={user} showToast={showToast} />}
          </>
        )}
      </Layout>
    </>
  );
}
