// Client-side API helper
function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

async function req(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'เกิดข้อผิดพลาด');
  }
  return res.json();
}

export const api = {
  login:          (pin)                     => req('POST', '/api/auth/login', { pin }),
  getQuota:       (date)                    => req('GET',  `/api/quota?date=${date}`),
  getAllQuota:     ()                        => req('GET',  '/api/quota'),
  updateQuota:    (data)                    => req('PUT',  '/api/quota', data),
  getSuppliers:   (active)                  => req('GET',  `/api/suppliers${active ? '?active=true' : ''}`),
  addSupplier:    (data)                    => req('POST', '/api/suppliers', data),
  updateSupplier: (id, data)                => req('PUT',  `/api/suppliers/${id}`, data),
  getBookings:    (date)                    => req('GET',  `/api/bookings?date=${date}`),
  getBookingsRange: (from, to)              => req('GET',  `/api/bookings?from=${from}&to=${to}`),
  createBooking:  (data)                    => req('POST', '/api/bookings', data),
  cancelBooking:  (id)                      => req('DELETE',`/api/bookings/${id}`),
  getDashboard:   (date)                    => req('GET',  `/api/warehouse/dashboard?date=${date}`),
  checkIn:        (data)                    => req('POST', '/api/warehouse/checkin', data),
  getReport:      (params)                  => req('GET',  `/api/reports?${new URLSearchParams(params)}`),
};
