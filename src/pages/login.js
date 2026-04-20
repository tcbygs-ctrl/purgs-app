import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { api } from '@/lib/api';

export default function Login() {
  const router = useRouter();
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  async function doLogin(pinArr) {
    const code = pinArr.join('');
    if (code.length < 4) return;
    setLoading(true); setError('');
    try {
      const res = await api.login(code);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push(res.user.role === 'warehouse' ? '/warehouse' : '/purchasing');
    } catch (e) {
      setError(e.message);
      setPin(['', '', '', '']);
      refs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleInput(i, val) {
    const v = val.replace(/\D/, '').slice(0, 1);
    const next = [...pin];
    next[i] = v;
    setPin(next);
    if (v && i < 3) refs[i + 1].current?.focus();
    if (next.every(d => d !== '')) doLogin(next);
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      refs[i - 1].current?.focus();
      const next = [...pin]; next[i - 1] = ''; setPin(next);
    }
  }

  function padPress(n) {
    if (n === '⌫') {
      const idx = [...pin].reverse().findIndex(d => d !== '');
      if (idx >= 0) {
        const pos = 3 - idx;
        const next = [...pin]; next[pos] = ''; setPin(next);
      }
      return;
    }
    const idx = pin.findIndex(d => d === '');
    if (idx < 0) return;
    const next = [...pin]; next[idx] = String(n); setPin(next);
    if (next.every(d => d !== '')) doLogin(next);
  }

  return (
    <>
      <Head><title>เข้าสู่ระบบ — จองคิวสินค้า</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📦</div>
            <h1 className="text-2xl font-bold text-gray-800">ระบบจองคิวสินค้า</h1>
            <p className="text-gray-500 text-sm mt-1">กรอก PIN 4 หลักเพื่อเข้าใช้งาน</p>
          </div>

          {/* PIN boxes */}
          <div className="flex justify-center gap-3 mb-4">
            {pin.map((d, i) => (
              <input key={i} ref={refs[i]} type="password" maxLength={1} inputMode="numeric"
                value={d}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-14 h-16 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none transition ${
                  error ? 'border-red-400 bg-red-50' : d ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

          {/* PIN pad */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
              <button key={i} onClick={() => n !== '' && padPress(n)}
                className={`py-4 rounded-xl text-lg font-semibold transition ${
                  n === '' ? 'invisible' :
                  n === '⌫' ? 'bg-red-50 text-red-500 hover:bg-red-100' :
                  'bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                }`}>
                {n}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center mt-4 text-blue-500 text-sm">กำลังตรวจสอบ...</div>
          )}
        </div>
      </div>
    </>
  );
}
