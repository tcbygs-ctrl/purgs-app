# คู่มือ Deploy บน Vercel

## โครงสร้างโปรเจกต์ (Next.js)

```
purgs app/
├── src/
│   ├── lib/
│   │   ├── sheets.js       — Google Sheets API client
│   │   ├── auth.js         — JWT sign/verify
│   │   ├── quota.js        — คำนวณโควต้าคงเหลือ
│   │   └── api.js          — Client-side fetch helper
│   ├── pages/
│   │   ├── index.js        — redirect ตาม role
│   │   ├── login.js        — PIN login
│   │   ├── purchasing.js   — หน้าจัดซื้อ
│   │   ├── warehouse.js    — หน้าคลังสินค้า
│   │   └── api/            — API routes (serverless)
│   │       ├── auth/login.js
│   │       ├── quota.js
│   │       ├── suppliers/index.js, [id].js
│   │       ├── bookings/index.js, [id].js
│   │       ├── warehouse/dashboard.js, checkin.js
│   │       ├── reports/index.js
│   │       └── setup.js
│   └── components/         — React components ทุกแท็บ
├── package.json
└── .env.local.example
```

---

## ขั้นตอนที่ 1 — สร้าง Google Service Account

1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. สร้าง Project ใหม่ (หรือใช้ที่มีอยู่)
3. เปิดใช้ **Google Sheets API**:
   - APIs & Services → Library → ค้นหา "Google Sheets API" → Enable
4. สร้าง Service Account:
   - APIs & Services → Credentials → Create Credentials → Service Account
   - ตั้งชื่อ เช่น `purgs-sheets-sa`
   - ข้ามขั้นตอน Grant access / Done
5. คลิก Service Account ที่สร้าง → Keys → Add Key → JSON → ดาวน์โหลด

---

## ขั้นตอนที่ 2 — สร้าง Google Spreadsheet

1. สร้าง Spreadsheet ใหม่ใน Google Sheets
2. คัดลอก **Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
3. แชร์ Spreadsheet ให้ Service Account:
   - Share → วางอีเมล Service Account (จากไฟล์ JSON ที่ดาวน์โหลด) → Editor → Send

---

## ขั้นตอนที่ 3 — Deploy บน Vercel

### วิธีที่ 1: ผ่าน GitHub (แนะนำ)

1. Push โค้ดขึ้น GitHub repository
2. ไปที่ [vercel.com](https://vercel.com) → Import Project → เลือก repo
3. ตั้งค่า Environment Variables ใน Vercel Dashboard:

   | Key | Value |
   |-----|-------|
   | `SPREADSHEET_ID` | ID จาก URL Spreadsheet |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` จากไฟล์ JSON |
   | `GOOGLE_PRIVATE_KEY` | `private_key` จากไฟล์ JSON (ทั้ง string รวม `\n`) |
   | `JWT_SECRET` | random string ยาวๆ เช่น `openssl rand -base64 32` |

4. Deploy!

### วิธีที่ 2: Vercel CLI

```bash
npm install -g vercel
vercel login
cd "purgs app"
npm install
vercel
# ทำตามขั้นตอน แล้วตั้งค่า env vars ใน dashboard
```

---

## ขั้นตอนที่ 4 — Setup ครั้งแรก (สร้าง Sheets)

หลัง Deploy แล้ว เปิด URL นี้ **ครั้งเดียว**:

```
https://your-app.vercel.app/api/setup?secret=YOUR_JWT_SECRET
```

ระบบจะสร้าง 5 sheets อัตโนมัติ:
- Users, Quota, Suppliers, Bookings, Warehouse_Check

---

## ขั้นตอนที่ 5 — เพิ่มผู้ใช้งาน

เปิด Google Spreadsheet → Sheet "Users" → เพิ่มแถว:

| user_id | username | pin  | role       | active |
|---------|----------|------|------------|--------|
| U001    | สมชาย    | 1234 | purchasing | TRUE   |
| U002    | สมหญิง   | 5678 | warehouse  | TRUE   |

> PIN ต้องเป็นตัวเลข 4 หลัก, `active` ต้องเป็น `TRUE` (ตัวพิมพ์ใหญ่)

---

## Development Local

```bash
cd "purgs app"
npm install

# สร้างไฟล์ .env.local จาก .env.local.example
cp .env.local.example .env.local
# แก้ไขค่าใน .env.local

npm run dev
# เปิด http://localhost:3000
```

---

## สถานะ Booking

| Status | ความหมาย |
|--------|----------|
| `pending` | รอตรวจรับ |
| `received` | ตรวจรับแล้ว ยอดตรง |
| `received_diff` | ตรวจรับแล้ว ยอดไม่ตรง |
| `cancelled` | ยกเลิก |
