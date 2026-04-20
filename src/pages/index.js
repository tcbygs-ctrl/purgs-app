import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const { role } = JSON.parse(user);
      router.replace(role === 'warehouse' ? '/warehouse' : '/purchasing');
    } else {
      router.replace('/login');
    }
  }, []);
  return null;
}
