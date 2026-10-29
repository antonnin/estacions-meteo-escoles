/**
 * ============================================================
 * METEO:BIT — BACKEND (Google Apps Script, vinculat al full de càlcul)
 * ============================================================
 *
 * Què fa:
 *  1. Rep les altes d'estacions del Google Form i les valida contra ThingSpeak
 *     (fulla "estacions", estat "pendent" fins que una persona les aprova).
 *  2. Cada hora copia al full de càlcul la MITJANA HORÀRIA de cada estació
 *     aprovada (una fulla "d_<id>" per estació) → històric independent de ThingSpeak.
 *  3. Rep els missatges del formulari de contacte de la web (POST → fulla "contactes").
 *  4. Serveix a la web (aplicació web, GET):
 *       ?action=stations                       → registre d'estacions aprovades
 *       ?action=history&id=X&from=ISO&to=ISO   → històric d'una estació
 *
 * Instal·lació: vegeu apps-script/README.md
 */

// ---------- Constants ----------
var SHEET_STATIONS = 'estacions';
var SHEET_CONTACTS = 'contactes';
var DATA_PREFIX = 'd_';
var STATION_COLS = ['id', 'name', 'location', 'comarca', 'lat', 'lng', 'website', 'profile',
  'channelId', 'readApiKey', 'fields', 'estat', 'contacte', 'dataAlta', 'ultimaRecollida', 'notes'];
var DATA_COLS = ['created_at', 'field1', 'field2', 'field3', 'field4', 'field5', 'field6', 'field7', 'field8'];
var TS_BASE = 'https://api.thingspeak.com';
var MAX_HISTORY_ROWS = 20000;
var RUN_BUDGET_MS = 4.5 * 60 * 1000; // l'script té 6 min; parem abans i continuem la propera hora
var STATUS = { PENDING: 'pendent', APPROVED: 'aprovada', REJECTED: 'rebutjada' };

// ============================================================
// INSTAL·LACIÓ I MENÚ
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Estacions en xarxa')
    .addItem('1. Configuració inicial', 'setup')
    .addItem('Aprovar les files seleccionades', 'approveSelected')
    .addItem('Recollir dades ara', 'collectAll')
    .addItem('Buidar la memòria cau del web', 'clearCache_')
    .addToUi();
}

/** Crea les fulles i els activadors. Es pot executar més d'un cop sense efectes dolents. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_STATIONS) || ss.insertSheet(SHEET_STATIONS);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, STATION_COLS.length).setValues([STATION_COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }

  var cs = ss.getSheetByName(SHEET_CONTACTS) || ss.insertSheet(SHEET_CONTACTS);
  if (cs.getLastRow() === 0) {
    cs.getRange(1, 1, 1, 6).setValues([['data', 'nom', 'correu', 'motiu', 'missatge', 'estat']]).setFontWeight('bold');
    cs.setFrozenRows(1);
  }

  // Activadors: recollida horària + procés del formulari
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'collectAll' || fn === 'onFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('collectAll').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ARCHIVE_FROM')) props.setProperty('ARCHIVE_FROM', '2025-01-01T00:00:00Z');
  SpreadsheetApp.getUi().alert('Configuració feta.\n\nSegüents passos: desplega com a aplicació web (vegeu README) i,\nopcionalment, defineix la propietat ADMIN_EMAIL per rebre avisos d\'altes.');
}

/** Marca com a aprovades les files seleccionades de la fulla "estacions" */
function approveSelected() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SHEET_STATIONS) {
    SpreadsheetApp.getUi().alert('Selecciona files de la fulla "' + SHEET_STATIONS + '".');
    return;
  }
  var col = STATION_COLS.indexOf('estat') + 1;
  var range = sh.getActiveRange();
  var first = Math.max(range.getRow(), 2);
  var last = range.getLastRow();
  for (var r = first; r <= last; r++) sh.getRange(r, col).setValue(STATUS.APPROVED);
  clearCache_();
}

function clearCache_() {
  CacheService.getScriptCache().remove('stations');
}

// ============================================================
// 1. ALTA D'ESTACIONS (Google Form → fulla "estacions")
// ============================================================

/** Busca en les respostes la primera pregunta que contingui algun dels textos (sense accents/majúscules) */
function pick_(namedValues, needles) {
  for (var key in namedValues) {
    var k = norm_(key);
    for (var i = 0; i < needles.length; i++) {
      if (k.indexOf(norm_(needles[i])) !== -1) {
        var v = namedValues[key];
        return String(Array.isArray(v) ? v[0] : v).trim();
      }
    }
  }
  return '';
}

function norm_(t) {
  return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function slug_(t) {
  return norm_(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40);
}

function profileFromLabel_(label) {
  var l = norm_(label);
  if (l.indexOf('micro:bit') !== -1 || l.indexOf('microbit') !== -1) return 'microbit-iot';
  if (l.indexOf('esp32') !== -1) return 'esp32';
  return 'personalitzat';
}

/** Mateixes regles que detectFieldType a js/boards.js */
function detectType_(name) {
  var n = norm_(name);
  var rules = [
    ['temperature', /temp|temperatura|celsius|degree/],
    ['humidity', /humit|humid|humedad/],
    ['pressure', /pressi|presion|pressure|hpa|baro/],
    ['wind', /vent\b|vento|viento|wind|anemo/],
    ['rain', /pluj|pluv|lluvia|rain|precip/],
    ['light', /llum|lumin|light|lux|solar|irradi/],
    ['dust', /pols|polvo|dust|pm ?2|pm ?10|particul/],
    ['battery', /bateri|battery|volt/],
    ['signal', /senyal|signal|rssi|wifi|wi-fi/]
  ];
  for (var i = 0; i < rules.length; i++) if (rules[i][1].test(n)) return rules[i][0];
  return 'generic';
}

function tsUrl_(path, apiKey, extra) {
  var q = [];
  if (apiKey) q.push('api_key=' + encodeURIComponent(apiKey));
  if (extra) q.push(extra);
  return TS_BASE + path + (q.length ? '?' + q.join('&') : '');
}

/** Activador del formulari: valida el canal i afegeix la fila "pendent" */
function onFormSubmit(e) {
  var nv = e.namedValues;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_STATIONS);
  var existing = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }) : [];

  var name = pick_(nv, ['nom de l\'estacio', 'nom estacio', 'nom']);
  var base = slug_(name) || 'estacio';
  var id = base, n = 2;
  while (existing.indexOf(id) !== -1) id = base + '-' + (n++);

  var channelId = pick_(nv, ['channel id', 'id del canal']).replace(/\D/g, '');
  var readKey = pick_(nv, ['read api key', 'clau de lectura']);
  var profile = profileFromLabel_(pick_(nv, ['tipus de placa', 'placa']));
  var estat = STATUS.PENDING, notes = '', fields = '';

  // Validació contra ThingSpeak
  try {
    var res = UrlFetchApp.fetch(tsUrl_('/channels/' + channelId + '.json', readKey), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      estat = 'error';
      notes = 'Canal no accessible (HTTP ' + res.getResponseCode() + '). Comprova l\'ID i que sigui públic.';
    } else {
      var info = JSON.parse(res.getContentText());
      if (profile === 'personalitzat') {
        var spec = {};
        for (var i = 1; i <= 8; i++) {
          var label = info['field' + i];
          if (label) spec['field' + i] = { type: detectType_(label), name: String(label).replace(/\s*[\(\[].*[\)\]]\s*$/, '').trim() || label };
        }
        fields = JSON.stringify(spec);
      }
      if (readKey) notes = 'Canal privat: la Read API Key serà pública a la web.';
    }
  } catch (err) {
    estat = 'error';
    notes = 'No s\'ha pogut validar el canal: ' + err;
  }

  var coords = parseCoords_(pick_(nv, ['coordenades', 'latitud']), pick_(nv, ['longitud']));
  if (coords.lat === '' || coords.lng === '') {
    estat = 'error';
    notes = (notes ? notes + ' ' : '') + 'Coordenades no vàlides: cal "latitud, longitud" (p. ex. 41.3416, 1.6356).';
  }

  var row = {
    id: id, name: name, location: pick_(nv, ['municipi', 'localitat']), comarca: pick_(nv, ['comarca']),
    lat: coords.lat, lng: coords.lng,
    website: pick_(nv, ['web']), profile: profile, channelId: channelId, readApiKey: readKey,
    fields: fields, estat: estat, contacte: pick_(nv, ['correu', 'contacte', 'email']),
    dataAlta: new Date(), ultimaRecollida: '', notes: notes
  };
  sh.appendRow(STATION_COLS.map(function (c) { return safe_(row[c]); }));

  var admin = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (admin) {
    MailApp.sendEmail(admin, 'Estacions en xarxa — nova estació: ' + name,
      'Estat: ' + estat + '\nId: ' + id + '\nCanal: ' + channelId + '\n' + notes +
      '\n\nObre el full i canvia "estat" a "aprovada" per publicar-la:\n' + ss.getUrl());
  }
  clearCache_();
}

/** Evita que un text que comença per = + - @ s'interpreti com a fórmula al full (injecció de fórmules) */
function safe_(v) {
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}

/** Accepta "41.3416, 1.6356" (còpia directa de Google Maps) o, per compatibilitat, latitud i longitud separades */
function parseCoords_(first, second) {
  var nums = String(first).match(/-?\d+(?:\.\d+)?/g) || [];
  if (nums.length >= 2) return { lat: parseFloat(nums[0]), lng: parseFloat(nums[1]) };
  return { lat: toNumber_(first), lng: toNumber_(second) };
}

function toNumber_(t) {
  var v = parseFloat(String(t).replace(',', '.'));
  return isNaN(v) ? '' : v;
}

// ============================================================
// 2. ARXIU HORARI AL FULL DE CÀLCUL
// ============================================================

function readStations_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_STATIONS);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getRange(2, 1, sh.getLastRow() - 1, STATION_COLS.length).getValues();
  return values.map(function (r, i) {
    var o = { _row: i + 2 };
    STATION_COLS.forEach(function (c, j) { o[c] = r[j]; });
    return o;
  }).filter(function (o) { return o.id; });
}

function isoUtc_(date) {
  return Utilities.formatDate(date, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

/** Activador horari: arxiva totes les estacions aprovades (amb límit de temps) */
function collectAll() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // ja hi ha una execució en curs
  var t0 = Date.now();
  try {
    var stations = readStations_().filter(function (s) { return s.estat === STATUS.APPROVED; });
    // Les que fa més temps que no es recullen, primer (així cap no es queda sense torn)
    stations.sort(function (a, b) { return String(a.ultimaRecollida).localeCompare(String(b.ultimaRecollida)); });
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_STATIONS);
    var colLast = STATION_COLS.indexOf('ultimaRecollida') + 1;
    var colNotes = STATION_COLS.indexOf('notes') + 1;
    for (var i = 0; i < stations.length; i++) {
      if (Date.now() - t0 > RUN_BUDGET_MS) { console.warn('Temps esgotat; la resta, a la propera execució'); break; }
      var st = stations[i];
      try {
        collectStation_(st, t0);
        sh.getRange(st._row, colLast).setValue(new Date());
      } catch (err) {
        console.error(st.id + ': ' + err);
        sh.getRange(st._row, colNotes).setValue('Última recollida fallida: ' + err);
      }
    }
  } finally {
    lock.releaseLock();
  }
}

function dataSheet_(id) {
  if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new Error('Identificador no vàlid: ' + id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = DATA_PREFIX + id;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, DATA_COLS.length).setValues([DATA_COLS]).setFontWeight('bold');
    sh.getRange('A:A').setNumberFormat('@'); // text pla: evita que Sheets converteixi les dates
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Descarrega mitjanes horàries noves i les afegeix a la fulla de l'estació */
function collectStation_(st, t0) {
  var sh = dataSheet_(st.id);
  var archiveFrom = PropertiesService.getScriptProperties().getProperty('ARCHIVE_FROM') || '2025-01-01T00:00:00Z';

  // Última hora ja arxivada → tornem a demanar des d'1 h abans (l'última mitjana podia ser parcial)
  var lastRow = sh.getLastRow();
  var start = archiveFrom;
  if (lastRow > 1) {
    var lastTs = sh.getRange(lastRow, 1).getValue();
    var d = new Date(String(lastTs));
    if (!isNaN(d)) start = isoUtc_(new Date(d.getTime() - 3600 * 1000));
    if (start < archiveFrom) start = archiveFrom;
  }

  var rows = [];
  var cursor = start;
  for (var page = 0; page < 20; page++) {
    if (Date.now() - t0 > RUN_BUDGET_MS) break;
    var url = tsUrl_('/channels/' + st.channelId + '/feeds.json', st.readApiKey,
      'average=60&round=2&results=8000&start=' + encodeURIComponent(cursor));
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('ThingSpeak HTTP ' + res.getResponseCode());
    var feeds = JSON.parse(res.getContentText()).feeds || [];
    if (!feeds.length) break;
    feeds.forEach(function (f) {
      var row = [f.created_at], any = false;
      for (var i = 1; i <= 8; i++) {
        var v = f['field' + i];
        if (v === null || v === undefined || v === '') row.push('');
        else { row.push(parseFloat(v)); any = true; }
      }
      if (any) rows.push(row);
    });
    if (feeds.length < 8000) break;
    cursor = isoUtc_(new Date(new Date(feeds[feeds.length - 1].created_at).getTime() + 1000));
  }
  if (!rows.length) return;

  // Upsert: esborrem les files ja arxivades des de "start" i afegim les noves
  if (lastRow > 1) {
    var existing = sh.getRange(2, 1, lastRow - 1, 1).getValues();
    var firstDup = -1;
    for (var k = 0; k < existing.length; k++) {
      if (String(existing[k][0]) >= start) { firstDup = k; break; }
    }
    if (firstDup !== -1) sh.deleteRows(firstDup + 2, existing.length - firstDup);
  }
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, DATA_COLS.length).setValues(rows);
}

// ============================================================
// 3. API PÚBLICA (aplicació web)
// ============================================================

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    switch (p.action) {
      case 'stations': return json_(publicStations_());
      case 'history': return json_(history_(p.id, p.from, p.to));
      case 'ping': return json_({ ok: true, time: new Date().toISOString() });
      default: return json_({ error: 'Acció desconeguda. Usa stations, history o ping.' });
    }
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.action === 'contact') return json_(saveContact_(d));
    return json_({ error: 'Acció desconeguda' });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function clip_(t, n) {
  return String(t == null ? '' : t).trim().substring(0, n);
}

/** Desa un missatge del formulari de contacte i avisa l'administrador (ADMIN_EMAIL) */
function saveContact_(d) {
  if (d.website) return { ok: true }; // camp parany: és un robot, ho ignorem sense avisar
  var name = clip_(d.name, 100), email = clip_(d.email, 150), topic = clip_(d.topic, 80), msg = clip_(d.message, 3000);
  if (!name || !msg || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Dades incompletes');

  // Límit simple anti-spam: 30 missatges per hora en total
  var cache = CacheService.getScriptCache();
  var n = parseInt(cache.get('contact_n') || '0', 10);
  if (n >= 30) throw new Error('Massa missatges; torna-ho a provar més tard');
  cache.put('contact_n', String(n + 1), 3600);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_CONTACTS) || ss.insertSheet(SHEET_CONTACTS);
  sh.appendRow([new Date(), safe_(name), safe_(email), safe_(topic), safe_(msg), 'nou']);

  var admin = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (admin) {
    MailApp.sendEmail({
      to: admin,
      replyTo: email,
      subject: 'Estacions en xarxa — contacte: ' + topic,
      body: 'De: ' + name + ' <' + email + '>\nMotiu: ' + topic + '\n\n' + msg
    });
  }
  return { ok: true };
}

/** Només estacions aprovades i només camps públics (mai el correu de contacte ni les notes) */
function publicStations_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('stations');
  if (hit) return JSON.parse(hit);

  var out = { stations: readStations_().filter(function (s) { return s.estat === STATUS.APPROVED; }).map(function (s) {
    var o = {
      id: s.id, name: s.name, location: s.location, comarca: s.comarca,
      lat: s.lat === '' ? null : s.lat, lng: s.lng === '' ? null : s.lng,
      website: s.website, profile: s.profile, channelId: String(s.channelId)
    };
    if (s.readApiKey) o.readApiKey = String(s.readApiKey);
    if (s.fields) { try { o.fields = JSON.parse(s.fields); } catch (err) { /* ignora JSON mal format */ } }
    return o;
  }) };
  cache.put('stations', JSON.stringify(out), 300);
  return out;
}

function history_(id, from, to) {
  var st = readStations_().filter(function (s) { return s.id === id && s.estat === STATUS.APPROVED; })[0];
  if (!st) throw new Error('Estació desconeguda o no aprovada');
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_PREFIX + id);
  if (!sh || sh.getLastRow() < 2) return { id: id, rows: [] };

  var fromIso = from || '0000', toIso = to || '9999';
  var values = sh.getRange(2, 1, sh.getLastRow() - 1, DATA_COLS.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var ts = String(values[i][0]);
    if (ts < fromIso || ts > toIso) continue;
    var o = { created_at: ts };
    for (var j = 1; j <= 8; j++) o['field' + j] = values[i][j] === '' ? null : values[i][j];
    rows.push(o);
  }
  var truncated = rows.length > MAX_HISTORY_ROWS;
  if (truncated) rows = rows.slice(rows.length - MAX_HISTORY_ROWS);
  return { id: id, rows: rows, truncated: truncated };
}
