/**
 * KAMERA MAJLIS — backend Google Apps Script
 * ------------------------------------------
 * 1. Buat folder dalam Google Drive, salin ID folder dari URL:
 *    https://drive.google.com/drive/folders/<<INI ID FOLDER>>
 * 2. Tampal di bawah, kemudian Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 3. Salin URL web app (berakhir /exec) ke config.js -> APPS_SCRIPT_URL
 */
const FOLDER_ID = 'TAMPAL_ID_FOLDER_DI_SINI';
const MAX_BYTES = 8 * 1024 * 1024;   // had saiz satu gambar
const TZ = 'Asia/Kuala_Lumpur';

/* ---------------- GET: senarai & muat turun ---------------- */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.action === 'image') return json_(image_(p.id));
    return json_(list_());
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------------- POST: muat naik & padam ---------------- */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'upload') return json_(upload_(body));
    if (body.action === 'delete') return json_(delete_(body));
    return json_({ ok: false, error: 'Tindakan tidak dikenali' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function upload_(b) {
  const m = String(b.image || '').match(/^data:image\/jpeg;base64,(.+)$/);
  if (!m) throw new Error('Format gambar tidak sah');
  if (!b.token || String(b.token).length < 16) throw new Error('Token tidak sah');
  const bytes = Utilities.base64Decode(m[1]);
  if (bytes.length > MAX_BYTES) throw new Error('Gambar terlalu besar');

  const name = String(b.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
  const now = new Date();
  const safe = (name || 'Tetamu').replace(/[\\/:*?"<>|#%]/g, '').slice(0, 30);
  const fileName = Utilities.formatDate(now, TZ, 'yyyy-MM-dd_HH-mm-ss') + '_' + safe + '.jpg';

  const file = folder_().createFile(Utilities.newBlob(bytes, 'image/jpeg', fileName));
  // Token padam disimpan sebagai hash sahaja — hanya telefon yang memuat naik tahu token asal.
  file.setDescription(JSON.stringify({ n: name, h: hash_(b.token), t: now.getTime() }));
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // supaya album boleh papar gambar
  } catch (err) {
    console.warn('setSharing gagal: ' + err);
  }
  CacheService.getScriptCache().remove('list');
  return { ok: true, id: file.getId() };
}

function delete_(b) {
  const f = ownFile_(b.id);
  const meta = meta_(f);
  if (!meta.h || !b.token || meta.h !== hash_(b.token)) throw new Error('Anda hanya boleh padam gambar sendiri');
  f.setTrashed(true);  // masuk Tong Sampah Drive — pengantin masih boleh pulihkan
  CacheService.getScriptCache().remove('list');
  return { ok: true };
}

function list_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('list');
  if (hit) return JSON.parse(hit);

  const out = [];
  const it = folder_().getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.isTrashed() || !/^image\//.test(f.getMimeType())) continue;
    const meta = meta_(f);
    out.push({ id: f.getId(), name: meta.n || '', t: meta.t || f.getDateCreated().getTime() });
  }
  out.sort(function (a, b) { return b.t - a.t; });
  const res = { ok: true, photos: out };
  try { cache.put('list', JSON.stringify(res), 15); } catch (err) { /* terlalu besar untuk cache — abaikan */ }
  return res;
}

function image_(id) {
  const f = ownFile_(id);
  return { ok: true, data: Utilities.base64Encode(f.getBlob().getBytes()) };
}

/* ---------------- pembantu ---------------- */
function folder_() { return DriveApp.getFolderById(FOLDER_ID); }

// Pastikan fail memang dalam folder majlis (elak akses fail lain dalam Drive anda)
function ownFile_(id) {
  if (!id) throw new Error('ID tiada');
  const f = DriveApp.getFileById(String(id));
  const parents = f.getParents();
  while (parents.hasNext()) if (parents.next().getId() === FOLDER_ID) return f;
  throw new Error('Fail bukan milik album ini');
}

function meta_(f) {
  try { return JSON.parse(f.getDescription() || '{}'); } catch (err) { return {}; }
}

function hash_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8));
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* Jalankan sekali dari editor (pilih "setup" > Run) untuk beri kebenaran Drive & semak folder. */
function setup() {
  const f = folder_();
  console.log('Folder OK: ' + f.getName() + ' — ' + f.getUrl());
}
