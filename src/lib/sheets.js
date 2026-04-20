import { google } from 'googleapis';

// ============================================================
//  Google Sheets client
// ============================================================
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
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
    { name: 'Quota',          headers: ['day_of_week','quota_morning','quota_afternoon'] },
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

  // Seed default quota
  const quota = await readSheet('Quota');
  if (quota.length === 0) {
    const days = [
      ['Monday',500,500],['Tuesday',500,500],['Wednesday',500,500],
      ['Thursday',500,500],['Friday',500,500],['Saturday',300,200],
    ];
    for (const d of days) await appendRow('Quota', d);
  }

  return { ok: true };
}
