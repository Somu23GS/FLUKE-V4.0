/**
 *  Assembly Heaters → Google Sheet receiver   (Google Apps Script — Web App)   gs-4.0
 *  ------------------------------------------------------------------------
 *  HOW TO USE (details in google-sheet-telugu.html):
 *   1. Open your Google Sheet → Extensions → Apps Script
 *   2. Delete everything in Code.gs, paste THIS file, press Save (💾)
 *   3. Run ▶ "setup" once → Review permissions → Allow   (creates the "Readings" sheet)
 *   4. Deploy → New deployment → ⚙ Web app → Execute as: Me · Who has access: Anyone → Deploy
 *   5. Copy the Web app URL (…/exec) → Heaters app → Setup (admin) → Google Sheet → Test
 *   ★ After ANY change to this file: Deploy → Manage deployments → ✏ → Version: New → Deploy
 *
 *  WHAT IT CREATES (all rows are created automatically):
 *   • "Readings"  – one row per confirmed reading (log). Re-capturing the same point
 *                   UPDATES the same row (no duplicates). Clearing a cell deletes the row.
 *   • "Board dd-mm-yyyy X" – one sheet per date + shift in the Excel layout
 *                   (Heating zones / Phase / LINE-1 … LINE-7 / Remarks), zero → red cell,
 *                   manual (typed) values → italic + cell note. Values are stored without sign (gs-2.1).
 *                   Lead pot phase-imbalance error (from the app) → orange cell + "PHASE IMBALANCE ERROR" remark (gs-2.2).
 *                   gs-2.4: out-of-range = reference ± tolerance (v29, pink cells; Settings tab gets reference_a / tolerance_a).
 *                   gs-3.0: Areas (v3.0). PLP units (Meltpot, Eagle-01, Gravitypot MFX-01, Line-01, Line-02) log with columns S area · T unit_name,
 *                           keys prefixed 'unit|'. Assembly rows/keys/Board tabs are unchanged.
 *                   gs-3.2: PLP MONTH REGISTERS in the paper layout — one tab per unit + month ("Meltpot 09-2026", "Eagle-01 09-2026",
 *                           "Gravitypot MFX-01 09-2026", "Lines 09-2026"): every day of the month pre-printed (Sunday rows grey),
 *                           one row per date + shift with readings, columns = Date · Day · Shift · Time · Operator · point groups
 *                           (Meltpot-1 | Meltpot-2 → Heater-1 R … · H1 … H12 · Line-01 | Line-02 → SP PV Load R/Y/B Cutoff R/Y/B) · Remarks.
 *                           (The gs-3.0 per-line register tabs and the gs-3.1 per-shift tab were replaced by these.)
 *                   gs-4.0: final release paired with app v4.0.0 — same tabs and behaviour as gs-3.2 (version string only).
 *                   gs-2.3 (Phase 2): NA cells (grey, reason in Remarks), out-of-range (yellow), "RESOLVED ✔ note" in Remarks,
 *                   Readings columns P na_reason · Q range · R resolved; actions board / history (live board + history in the app),
 *                   photo (issue photo → Drive folder "Assembly Heaters photos"), mailcfg / mailtest (daily summary e-mail trigger).
 *   • "Settings"  – HIDDEN sheet: app settings snapshot (components, zero threshold …)
 *                   pushed by the admin from the app. Never contains the password.
 *
 *  ADMIN PASSWORD
 *   • The app never sends the password itself — only its SHA-256 hash.
 *   • The current hash is kept in Script Properties (ADMIN_HASH), invisible to sheet viewers.
 *   • Changing the password in the app (Setup → Admin) updates it here automatically —
 *     you do NOT need to edit this file.
 *   • Forgot it?  Run ▶ resetAdminPassword() from this editor → back to the default.
 *
 *  This project corporates Somu & Kiran · Powered by somu.ss74@gmail.com
 */

/* ===== [S1] SETTINGS YOU MAY CHANGE ===== */
var LOG_SHEET  = 'Readings';
var SET_SHEET  = 'Settings';
var LINES      = 7;                                   // number of assembly lines (columns LINE-1 … LINE-7)
var DEFAULT_ADMIN_HASH = '8dc42a1daaf8a4236c40a0e74b8579588ef11407c8f2696914c74eb18a4c22c9'; // hash of the default admin password (same as in assembly.html)
/* ======================================== */

var LOG_HEADER = ['saved_at','date','shift','line','battery_type','component','phase','value','unit','operator','meter','zero','captured_at','key','error','na_reason','range','resolved','area','unit_name'];   // O = PHASE IMBALANCE (gs-2.2) · P Q R = Phase 2 (gs-2.3) · S T = area / unit (gs-3.0)
var GS_VERSION = 'gs-4.0';
var KEY_COL = 14;                          // column N holds the row key (fixed since gs-1.0 — do not move)
var PHOTO_FOLDER = 'Assembly Heaters photos';   // Drive folder for issue photos (created on first upload)

/* ---------- entry points ---------- */
function setup() {                       // run once from the editor to authorize + create the log sheet
  var sh = getLog_();
  try { MailApp.getRemainingDailyQuota(); DriveApp.getRootFolder(); } catch (_) {}   // gs-2.3: asks for Gmail + Drive permission now (daily e-mail, photos)
  SpreadsheetApp.getActiveSpreadsheet().toast('Ready. "' + sh.getName() + '" sheet created. Now Deploy → Web app.', 'Assembly Heaters', 8);
}
function resetAdminPassword() {          // run from the editor if the admin password is forgotten
  PropertiesService.getScriptProperties().deleteProperty('ADMIN_HASH');
  settingsRow_('admin_password', 'reset to default at ' + new Date());
  SpreadsheetApp.getActiveSpreadsheet().toast('Admin password reset to the default.', 'Assembly Heaters', 8);
}

function doGet(e) {                      // used by the app's "Test connection" button
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = getLog_();
  return json_({ ok: true, spreadsheet: ss.getName(), url: ss.getUrl(), readings: Math.max(0, log.getLastRow() - 1), version: GS_VERSION });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(25000); locked = true;
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || 'save';

    if (action === 'ping')        return doGet(e);
    if (action === 'auth')        return json_({ ok: true, auth: isAdmin_(body.hash) });
    if (action === 'setpass') {
      if (!isAdmin_(body.oldHash)) return json_({ ok: true, auth: false, error: 'Current password wrong' });
      if (!body.newHash || String(body.newHash).length < 32) return json_({ ok: false, error: 'Bad new password hash' });
      PropertiesService.getScriptProperties().setProperty('ADMIN_HASH', String(body.newHash));
      settingsRow_('admin_password', 'changed ' + new Date() + (body.by ? ' by ' + body.by : ''));
      return json_({ ok: true, auth: true, changed: true });
    }
    if (action === 'settings') {
      if (!isAdmin_(body.hash)) return json_({ ok: true, auth: false, error: 'Admin password required' });
      saveSettings_(body.settings || {}, body.by);
      return json_({ ok: true, auth: true, saved: true });
    }
    if (action === 'getsettings') {
      if (!isAdmin_(body.hash)) return json_({ ok: true, auth: false, error: 'Admin password required' });
      return json_({ ok: true, auth: true, settings: loadSettings_() });
    }
    /* ---- gs-2.3 Phase 2 actions ---- */
    if (action === 'board')    return json_({ ok: true, items: boardItems_(body.date, body.shift, body.uid), version: GS_VERSION });          // live board: every reading of one date+shift (all phones)
    if (action === 'history')  return json_({ ok: true, items: historyItems_(body.line, body.component, body.phase, body.days, body.uid), version: GS_VERSION });
    if (action === 'photo') {
      if (!body.data) return json_({ ok: false, error: 'No image data' });
      var url = savePhoto_(body.name || 'photo.jpg', body.mime || 'image/jpeg', body.data, body.meta || {});
      return json_({ ok: true, url: url, version: GS_VERSION });
    }
    if (action === 'mailcfg') {
      if (!isAdmin_(body.hash)) return json_({ ok: true, auth: false, mail: true, error: 'Admin password required' });
      var tz = setMailSchedule_(body.to || '', Number(body.hour), body.tz || '');
      return json_({ ok: true, auth: true, mail: true, tz: tz, to: body.to || '', hour: Number(body.hour) });
    }
    if (action === 'mailtest') {
      if (!isAdmin_(body.hash)) return json_({ ok: true, auth: false, mail: true, error: 'Admin password required' });
      sendDailySummary_(body.to || '', true);
      return json_({ ok: true, auth: true, mail: true, sent: true });
    }

    /* action === 'save'  → {items:[...], comps:[[name,'RYB'],...]} */
    var items = body.items || [], comps = body.comps || [];
    var log = getLog_(), keyIdx = loadKeys_(log), saved = 0, deleted = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.battOnly) { if (isAsm_(it)) setBattery_(it, comps); continue; }
      if (it.del) { deleted += delReading_(log, keyIdx, it); }
      else        { saveReading_(log, keyIdx, it); saved++; }
      if (isAsm_(it)) updateBoard_(it, comps); else updateMonthRegister_(it, comps);   // gs-3.2: PLP units → month register tab in the paper layout
    }
    SpreadsheetApp.flush();
    return json_({ ok: true, saved: saved, deleted: deleted, total: Math.max(0, log.getLastRow() - 1), version: GS_VERSION });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (_) {} }
  }
}

/* ---------- admin ---------- */
function isAdmin_(hash) {
  if (!hash) return false;
  var cur = PropertiesService.getScriptProperties().getProperty('ADMIN_HASH') || DEFAULT_ADMIN_HASH;
  return String(hash) === String(cur);
}

/* ---------- Settings (hidden sheet) ---------- */
function getSettingsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SET_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SET_SHEET);
    sh.getRange(1, 1, 1, 3).setValues([['key', 'value', 'updated']]).setFontWeight('bold').setBackground('#ffe600');
    sh.setColumnWidth(1, 160); sh.setColumnWidth(2, 520); sh.setColumnWidth(3, 170);
    try { sh.hideSheet(); } catch (_) {}
  }
  return sh;
}
function settingsRow_(key, value) {
  var sh = getSettingsSheet_(), n = sh.getLastRow(), row = 0;
  if (n > 1) { var keys = sh.getRange(2, 1, n - 1, 1).getValues(); for (var i = 0; i < keys.length; i++) if (String(keys[i][0]) === key) { row = i + 2; break; } }
  if (!row) row = n + 1;
  sh.getRange(row, 1, 1, 3).setValues([[key, value, new Date()]]);
}
function saveSettings_(s, by) {
  var keys = Object.keys(s);
  for (var i = 0; i < keys.length; i++) {
    var v = s[keys[i]];
    settingsRow_(keys[i], (typeof v === 'object') ? JSON.stringify(v) : String(v));
  }
  settingsRow_('updated_by', by || '');
}
function loadSettings_() {
  var sh = getSettingsSheet_(), n = sh.getLastRow(), out = {};
  if (n > 1) {
    var v = sh.getRange(2, 1, n - 1, 2).getValues();
    for (var i = 0; i < v.length; i++) {
      var k = String(v[i][0]); if (!k || k === 'admin_password') continue;
      var val = v[i][1]; try { if (typeof val === 'string' && /^[\[{]/.test(val)) val = JSON.parse(val); } catch (_) {}
      out[k] = val;
    }
  }
  return out;
}

/* ---------- Readings log ---------- */
function getLog_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) sh = ss.insertSheet(LOG_SHEET, 0);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, LOG_HEADER.length).setValues([LOG_HEADER]).setFontWeight('bold').setBackground('#ffe600');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 150); sh.setColumnWidth(13, 150); sh.setColumnWidth(14, 220);
  }
  if (sh.getMaxColumns() >= 15 && !sh.getRange(1, 15).getValue()) sh.getRange(1, 15).setValue('error').setFontWeight('bold').setBackground('#ffe600');   // gs-2.2: add the error header to an existing sheet
  if (sh.getMaxColumns() >= 18 && !sh.getRange(1, 16).getValue()) sh.getRange(1, 16, 1, 3).setValues([['na_reason', 'range', 'resolved']]).setFontWeight('bold').setBackground('#ffe600');   // gs-2.3
  if (sh.getMaxColumns() >= 20 && !sh.getRange(1, 19).getValue()) sh.getRange(1, 19, 1, 2).setValues([['area', 'unit_name']]).setFontWeight('bold').setBackground('#ffe600');   // gs-3.0
  return sh;
}
function loadKeys_(sh) {                 // key → row number (column N)
  var n = sh.getLastRow() - 1, m = {};
  if (n > 0) {
    var keys = sh.getRange(2, KEY_COL, n, 1).getValues();
    for (var i = 0; i < keys.length; i++) if (keys[i][0]) m[String(keys[i][0])] = i + 2;
  }
  return m;
}
function isAsm_(it) { return !it.uid || it.uid === 'asm'; }                                   // gs-3.0: Assembly items have no uid (old app) or uid 'asm'
function rowKey_(it) { return (isAsm_(it) ? '' : it.uid + '|') + [it.date, it.shift, it.line, it.component, it.phase || ''].join('|'); }   // Assembly keys unchanged since gs-1.0
function saveReading_(sh, keyIdx, it) {
  var key = rowKey_(it);
  var row = [new Date(), it.date, it.shift, Number(it.line), it.batt || '', it.component, it.phase, toNum_(it.value), it.unit || '',
             it.operator || '', it.meter || '', it.zero ? 'YES' : '', it.time ? new Date(Number(it.time)) : '', key];
  var r = keyIdx[key];
  if (!r) { r = sh.getLastRow() + 1; keyIdx[key] = r; }
  sh.getRange(r, 1, 1, row.length).setValues([row]);
  if (sh.getMaxColumns() >= 15) sh.getRange(r, 15).setValue(it.error || '');   // error column (gs-2.2); older sheets without column O are left as they are
  if (sh.getMaxColumns() >= 18) sh.getRange(r, 16, 1, 3).setValues([[it.na || '', it.range || '', it.resolved || '']]);   // gs-2.3: P na_reason · Q range · R resolved
  if (sh.getMaxColumns() >= 20) sh.getRange(r, 19, 1, 2).setValues([[it.area || 'Assembly', it.uname || (isAsm_(it) ? 'Assembly' : it.uid)]]);   // gs-3.0: S area · T unit
  sh.getRange(r, 1).setNumberFormat('dd-mm-yyyy hh:mm:ss'); sh.getRange(r, 13).setNumberFormat('dd-mm-yyyy hh:mm:ss');
  var vc = sh.getRange(r, 8);
  if (isNA_(it))       vc.setBackground('#e2e8f0').setFontColor('#334155');
  else if (it.zero)    vc.setBackground('#fecaca').setFontColor('#b91c1c');
  else if (it.error)   vc.setBackground('#ffedd5').setFontColor('#9a3412');
  else if (it.range)   vc.setBackground('#ffe4e6').setFontColor('#b91c1c');
  else                 vc.setBackground(null).setFontColor(null);
  vc.setFontStyle(isManual_(it) ? 'italic' : 'normal');
}
function delReading_(sh, keyIdx, it) {
  var key = rowKey_(it), r = keyIdx[key];
  if (!r) return 0;
  sh.deleteRow(r); delete keyIdx[key];
  for (var k in keyIdx) if (keyIdx[k] > r) keyIdx[k]--;
  return 1;
}
function toNum_(v) { var n = parseFloat(v); return isNaN(n) ? String(v == null ? '' : v) : Math.abs(n); }   // gs-2.1: magnitude only (no minus sign)
function isManual_(it) { return String(it.meter || '').indexOf('MANUAL') === 0; }
function isNA_(it) { return String(it.value) === 'NA' || String(it.meter || '') === 'NA'; }   // gs-2.3: point not measured

/* ---------- Board sheet (Excel layout) ---------- */
function dmy_(iso) { var p = String(iso).split('-'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : String(iso); }
function boardName_(it) { return 'Board ' + dmy_(it.date) + ' ' + (it.shift || ''); }
function lineCol_(line) { return 2 + Number(line); }          // LINE-1 → column C
function remarksCol_() { return 2 + LINES + 1; }              // column J

function getBoard_(it, comps) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), name = boardName_(it);
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name);
  var cols = remarksCol_();
  sh.getRange(1, 1, 1, cols).merge().setValue('Assembly lines Heaters monitoring status').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(2, 1).setValue('Operator:').setFontWeight('bold'); sh.getRange(2, 2).setValue(it.operator || '');
  sh.getRange(2, 4).setValue('Date:').setFontWeight('bold');     sh.getRange(2, 5).setValue(dmy_(it.date));
  sh.getRange(2, 7).setValue('Shift:').setFontWeight('bold');    sh.getRange(2, 8).setValue(it.shift || '');
  sh.getRange(3, 1).setValue('Battery Types:-').setFontWeight('bold');
  var hdr = ['Heating zones', 'Phase'];
  for (var L = 1; L <= LINES; L++) hdr.push('LINE-' + L);
  hdr.push('Remarks');
  sh.getRange(4, 1, 1, cols).setValues([hdr]).setFontWeight('bold').setBackground('#ffe600').setHorizontalAlignment('center');
  var rows = [];
  for (var c = 0; c < comps.length; c++) { var ph = String(comps[c][1] || 'R'); for (var j = 0; j < ph.length; j++) rows.push([comps[c][0], ph.charAt(j)]); }
  if (!rows.length) rows.push([it.component, it.phase]);
  sh.getRange(5, 1, rows.length, 2).setValues(rows);
  var i = 0;
  while (i < rows.length) {                                     // merge component name over its phases
    var j2 = i; while (j2 + 1 < rows.length && rows[j2 + 1][0] === rows[i][0]) j2++;
    if (j2 > i) sh.getRange(5 + i, 1, j2 - i + 1, 1).merge();
    sh.getRange(5 + i, 1).setVerticalAlignment('middle').setFontWeight('bold');
    i = j2 + 1;
  }
  sh.getRange(4, 1, rows.length + 1, cols).setBorder(true, true, true, true, true, true);
  sh.getRange(5, 2, rows.length, 1).setHorizontalAlignment('center').setFontWeight('bold');
  sh.getRange(5, 3, rows.length, LINES).setHorizontalAlignment('center');
  sh.getRange(3, 3, 1, LINES).setHorizontalAlignment('center').setFontWeight('bold');
  sh.setColumnWidth(1, 140); sh.setColumnWidth(2, 60);
  for (var cc = 3; cc < 3 + LINES; cc++) sh.setColumnWidth(cc, 75);
  sh.setColumnWidth(cols, 260);
  sh.setFrozenRows(4);
  return sh;
}
function findBoardRow_(sh, comp, phase) {
  var n = sh.getLastRow(); if (n < 5) return 0;
  var vals = sh.getRange(5, 1, n - 4, 2).getValues(), cur = '';
  for (var i = 0; i < vals.length; i++) {
    if (vals[i][0] !== '' && vals[i][0] != null) cur = String(vals[i][0]);
    if (cur === String(comp) && String(vals[i][1]) === String(phase)) return 5 + i;
  }
  return 0;
}
function setBattery_(it, comps) {
  var sh = getBoard_(it, comps);
  sh.getRange(3, lineCol_(it.line)).setValue(it.batt || '').setHorizontalAlignment('center').setFontWeight('bold');
}
function updateBoard_(it, comps) {
  var sh = getBoard_(it, comps);
  var r = findBoardRow_(sh, it.component, it.phase);
  if (!r) {                                                     // component not in the list → auto-create a row
    r = sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, 2).setValues([[it.component, it.phase]]).setFontWeight('bold');
    sh.getRange(r, 1, 1, remarksCol_()).setBorder(true, true, true, true, true, true);
    sh.getRange(r, 3, 1, LINES).setHorizontalAlignment('center');
  }
  var col = lineCol_(it.line), cell = sh.getRange(r, col);
  if (it.del) { cell.clearContent().clearNote().setBackground(null).setFontColor(null).setFontWeight('normal').setFontStyle('normal'); setRemark_(sh, r, it, false); return; }
  cell.setValue(isNA_(it) ? 'NA' : toNum_(it.value));
  if (isNA_(it))     cell.setBackground('#e2e8f0').setFontColor('#334155').setFontWeight('bold');   // gs-2.3: not measured → grey
  else if (it.zero)  cell.setBackground('#fecaca').setFontColor('#b91c1c').setFontWeight('bold');
  else if (it.error) cell.setBackground('#ffedd5').setFontColor('#9a3412').setFontWeight('bold');   // gs-2.2: Lead pot phase imbalance → orange
  else if (it.range) cell.setBackground('#ffe4e6').setFontColor('#b91c1c').setFontWeight('bold');   // gs-2.4: outside reference ± tolerance → pink (was yellow in gs-2.3)
  else               cell.setBackground(null).setFontColor(null).setFontWeight('normal');
  if (isManual_(it)) cell.setFontStyle('italic').setNote('Manual entry (typed by hand, no meter): ' + it.meter + ' · ' + new Date());
  else               cell.setFontStyle('normal').clearNote();
  if (it.batt) sh.getRange(3, col).setValue(it.batt).setHorizontalAlignment('center').setFontWeight('bold');
  if (it.operator) {
    var cur = String(sh.getRange(2, 2).getValue() || '');
    if (!cur) sh.getRange(2, 2).setValue(it.operator);
    else if (cur.indexOf(it.operator) < 0) sh.getRange(2, 2).setValue(cur + ', ' + it.operator);
  }
  setRemark_(sh, r, it, !!it.zero, it.error || '');
}
function setRemark_(sh, r, it, isZero, error) {               // Remarks: "L1 R = 0 (check heater)" / "L1 B PHASE IMBALANCE ERROR" / "L2 R NA (Line down)" / "L1 R 31.2 ABOVE MAX 28" / "L1 B RESOLVED ✔ Heater replaced"
  var rc = sh.getRange(r, remarksCol_()), tag = 'L' + it.line + ' ' + it.phase;
  var cur = String(rc.getValue() || ''), parts = cur ? cur.split(' · ') : [], out = [];
  for (var i = 0; i < parts.length; i++) if (parts[i].indexOf(tag + ' ') !== 0) out.push(parts[i]);
  if (it.del) { rc.setValue(out.join(' · ')).setFontColor(out.length ? '#b91c1c' : null); return; }
  if (isNA_(it))   out.push(tag + ' NA (' + (it.na || 'not measured') + ')');
  else if (isZero) out.push(tag + ' = 0 (check heater)');
  else if (error)  out.push(tag + ' ' + error + ' ERROR');
  else if (it.range) out.push(tag + ' ' + toNum_(it.value) + ' ' + it.range);
  if (it.resolved) out.push(tag + ' RESOLVED ✔ ' + it.resolved);
  rc.setValue(out.join(' · ')).setFontColor(out.length ? '#b91c1c' : null);
}

/* ---------- gs-2.3 Phase 2: live board + history (read from the Readings log) ---------- */
function logRows_() {                     // every row of the Readings log as objects (cheap enough for a few thousand rows)
  var sh = getLog_(), n = sh.getLastRow() - 1; if (n < 1) return [];
  var w = Math.min(sh.getLastColumn(), LOG_HEADER.length), v = sh.getRange(2, 1, n, w).getValues(), out = [];
  for (var i = 0; i < v.length; i++) {
    var r = v[i]; if (!r[13]) continue;
    out.push({ date: isoDate_(r[1]), shift: String(r[2]), line: Number(r[3]), batt: r[4], component: String(r[5]), phase: String(r[6]), value: r[7], unit: r[8], operator: r[9], meter: r[10], zero: r[11] === 'YES',
               time: (r[12] instanceof Date) ? r[12].getTime() : (r[0] instanceof Date ? r[0].getTime() : 0), error: r[14] || '', na: r[15] || '', range: r[16] || '', resolved: r[17] || '',
               area: r[18] || 'Assembly', uid: uidOfKey_(r[13]), uname: r[19] || '' });
  }
  return out;
}
function isoDate_(d) { if (d instanceof Date) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); return String(d); }
function uidOfKey_(k) { var p = String(k || '').split('|'); return p.length >= 6 ? p[0] : 'asm'; }   // gs-3.0: 'melt|2026-09-24|A|1|Heater-1|R' → 'melt'; old 5-part keys → Assembly
function boardItems_(date, shift, uid) { var all = logRows_(), out = [], u = uid || 'asm'; for (var i = 0; i < all.length; i++) if (all[i].date === String(date) && all[i].shift === String(shift) && all[i].uid === u) out.push(all[i]); return out; }
function historyItems_(line, component, phase, days, uid) {
  var all = logRows_(), out = [], lim = new Date(); lim.setDate(lim.getDate() - (Number(days) || 90)); var limIso = Utilities.formatDate(lim, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var u = uid || 'asm';
  for (var i = 0; i < all.length; i++) { var r = all[i]; if (r.uid === u && r.line === Number(line) && r.component === String(component) && r.phase === String(phase || '') && r.date >= limIso) out.push(r); }
  out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.shift < b.shift ? -1 : 1); });
  return out;
}

/* ---------- gs-2.3: issue photo → Drive ---------- */
function savePhoto_(name, mime, b64, meta) {
  var folders = DriveApp.getFoldersByName(PHOTO_FOLDER), folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(PHOTO_FOLDER);
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, name);
  var f = folder.createFile(blob);
  try { f.setDescription(JSON.stringify(meta)); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
  settingsRow_('last_photo', f.getUrl());
  return f.getUrl();
}

/* ---------- gs-2.3: daily summary e-mail (time trigger) ---------- */
function setMailSchedule_(to, hour, tz) {
  var props = PropertiesService.getScriptProperties();
  var trig = ScriptApp.getProjectTriggers();
  for (var i = 0; i < trig.length; i++) if (trig[i].getHandlerFunction() === 'dailySummaryJob') ScriptApp.deleteTrigger(trig[i]);
  props.setProperty('MAIL_TO', to || ''); props.setProperty('MAIL_HOUR', String(isNaN(hour) ? 6 : hour));
  var zone = tz || Session.getScriptTimeZone() || 'Asia/Kolkata';
  if (to) { ScriptApp.newTrigger('dailySummaryJob').timeBased().everyDays(1).atHour(isNaN(hour) ? 6 : hour).inTimezone(zone).create(); }
  settingsRow_('daily_mail', to ? (to + ' at ' + hour + ':00 ' + zone) : 'off');
  return zone;
}
function dailySummaryJob() { var to = PropertiesService.getScriptProperties().getProperty('MAIL_TO'); if (to) sendDailySummary_(to, false); }
function sendDailySummary_(to, isTest) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), all = logRows_();
  var d = new Date(); if (!isTest) d.setDate(d.getDate() - 1);     // scheduled run = yesterday; test = today
  var day = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'), dmy = dmy_(day);
  var rows = all.filter(function (r) { return r.date === day; });
  if (!rows.length && !isTest) { var last = ''; all.forEach(function (r) { if (r.date < day && r.date > last) last = r.date; }); if (last) { day = last; dmy = dmy_(day); rows = all.filter(function (r) { return r.date === day; }); } }
  var shifts = {}; rows.forEach(function (r) { var gk = (r.uid === 'asm' ? '' : r.area + ' ' + (r.uname || r.uid) + ' · ') + 'Shift ' + r.shift;   // gs-3.0: one block per unit + shift
    var s = shifts[gk] = shifts[gk] || { n: 0, zero: [], err: [], rng: [], na: [], fix: [], ops: {}, lines: {} }; s.n++; s.lines[r.line] = 1; if (r.operator) s.ops[r.operator] = 1;
    var tag = (r.uid === 'asm' ? 'L' + r.line : '#' + r.line) + ' ' + r.component + (r.phase ? ' ' + r.phase : '');
    if (r.na) s.na.push(tag + ' (' + r.na + ')'); else if (r.zero) s.zero.push(tag); else if (r.error) s.err.push(tag + ' ' + r.error); else if (r.range) s.rng.push(tag + ' ' + r.value + ' ' + r.range);
    if (r.resolved) s.fix.push(tag + ' — ' + r.resolved); });
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a"><h2 style="margin:0 0 4px">Assembly Heaters — daily summary</h2><div style="color:#64748b;margin-bottom:12px">' + dmy + (isTest ? ' · TEST e-mail' : '') + ' · ' + ss.getName() + '</div>';
  var text = 'Assembly Heaters — daily summary ' + dmy + '\n';
  var keys = Object.keys(shifts).sort(function (a, b) { var pa = a.indexOf('Shift ') === 0 ? 0 : 1, pb = b.indexOf('Shift ') === 0 ? 0 : 1; return pa - pb || (a < b ? -1 : a > b ? 1 : 0); });   // Assembly first, then the PLP units
  if (!keys.length) { html += '<p>No readings were saved on ' + dmy + '.</p>'; text += 'No readings.\n'; }
  keys.forEach(function (k) { var s = shifts[k]; var ok = !s.zero.length && !s.err.length && !s.rng.length;
    html += '<div style="border:1px solid #e2e8f0;border-left:6px solid ' + (ok ? '#16a34a' : '#dc2626') + ';border-radius:10px;padding:10px 12px;margin-bottom:10px"><b>' + k + '</b> — ' + s.n + ' readings · ' + (k.indexOf('Shift ') === 0 ? 'lines ' : 'units ') + Object.keys(s.lines).join(', ') + ' · ' + (Object.keys(s.ops).join(', ') || '—') + '<br>'
      + '<span style="color:#b91c1c">Zero: ' + s.zero.length + '</span> · <span style="color:#9a3412">Errors: ' + s.err.length + '</span> · <span style="color:#854d0e">Range: ' + s.rng.length + '</span> · NA: ' + s.na.length + '<br>'
      + (s.zero.length ? '<div style="margin-top:6px"><b>Zero:</b> ' + s.zero.join(', ') + '</div>' : '') + (s.err.length ? '<div><b>Errors:</b> ' + s.err.join(', ') + '</div>' : '') + (s.rng.length ? '<div><b>Out of range:</b> ' + s.rng.join(', ') + '</div>' : '') + (s.na.length ? '<div><b>NA:</b> ' + s.na.join(', ') + '</div>' : '') + (s.fix.length ? '<div style="color:#166534"><b>Resolved ✔:</b> ' + s.fix.join(', ') + '</div>' : '') + '</div>';
    text += k + ': ' + s.n + ' readings · zero ' + s.zero.length + ' · errors ' + s.err.length + ' · range ' + s.rng.length + ' · NA ' + s.na.length + '\n' + (s.zero.length ? '  Zero: ' + s.zero.join(', ') + '\n' : '') + (s.err.length ? '  Errors: ' + s.err.join(', ') + '\n' : '') + (s.rng.length ? '  Range: ' + s.rng.join(', ') + '\n' : '') + (s.na.length ? '  NA: ' + s.na.join(', ') + '\n' : ''); });
  var openIss = all.filter(function (r) { return (r.zero || r.error) && !r.resolved && r.date >= Utilities.formatDate(new Date(Date.now() - 7 * 86400000), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }).length;
  html += '<div style="margin:8px 0">Open zero / error points in the last 7 days (not marked resolved): <b>' + openIss + '</b></div><div><a href="' + ss.getUrl() + '">Open the Google Sheet</a></div><div style="color:#94a3b8;font-size:12px;margin-top:14px">This project corporates Somu &amp; Kiran · Powered by somu.ss74@gmail.com</div></div>';
  text += 'Sheet: ' + ss.getUrl() + '\n';
  MailApp.sendEmail({ to: to, subject: 'Assembly Heaters — ' + dmy + (isTest ? ' (test)' : '') + ' summary', htmlBody: html, body: text, name: 'Assembly Dashboard' });
  settingsRow_('last_mail', to + ' · ' + new Date());
}

/* ---------- helpers ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- gs-3.2: PLP month register (paper layout) — one tab per unit + month, e.g. 'Meltpot 09-2026' ---------- */
var REG_META = 5;                                             // A Date · B Day · C Shift · D Time · E Operator, then the point columns, then Remarks
var REG_HDR  = 3;                                             // row 1 title · row 2 line groups · row 3 point heads · data from row 4
var MONTHS_  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DOW_     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function pointHead_(c, p) { return String(c) + (p ? ' ' + p : ''); }
function ymOf_(iso) { return String(iso || '').slice(0, 7); }                                   // '2026-09'
function regName_(it) { var ym = ymOf_(it.date).split('-'); return (it.uname || it.uid) + ' ' + ym[1] + '-' + ym[0]; }
function ymLabel_(iso) { var ym = ymOf_(iso).split('-'); return MONTHS_[Number(ym[1]) - 1] + ' ' + ym[0]; }
function unitLines_(it) { var n = Number(it.ulines) || 1, out = []; for (var L = 1; L <= n; L++) out.push(n === 1 ? String(it.uname || it.uid) : String(it.ulabel || '') + L); return out; }
function lineLabel_(it) { var n = Number(it.ulines) || 1; return n === 1 ? String(it.uname || it.uid) : String(it.ulabel || '') + (Number(it.line) || 1); }
function compHeads_(comps) { var h = []; for (var c = 0; c < (comps || []).length; c++) { var ph = String(comps[c][1] || 'S'); if (ph === 'S') h.push(pointHead_(comps[c][0], '')); else for (var j = 0; j < ph.length; j++) h.push(pointHead_(comps[c][0], ph.charAt(j))); } return h; }
function getRegister_(it, comps) {                            // creates the month tab with every day pre-printed
  var ss = SpreadsheetApp.getActiveSpreadsheet(), name = regName_(it), sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name);
  var heads = compHeads_(comps); if (!heads.length) heads.push(pointHead_(it.component, it.phase));
  var lines = unitLines_(it), nL = lines.length, w = REG_META + heads.length * nL + 1;
  sh.getRange(1, 1, 1, w).merge().setValue(String(it.utitle || it.uname || it.uid) + ' — ' + ymLabel_(it.date)).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  var meta = ['Date', 'Day', 'Shift', 'Time', 'Operator'];
  for (var m = 0; m < meta.length; m++) sh.getRange(2, m + 1, 2, 1).merge().setValue(meta[m]);
  var hdr3 = [];
  for (var L = 0; L < nL; L++) { var c0 = REG_META + 1 + L * heads.length; sh.getRange(2, c0, 1, heads.length).merge().setValue(lines[L]).setBackground('#fde68a'); hdr3 = hdr3.concat(heads); }
  sh.getRange(3, REG_META + 1, 1, hdr3.length).setValues([hdr3]);
  sh.getRange(2, w, 2, 1).merge().setValue('Remarks');
  sh.getRange(2, 1, 2, w).setFontWeight('bold').setBackground('#ffe600').setHorizontalAlignment('center').setVerticalAlignment('middle').setBorder(true, true, true, true, true, true);
  for (var L2 = 0; L2 < nL; L2++) sh.getRange(2, REG_META + 1 + L2 * heads.length).setBackground('#fde68a');
  var ym = ymOf_(it.date).split('-'), y = Number(ym[0]), mo = Number(ym[1]), nd = new Date(y, mo, 0).getDate(), rows = [];
  for (var d = 1; d <= nd; d++) { var dt = new Date(y, mo - 1, d); rows.push([('0' + d).slice(-2) + '-' + ('0' + mo).slice(-2) + '-' + y, DOW_[dt.getDay()], '', '', '']); }
  sh.getRange(REG_HDR + 1, 1, nd, REG_META).setValues(rows).setHorizontalAlignment('center');
  sh.getRange(REG_HDR + 1, 1, nd, 1).setFontWeight('bold');
  for (var r = 0; r < nd; r++) if (rows[r][1] === 'Sun') sh.getRange(REG_HDR + 1 + r, 1, 1, w).setBackground('#f1f5f9').setFontColor('#64748b');
  sh.getRange(REG_HDR + 1, 1, nd, w).setBorder(true, true, true, true, true, true);
  sh.setColumnWidth(1, 92); sh.setColumnWidth(2, 46); sh.setColumnWidth(3, 46); sh.setColumnWidth(4, 56); sh.setColumnWidth(5, 110); for (var c = REG_META + 1; c < w; c++) sh.setColumnWidth(c, 68); sh.setColumnWidth(w, 260);
  sh.setFrozenRows(REG_HDR); sh.setFrozenColumns(1);
  return sh;
}
function regHeads_(sh) {                                      // [{group, head}] per column (merged group cells carry the label only in their first column)
  var w = sh.getLastColumn(); if (w < REG_META + 1) return [];
  var g = sh.getRange(2, 1, 1, w).getValues()[0], h = sh.getRange(3, 1, 1, w).getValues()[0], out = [], cur = '';
  for (var i = 0; i < w; i++) { if (String(g[i]) !== '') cur = String(g[i]); out.push({ group: cur, head: String(h[i]) }); }
  return out;
}
function regCol_(sh, it) {                                    // column of this line + point; a new point (Components changed) is added before Remarks
  var heads = regHeads_(sh), head = pointHead_(it.component, it.phase), label = lineLabel_(it), remC = 0;
  for (var i = REG_META; i < heads.length; i++) { if (heads[i].group === 'Remarks' || heads[i].head === 'Remarks') { remC = i + 1; break; } if (heads[i].group === label && heads[i].head === head) return i + 1; }
  var col = remC || heads.length + 1;
  sh.insertColumnBefore(col);
  sh.getRange(2, col).setValue(label).setFontWeight('bold').setBackground('#fde68a').setHorizontalAlignment('center');
  sh.getRange(3, col).setValue(head).setFontWeight('bold').setBackground('#ffe600').setHorizontalAlignment('center');
  sh.getRange(2, col, sh.getLastRow() - 1, 1).setBorder(true, true, true, true, true, true);
  return col;
}
function regRow_(sh, it) {                                    // row of date + shift: the pre-printed day row when its shift is free, else a new row inside that day (kept in A → B → C order)
  var d = dmy_(it.date), sft = String(it.shift || ''), n = sh.getLastRow(), v = n >= REG_HDR + 1 ? sh.getRange(REG_HDR + 1, 1, n - REG_HDR, 3).getValues() : [], free = 0, last = 0, before = 0;
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === d) { last = REG_HDR + 1 + i; if (String(v[i][2]) === sft) return last; if (String(v[i][2]) === '' && !free) free = last; if (!before && String(v[i][2]) > sft) before = last; }
  var w = Math.max(sh.getLastColumn(), REG_META + 1);
  if (free) { sh.getRange(free, 3).setValue(sft); return free; }
  var r = before ? before : (last ? last + 1 : n + 1);
  if (before) sh.insertRowBefore(r); else sh.insertRowAfter(r - 1);
  var day = last ? sh.getRange(before ? r + 1 : last, 2).getValue() : '';
  sh.getRange(r, 1, 1, 3).setValues([[d, day, sft]]).setHorizontalAlignment('center'); sh.getRange(r, 1).setFontWeight('bold');
  if (String(day) === 'Sun') sh.getRange(r, 1, 1, w).setBackground('#f1f5f9').setFontColor('#64748b');
  sh.getRange(r, 1, 1, w).setBorder(true, true, true, true, true, true);
  return r;
}
function updateMonthRegister_(it, comps) {
  var sh = getRegister_(it, comps), r = regRow_(sh, it), col = regCol_(sh, it), heads = regHeads_(sh), remC = 0;
  for (var i = REG_META; i < heads.length; i++) if (heads[i].head === 'Remarks' || heads[i].group === 'Remarks') { remC = i + 1; break; }
  if (!remC) remC = sh.getLastColumn();
  var nL = Number(it.ulines) || 1, tag = (nL > 1 ? lineLabel_(it) + ' ' : '') + pointHead_(it.component, it.phase);
  var cell = sh.getRange(r, col), rc = sh.getRange(r, remC), cur = String(rc.getValue() || ''), parts = cur ? cur.split(' · ') : [], out = [];
  for (var k = 0; k < parts.length; k++) if (parts[k].indexOf(tag + ' ') !== 0 && parts[k] !== tag) out.push(parts[k]);
  var sunday = String(sh.getRange(r, 2).getValue()) === 'Sun', base = sunday ? '#f1f5f9' : null;
  if (it.del) { cell.clearContent().clearNote().setBackground(base).setFontColor(null).setFontWeight('normal').setFontStyle('normal'); rc.setValue(out.join(' · ')).setFontColor(out.length ? '#b91c1c' : null); return; }
  cell.setValue(isNA_(it) ? 'NA' : toNum_(it.value)).setHorizontalAlignment('center');
  if (isNA_(it))     cell.setBackground('#e2e8f0').setFontColor('#334155').setFontWeight('bold');
  else if (it.zero)  cell.setBackground('#fecaca').setFontColor('#b91c1c').setFontWeight('bold');
  else if (it.range) cell.setBackground('#ffe4e6').setFontColor('#b91c1c').setFontWeight('bold');
  else               cell.setBackground(base).setFontColor('#000000').setFontWeight('normal');
  if (isManual_(it)) cell.setFontStyle('italic').setNote('Manual entry (typed by hand, no meter): ' + it.meter + ' · ' + new Date());
  else               cell.setFontStyle('normal').clearNote();
  if (it.time) { var tc = sh.getRange(r, 4), t = new Date(Number(it.time)), cv = tc.getValue(); if (!cv || (cv instanceof Date && t < cv)) tc.setValue(t).setNumberFormat('HH:mm').setHorizontalAlignment('center'); }
  if (it.operator) { var oc = sh.getRange(r, 5), o = String(oc.getValue() || ''); if (!o) oc.setValue(it.operator); else if (o.indexOf(it.operator) < 0) oc.setValue(o + ', ' + it.operator); }
  if (isNA_(it))        out.push(tag + ' NA (' + (it.na || 'not measured') + ')');
  else if (it.zero)     out.push(tag + ' = 0 (check heater)');
  else if (it.range)    out.push(tag + ' ' + toNum_(it.value) + ' ' + it.range);
  if (it.resolved)      out.push(tag + ' RESOLVED ✔ ' + it.resolved);
  rc.setValue(out.join(' · ')).setFontColor(out.length ? '#b91c1c' : null).setHorizontalAlignment('left');
}
