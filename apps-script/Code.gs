const SPREADSHEET_ID = '1bN8oCtp39H1HFBhvUmjAdp_hVDP-dYJRWRa0HT5gmho';
const GOOGLE_CLIENT_ID = '280761518317-gdvrt4provk183vi87j6uoapmu5umn30.apps.googleusercontent.com';
const JY_EMAILS = ['allison@taiwanbar.cc', 'past795@gmail.com'];
const JY_MEMBER_ID = 'person:jy';

const TABLES = {
  trips: {
    sheet: '豆遊_旅行',
    headers: ['旅行ID', '名稱', '目的地', '開始日期', '結束日期', '主要幣別', '封面圖片', '邀請碼雜湊', '建立時間', '更新時間', '版本', '封存狀態', '封存時間', '預定刪除時間', '封存信箱'],
    id: '旅行ID',
  },
  members: {
    sheet: '豆遊_成員',
    headers: ['旅行ID', '成員ID', '顯示名稱', '角色', '加入時間', '更新時間'],
    id: '成員ID',
  },
  itinerary: {
    sheet: '豆遊_行程',
    headers: ['旅行ID', '日期ID', '景點ID', '日期', '開始時間', '結束時間', '景點名稱', '地址', '交通方式', '備註', '緯度', '經度', '排序', '更新時間'],
    id: '景點ID',
  },
  flights: {
    sheet: '豆遊_航班',
    headers: ['旅行ID', '航班ID', '航空公司', '航班編號', '出發機場', '抵達機場', '出發時間', '抵達時間', '航廈', '訂位代號', '備註', '更新時間'],
    id: '航班ID',
  },
  accommodations: {
    sheet: '豆遊_住宿',
    headers: ['旅行ID', '住宿ID', '住宿名稱', '入住日期', '退房日期', '入住時間', '退房時間', '地址', '櫃檯資訊', '設施', '訂房編號', '備註', '更新時間'],
    id: '住宿ID',
  },
  shopping: {
    sheet: '豆遊_必買',
    headers: ['旅行ID', '商品ID', '商品名稱', '分類', '價格', '幣別', '圖片網址', '購買地點', '備註', '已購買', '更新時間'],
    id: '商品ID',
  },
  expenses: {
    sheet: '豆遊_記帳',
    headers: ['旅行ID', '支出ID', '項目', '金額', '幣別', '付款人', '分攤成員', '日期', '分類', '備註', '建立時間', '更新時間'],
    id: '支出ID',
  },
};

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'health');
    if (action === 'health') {
      return json_({ ok: true, service: '豆遊同步服務', time: new Date().toISOString() });
    }
    if (action === 'pull') {
      const tripId = required_(e.parameter.tripId, '缺少 tripId');
      verifyAccess_(tripId, e.parameter.inviteCode, e.parameter.idToken);
      return json_({ ok: true, data: readTrip_(tripId) });
    }
    if (action === 'myTrips') {
      const user = verifyGoogleToken_(required_(e.parameter.idToken, '請先登入 Google'));
      const identity = migrateIdentity_(user);
      const memberId = identity.memberId;
      const tripIds = readObjects_(TABLES.members)
        .filter(row => String(row['成員ID']) === memberId)
        .map(row => String(row['旅行ID']));
      return json_({ ok: true, data: tripIds.map(tripId => readTrip_(tripId)).filter(data => String(data.trip['封存狀態'] || '') !== 'archived') });
    }
    if (action === 'myArchivedTrips') {
      const user = verifyGoogleToken_(required_(e.parameter.idToken, '請先登入 Google'));
      const identity = migrateIdentity_(user);
      const memberId = identity.memberId;
      const ownerTripIds = readObjects_(TABLES.members)
        .filter(row => String(row['成員ID']) === memberId && String(row['角色']) === 'owner')
        .map(row => String(row['旅行ID']));
      return json_({ ok: true, data: ownerTripIds.map(findTrip_).filter(trip => trip && String(trip['封存狀態']) === 'archived').map(publicTrip_) });
    }
    throw new Error('不支援的 action');
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(8000)) throw new Error('同步服務忙碌中，請稍後重試');
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'createTrip') {
      if (body.idToken) {
        const user = verifyGoogleToken_(body.idToken);
        const identity = migrateIdentity_(user);
        body.member = body.member || {};
        body.member['成員ID'] = identity.memberId;
        body.member['顯示名稱'] = identity.displayName;
      }
      return json_({ ok: true, data: createTrip_(body) });
    }
    if (body.action === 'syncTrip') {
      const tripId = required_(body.tripId, '缺少 tripId');
      verifyAccess_(tripId, body.inviteCode, body.idToken);
      writeTrip_(tripId, body.data || {});
      return json_({ ok: true, data: readTrip_(tripId) });
    }
    if (body.action === 'joinTrip') {
      const tripId = required_(body.tripId, '缺少 tripId');
      verifyTrip_(tripId, required_(body.inviteCode, '缺少 inviteCode'));
      const user = body.idToken ? verifyGoogleToken_(body.idToken) : null;
      const member = body.member || {};
      if (user) {
        const identity = migrateIdentity_(user);
        member['成員ID'] = identity.memberId;
        member['顯示名稱'] = identity.displayName;
      }
      upsertMember_(tripId, member);
      return json_({ ok: true, data: readTrip_(tripId) });
    }
    if (body.action === 'leaveTrip') {
      const tripId = required_(body.tripId, '缺少 tripId');
      verifyTrip_(tripId, required_(body.inviteCode, '缺少 inviteCode'));
      const memberId = required_(body.memberId, '缺少 memberId');
      removeMember_(tripId, memberId);
      return json_({ ok: true, data: { tripId: tripId, memberId: memberId } });
    }
    if (body.action === 'archiveTrip') {
      const tripId = required_(body.tripId, '缺少 tripId');
      const email = required_(body.email, '請輸入收件信箱');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email 格式不正確');
      verifyOwner_(tripId, required_(body.idToken, '請先登入 Google'));
      return json_({ ok: true, data: archiveTrip_(tripId, email) });
    }
    if (body.action === 'restoreArchivedTrip') {
      const tripId = required_(body.tripId, '缺少 tripId');
      verifyOwner_(tripId, required_(body.idToken, '請先登入 Google'));
      restoreArchivedTrip_(tripId);
      return json_({ ok: true, data: readTrip_(tripId) });
    }
    throw new Error('不支援的 action');
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function createTrip_(body) {
  const trip = body.trip || {};
  const tripId = String(trip['旅行ID'] || Utilities.getUuid());
  const inviteCode = String(body.inviteCode || randomCode_()).trim();
  const now = new Date().toISOString();
  const row = {
    '旅行ID': tripId,
    '名稱': trip['名稱'] || '未命名旅行',
    '目的地': trip['目的地'] || '',
    '開始日期': trip['開始日期'] || '',
    '結束日期': trip['結束日期'] || '',
    '主要幣別': trip['主要幣別'] || 'TWD',
    '封面圖片': trip['封面圖片'] || '',
    '邀請碼雜湊': hash_(inviteCode),
    '建立時間': now,
    '更新時間': now,
    '版本': 1,
  };
  if (findTrip_(tripId)) throw new Error('旅行已存在');
  appendObjects_(TABLES.trips, [row]);
  if (body.member) upsertMember_(tripId, body.member);
  return { tripId: tripId, inviteCode: inviteCode, trip: readTrip_(tripId) };
}

function writeTrip_(tripId, data) {
  const tripRows = readObjects_(TABLES.trips);
  const index = tripRows.findIndex(row => String(row['旅行ID']) === tripId);
  if (index < 0) throw new Error('找不到旅行');
  const current = tripRows[index];
  if (String(current['封存狀態']) === 'archived') throw new Error('旅行已封存，請先由建立者復原後再編輯');
  Object.assign(current, data.trip || {});
  current['旅行ID'] = tripId;
  current['邀請碼雜湊'] = tripRows[index]['邀請碼雜湊'];
  current['建立時間'] = tripRows[index]['建立時間'];
  current['更新時間'] = new Date().toISOString();
  current['版本'] = Number(current['版本'] || 0) + 1;
  replaceObjects_(TABLES.trips, tripRows);

  ['members', 'itinerary', 'flights', 'accommodations', 'shopping', 'expenses'].forEach(key => {
    if (!Array.isArray(data[key])) return;
    replaceTripRows_(TABLES[key], tripId, data[key]);
  });
}

function readTrip_(tripId) {
  const trip = findTrip_(tripId);
  if (!trip) throw new Error('找不到旅行');
  const result = { trip: publicTrip_(trip) };
  ['members', 'itinerary', 'flights', 'accommodations', 'shopping', 'expenses'].forEach(key => {
    result[key] = readObjects_(TABLES[key]).filter(row => String(row['旅行ID']) === tripId);
  });
  return result;
}

function upsertMember_(tripId, member) {
  const table = TABLES.members;
  const rows = readObjects_(table);
  const memberId = String(member['成員ID'] || Utilities.getUuid());
  const now = new Date().toISOString();
  const tripHasOwner = rows.some(row =>
    String(row['旅行ID']) === String(tripId) && String(row['角色']) === 'owner'
  );
  const next = Object.assign({}, member, {
    '旅行ID': tripId,
    '成員ID': memberId,
    '顯示名稱': member['顯示名稱'] || '旅伴',
    '角色': tripHasOwner ? (member['角色'] || 'member') : 'owner',
    '加入時間': member['加入時間'] || now,
    '更新時間': now,
  });
  const index = rows.findIndex(row => String(row['旅行ID']) === tripId && String(row['成員ID']) === memberId);
  if (index >= 0 && String(rows[index]['角色']) === 'owner') next['角色'] = 'owner';
  if (index >= 0) rows[index] = next; else rows.push(next);
  replaceObjects_(table, rows);
}

function removeMember_(tripId, memberId) {
  const current = readObjects_(TABLES.members).find(row =>
    String(row['旅行ID']) === String(tripId) && String(row['成員ID']) === String(memberId)
  );
  if (current && String(current['角色']) === 'owner') {
    throw new Error('建立者不能退出旅行；只有建立者可以刪除整趟旅行');
  }
  const rows = readObjects_(TABLES.members).filter(row =>
    !(String(row['旅行ID']) === String(tripId) && String(row['成員ID']) === String(memberId))
  );
  replaceObjects_(TABLES.members, rows);
}

function replaceTripRows_(table, tripId, incoming) {
  const kept = readObjects_(table).filter(row => String(row['旅行ID']) !== tripId);
  const now = new Date().toISOString();
  const rows = incoming.map(row => Object.assign({}, row, { '旅行ID': tripId, '更新時間': now }));
  replaceObjects_(table, kept.concat(rows));
}

function verifyTrip_(tripId, inviteCode) {
  const trip = findTrip_(tripId);
  if (!trip) throw new Error('找不到旅行');
  if (String(trip['邀請碼雜湊']) !== hash_(String(inviteCode).trim())) throw new Error('邀請碼錯誤');
}

function verifyAccess_(tripId, inviteCode, idToken) {
  if (idToken) {
    try {
      const user = verifyGoogleToken_(idToken);
      const memberId = migrateIdentity_(user).memberId;
      const allowed = readObjects_(TABLES.members).some(row =>
        String(row['旅行ID']) === String(tripId) && String(row['成員ID']) === memberId
      );
      if (allowed) return user;
    } catch (_) {
      // An expired Google token must not block a valid trip invite code.
    }
  }
  verifyTrip_(tripId, required_(inviteCode, '邀請碼錯誤'));
  return null;
}

function verifyOwner_(tripId, idToken) {
  const user = verifyGoogleToken_(idToken);
  const memberId = migrateIdentity_(user).memberId;
  const owner = readObjects_(TABLES.members).some(row => String(row['旅行ID']) === String(tripId) && String(row['成員ID']) === memberId && String(row['角色']) === 'owner');
  if (!owner) throw new Error('只有旅行建立者可以打包或復原旅行');
  return user;
}

function identityForUser_(user) {
  const email = String(user.email || '').trim().toLowerCase();
  if (JY_EMAILS.indexOf(email) >= 0) return { memberId: JY_MEMBER_ID, displayName: 'JY' };
  return { memberId: 'google:' + user.sub, displayName: user.name || user.email || 'Google 使用者' };
}

function migrateIdentity_(user) {
  const identity = identityForUser_(user);
  if (identity.memberId !== JY_MEMBER_ID) return identity;
  const rows = readObjects_(TABLES.members);
  const currentGoogleId = 'google:' + user.sub;
  const relevantTripIds = {};
  rows.forEach(row => {
    const memberId = String(row['成員ID'] || '');
    if (memberId === currentGoogleId || memberId === JY_MEMBER_ID) relevantTripIds[String(row['旅行ID'])] = true;
  });
  if (!Object.keys(relevantTripIds).length) return identity;
  const aliasNames = ['jy', 'allison zheng', 'allison', 'alle', 'zheng'];
  const merged = [];
  Object.keys(relevantTripIds).forEach(tripId => {
    const candidates = rows.filter(row => {
      if (String(row['旅行ID']) !== tripId) return false;
      const id = String(row['成員ID'] || '');
      const name = String(row['顯示名稱'] || '').trim().toLowerCase();
      return id === currentGoogleId || id === JY_MEMBER_ID || aliasNames.indexOf(name) >= 0;
    });
    if (!candidates.length) return;
    const owner = candidates.some(row => String(row['角色']) === 'owner');
    const joinedAt = candidates.map(row => String(row['加入時間'] || '')).filter(Boolean).sort()[0] || new Date().toISOString();
    merged.push({ '旅行ID': tripId, '成員ID': JY_MEMBER_ID, '顯示名稱': 'JY', '角色': owner ? 'owner' : 'member', '加入時間': joinedAt, '更新時間': new Date().toISOString() });
  });
  const kept = rows.filter(row => {
    const tripId = String(row['旅行ID']);
    if (!relevantTripIds[tripId]) return true;
    const id = String(row['成員ID'] || '');
    const name = String(row['顯示名稱'] || '').trim().toLowerCase();
    return !(id === currentGoogleId || id === JY_MEMBER_ID || aliasNames.indexOf(name) >= 0);
  });
  replaceObjects_(TABLES.members, kept.concat(merged));
  return identity;
}

function archiveTrip_(tripId, email) {
  const trip = findTrip_(tripId);
  if (!trip) throw new Error('找不到旅行');
  if (String(trip['封存狀態']) === 'archived') throw new Error('這趟旅行已經封存');
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('今日寄信額度已用完，請明天再試');
  const blob = buildTripWorkbook_(tripId);
  MailApp.sendEmail({
    to: email,
    subject: '豆遊旅行封存｜' + String(trip['名稱'] || trip['目的地'] || tripId),
    htmlBody: '<p>你的豆遊旅行已完成打包，Excel 檔案附在本信。</p><p>雲端資料將保留 30 天，期間可在豆遊封存區復原；到期後會永久刪除。</p>',
    attachments: [blob],
    name: '豆遊'
  });
  const archivedAt = new Date();
  const deleteAt = new Date(archivedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const rows = readObjects_(TABLES.trips);
  const index = rows.findIndex(row => String(row['旅行ID']) === String(tripId));
  rows[index]['封存狀態'] = 'archived';
  rows[index]['封存時間'] = archivedAt.toISOString();
  rows[index]['預定刪除時間'] = deleteAt.toISOString();
  rows[index]['封存信箱'] = email;
  rows[index]['更新時間'] = archivedAt.toISOString();
  replaceObjects_(TABLES.trips, rows);
  return { trip: publicTrip_(rows[index]), email: email };
}

function restoreArchivedTrip_(tripId) {
  const rows = readObjects_(TABLES.trips);
  const index = rows.findIndex(row => String(row['旅行ID']) === String(tripId));
  if (index < 0) throw new Error('找不到旅行');
  rows[index]['封存狀態'] = '';
  rows[index]['封存時間'] = '';
  rows[index]['預定刪除時間'] = '';
  rows[index]['封存信箱'] = '';
  rows[index]['更新時間'] = new Date().toISOString();
  replaceObjects_(TABLES.trips, rows);
}

function buildTripWorkbook_(tripId) {
  const trip = findTrip_(tripId);
  const fileName = String(trip['名稱'] || trip['目的地'] || '豆遊旅行').replace(/[\\/:*?"<>|]/g, '_');
  const book = SpreadsheetApp.create('豆遊封存_' + fileName);
  try {
    const summary = book.getSheets()[0];
    summary.setName('旅行總覽');
    const summaryRows = TABLES.trips.headers.filter(header => header !== '邀請碼雜湊').map(header => [header, trip[header] == null ? '' : trip[header]]);
    summary.getRange(1, 1, summaryRows.length, 2).setValues(summaryRows);
    summary.getRange(1, 1, summaryRows.length, 1).setFontWeight('bold').setBackground('#E8EDF6');
    ['members', 'itinerary', 'flights', 'accommodations', 'shopping', 'expenses'].forEach(key => {
      const table = TABLES[key];
      const rows = readObjects_(table).filter(row => String(row['旅行ID']) === String(tripId));
      const sheet = book.insertSheet(table.sheet.replace('豆遊_', ''));
      sheet.getRange(1, 1, 1, table.headers.length).setValues([table.headers]).setFontWeight('bold').setBackground('#E8EDF6');
      if (rows.length) sheet.getRange(2, 1, rows.length, table.headers.length).setValues(rows.map(row => table.headers.map(header => row[header] == null ? '' : row[header])));
      sheet.setFrozenRows(1);
    });
    SpreadsheetApp.flush();
    const response = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + book.getId() + '/export?format=xlsx', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
    return response.getBlob().setName(fileName + '.xlsx');
  } finally {
    DriveApp.getFileById(book.getId()).setTrashed(true);
  }
}

function purgeExpiredArchivedTrips() {
  const now = Date.now();
  const trips = readObjects_(TABLES.trips);
  const expiredIds = trips.filter(row => String(row['封存狀態']) === 'archived' && Date.parse(String(row['預定刪除時間'] || '')) <= now).map(row => String(row['旅行ID']));
  if (!expiredIds.length) return;
  replaceObjects_(TABLES.trips, trips.filter(row => expiredIds.indexOf(String(row['旅行ID'])) < 0));
  ['members', 'itinerary', 'flights', 'accommodations', 'shopping', 'expenses'].forEach(key => replaceObjects_(TABLES[key], readObjects_(TABLES[key]).filter(row => expiredIds.indexOf(String(row['旅行ID'])) < 0)));
}

function setupArchiveCleanupTrigger() {
  ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === 'purgeExpiredArchivedTrips').forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('purgeExpiredArchivedTrips').timeBased().everyDays(1).atHour(3).create();
}

function verifyGoogleToken_(idToken) {
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Google 登入已失效，請重新登入');
  const user = JSON.parse(response.getContentText());
  if (String(user.aud) !== GOOGLE_CLIENT_ID) throw new Error('Google 登入來源不正確');
  if (!user.sub) throw new Error('無法辨識 Google 帳號');
  return user;
}

function findTrip_(tripId) {
  return readObjects_(TABLES.trips).find(row => String(row['旅行ID']) === String(tripId));
}

function publicTrip_(trip) {
  const copy = Object.assign({}, trip);
  delete copy['邀請碼雜湊'];
  return copy;
}

function readObjects_(table) {
  const sheet = ensureTableHeaders_(table);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, table.headers.length).getValues();
  return values.filter(row => row.some(value => value !== '')).map(row => {
    const object = {};
    table.headers.forEach((header, index) => object[header] = row[index]);
    return object;
  });
}

function appendObjects_(table, objects) {
  if (!objects.length) return;
  const sheet = ensureTableHeaders_(table);
  const rows = objects.map(object => table.headers.map(header => object[header] == null ? '' : object[header]));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, table.headers.length).setValues(rows);
}

function replaceObjects_(table, objects) {
  const sheet = ensureTableHeaders_(table);
  const existing = Math.max(sheet.getLastRow() - 1, 0);
  if (existing) sheet.getRange(2, 1, existing, table.headers.length).clearContent();
  appendObjects_(table, objects);
}

function ensureTableHeaders_(table) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(table.sheet);
  if (!sheet) throw new Error('找不到資料表：' + table.sheet);
  if (sheet.getMaxColumns() < table.headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), table.headers.length - sheet.getMaxColumns());
  const current = sheet.getRange(1, 1, 1, table.headers.length).getValues()[0].map(String);
  if (current.join('\n') !== table.headers.join('\n')) sheet.getRange(1, 1, 1, table.headers.length).setValues([table.headers]);
  return sheet;
}

function hash_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
}

function randomCode_() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function required_(value, message) {
  if (value == null || String(value).trim() === '') throw new Error(message);
  return String(value).trim();
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
