const SPREADSHEET_ID = '1bN8oCtp39H1HFBhvUmjAdp_hVDP-dYJRWRa0HT5gmho';
const GOOGLE_CLIENT_ID = '280761518317-gdvrt4provk183vi87j6uoapmu5umn30.apps.googleusercontent.com';

const TABLES = {
  trips: {
    sheet: '豆遊_旅行',
    headers: ['旅行ID', '名稱', '目的地', '開始日期', '結束日期', '主要幣別', '封面圖片', '邀請碼雜湊', '建立時間', '更新時間', '版本'],
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
      const memberId = 'google:' + user.sub;
      const tripIds = readObjects_(TABLES.members)
        .filter(row => String(row['成員ID']) === memberId)
        .map(row => String(row['旅行ID']));
      return json_({ ok: true, data: tripIds.map(tripId => readTrip_(tripId)) });
    }
    throw new Error('不支援的 action');
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'createTrip') {
      if (body.idToken) {
        const user = verifyGoogleToken_(body.idToken);
        body.member = body.member || {};
        body.member['成員ID'] = 'google:' + user.sub;
        body.member['顯示名稱'] = body.member['顯示名稱'] || user.name || user.email;
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
        member['成員ID'] = 'google:' + user.sub;
        member['顯示名稱'] = member['顯示名稱'] || user.name || user.email;
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
  const next = Object.assign({}, member, {
    '旅行ID': tripId,
    '成員ID': memberId,
    '顯示名稱': member['顯示名稱'] || '旅伴',
    '角色': member['角色'] || 'member',
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
      const memberId = 'google:' + user.sub;
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
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(table.sheet);
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
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(table.sheet);
  const rows = objects.map(object => table.headers.map(header => object[header] == null ? '' : object[header]));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, table.headers.length).setValues(rows);
}

function replaceObjects_(table, objects) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(table.sheet);
  const existing = Math.max(sheet.getLastRow() - 1, 0);
  if (existing) sheet.getRange(2, 1, existing, table.headers.length).clearContent();
  appendObjects_(table, objects);
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
