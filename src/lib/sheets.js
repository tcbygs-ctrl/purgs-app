import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// ============================================================
//  Google Sheets client
// ============================================================
function loadCredentials() {
  // 1) ถ้ามีไฟล์ JSON ใน secrets/ ให้ใช้ไฟล์นั้นก่อน
  const jsonPath = path.join(process.cwd(), 'secrets', 'service-account.json');
  if (fs.existsSync(jsonPath)) {
    const key = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (key.type !== 'service_account') {
      throw new Error(
        'secrets/service-account.json ไม่ใช่ Service Account key (ต้องมี "type": "service_account")'
      );
    }
    return { client_email: key.client_email, private_key: key.private_key };
  }
  // 2) Fallback: ใช้ env vars (เหมาะกับ deploy บน Vercel)
  return {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: loadCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function getSheets() {
  const auth = await getAuth().getClient();
  return google.sheets({ version: 'v4', auth });
}

const SID = () => process.env.SPREADSHEET_ID;

// ============================================================
//  Generic helpers
// ============================================================
export async function readSheet(sheetName) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SID(),
    range: sheetName,
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

export async function appendRow(sheetName, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SID(),
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function updateCell(sheetName, row, col, value) {
  // row and col are 1-based
  const sheets = await getSheets();
  const colLetter = String.fromCharCode(64 + col);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SID(),
    range: `${sheetName}!${colLetter}${row}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
}

export async function updateRow(sheetName, row, values) {
  const sheets = await getSheets();
  const endCol = String.fromCharCode(64 + values.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SID(),
    range: `${sheetName}!A${row}:${endCol}${row}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

// ============================================================
//  Setup — run once to create sheets + headers
// ============================================================
export async function setupSheets() {
  const sheets = await getSheets();
  const ss = await sheets.spreadsheets.get({ spreadsheetId: SID() });
  const existingNames = ss.data.sheets.map(s => s.properties.title);

  const configs = [
    { name: 'Users',          headers: ['user_id','username','pin','role','active'] },
    { name: 'Quota',          headers: ['ID','daily_quota_full','Date'] },
    { name: 'Suppliers',      headers: ['supplier_id','supplier_name','contact','active'] },
    { name: 'Bookings',       headers: ['booking_id','date','supplier_id','supplier_name','qty','period','user_id','username','status','created_at','remark'] },
    { name: 'Warehouse_Check',headers: ['wh_id','booking_id','date','supplier_name','booked_qty','actual_qty','diff','remark','wh_user','checked_at'] },
  ];

  // Add missing sheets
  const addSheetRequests = configs
    .filter(c => !existingNames.includes(c.name))
    .map(c => ({ addSheet: { properties: { title: c.name } } }));

  if (addSheetRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SID(),
      requestBody: { requests: addSheetRequests },
    });
  }

  // Write headers
  for (const cfg of configs) {
    const existing = await readSheet(cfg.name);
    if (existing.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SID(),
        range: `${cfg.name}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [cfg.headers] },
      });
    }
  }

  // Seed default quota (full-day total per day, Thai day names)
  const quota = await readSheet('Quota');
  if (quota.length === 0) {
    const days = [
      ['q-mon', 1000, 'วันจันทร์'],
      ['q-tue', 1000, 'วันอังคาร'],
      ['q-wed', 1000, 'วันพุธ'],
      ['q-thu', 1000, 'วันพฤหัสบดี'],
      ['q-fri', 1000, 'วันศุกร์'],
      ['q-sat',  500, 'วันเสาร์'],
      ['q-sun',    0, 'วันอาทิตย์'],
    ];
    for (const d of days) await appendRow('Quota', d);
  }

  return { ok: true };
}
