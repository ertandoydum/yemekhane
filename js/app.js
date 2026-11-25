/* Yemekhane Planlayıcı – arayüz */
(function () {
  'use strict';
  var D = window.YDATA, C = window.YCORE, S = window.YSTORE;

  // ------------------------------------------------------------ yardımcılar
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tr(a, b) { return String(a).localeCompare(String(b), 'tr'); }
  function num(s) { var n = parseFloat(String(s).replace(',', '.')); return isNaN(n) ? 0 : n; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2600);
  }

  var storage = null;
  try { storage = window.localStorage; storage.setItem('_t', '1'); storage.removeItem('_t'); } catch (e) { storage = null; }
  var store = S.createStore({ storage: storage });
  var CFG_KEY = 'yemekhane.cfg.v1';
  // Varsayılan ortak veritabanı: ayar yapmadan tüm cihazlar aynı veriyi görür (Ayarlar'dan değiştirilebilir/kaldırılabilir)
  var DEFAULT_CFG = { url: 'https://yemekhane-planlayici-default-rtdb.europe-west1.firebasedatabase.app', code: 'yemekhane-iscev-k7p2xq' };
  var cfg = { url: DEFAULT_CFG.url, code: DEFAULT_CFG.code };
  try { var rawCfg = storage.getItem(CFG_KEY); if (rawCfg) cfg = Object.assign({ url: '', code: '' }, JSON.parse(rawCfg)); } catch (e) { }
  function saveCfg() { try { storage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { } }
  var sync = S.createSync(store, function () { return cfg; });

  var BASE = C.generate(C.BASE.start, C.BASE.end, C.BASE.seed);
  var today = C.todayISO();

  var st = {
    tab: 'menu', page: null, selDay: null, month: today.slice(0, 7), year: today.slice(0, 4),
    week: C.mondayOf(today), tarifMode: 'hafta', q: '', cat: '', sq: '', sf: 'all', open: {}, su: {}
  };
  if (st.month < C.BASE.start.slice(0, 7)) st.month = C.BASE.start.slice(0, 7);

  // ------------------------------------------------------------ veri erişimi
  function getDay(iso) { var o = store.get('menu:' + iso); if (o) return o; return BASE[iso] || null; }
  function defaultHc() { return store.get('set:hc') || 16; }
  function weekHc(mon) { return store.get('wk:' + mon + ':hc') || defaultHc(); }

  function customIngs() {
    var out = {};
    store.keys('item:').forEach(function (k) {
      var v = store.get(k); var id = k.slice(5);
      if (v) out[id] = { id: id, name: v.n, unit: v.u, cat: v.c, custom: true };
    });
    return out;
  }
  function ing(id) { return D.ING[id] || customIngs()[id]; }
  function allIngs() {
    var all = Object.keys(D.ING).map(function (k) { return D.ING[k]; });
    var c = customIngs(); Object.keys(c).forEach(function (k) { all.push(c[k]); });
    return all;
  }
  function stockAmt(id) { var s = store.get('stock:' + id); return s ? (+s.a || 0) : 0; }
  function stockMin(id) { var s = store.get('stock:' + id); return s ? (+s.m || 0) : 0; }
  function setStock(id, a, m) {
    var o = store.get('stock:' + id) || {};
    store.set('stock:' + id, { a: Math.max(0, Math.round(a * 100) / 100), m: m == null ? (o.m || 0) : m });
  }

  // ------------------------------------------------------------ menü işlemleri
  function prevContext(start) {
    var out = [];
    for (var d = C.addDays(start, -1), n = 0; n < 60 && out.length < 30; d = C.addDays(d, -1), n++) {
      var x = getDay(d); if (x && !x.off && x.slots) out.unshift(x);
    }
    return out;
  }
  // ---- kullanıcı yemekleri / malzemeleri
  function exclMap() { var o = {}; store.keys('rex:').forEach(function (k) { o[k.slice(4)] = 1; }); return o; }
  function applyCustom() {
    var wantI = {}, wantR = {};
    store.keys('cing:').forEach(function (k) { var v = store.get(k); if (v && v.name) { v = clone(v); v.id = k.slice(5); wantI[v.id] = 1; D.registerIng(v); } });
    store.keys('crec:').forEach(function (k) { var v = store.get(k); if (v && v.name) { v = clone(v); v.id = k.slice(5); wantR[v.id] = 1; D.registerRec(v); } });
    D.REC_LIST.filter(function (r) { return r.custom && !wantR[r.id]; }).forEach(function (r) { D.unregisterRec(r.id); });
    Object.keys(D.ING).filter(function (i) { return D.ING[i].custom && !wantI[i]; }).forEach(function (i) { D.unregisterIng(i); });
  }
  function usedInMenus(id) {
    return store.keys('menu:').filter(function (k) { var v = store.get(k); return v && v.slots && v.slots.some(function (x) { return x.id === id; }); }).map(function (k) { return k.slice(5); });
  }
  var dishForm = null;
  var MONTH_OPTS = function (sel) { var h = ''; for (var i = 1; i <= 12; i++) h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + C.AY[i] + '</option>'; return h; };
  function ingOptions(sel) {
    return '<option value="">Malzeme seç…</option>' + Object.keys(D.ING).map(function (i) { return D.ING[i]; }).sort(function (a, b) { return tr(a.name, b.name); })
      .map(function (g) { return '<option value="' + g.id + '"' + (g.id === sel ? ' selected' : '') + '>' + esc(g.name) + ' (' + g.unit + ')' + '</option>'; }).join('');
  }
  function dfCollect() {
    if (!dishForm) return;
    var v = function (id) { var e = $('#' + id); return e ? e.value : null; };
    var nm = v('df_name'); if (nm !== null) dishForm.name = nm;
    if (v('df_cat') !== null) dishForm.cat = v('df_cat');
    if (v('df_per') !== null) dishForm.per = v('df_per');
    if (v('df_steps') !== null) dishForm.steps = v('df_steps');
    if (v('df_kind') !== null) dishForm.kind = v('df_kind');
    if (v('df_sea') !== null) { dishForm.sea = v('df_sea'); dishForm.m1 = +v('df_m1') || 1; dishForm.m2 = +v('df_m2') || 12; }
    $$('[data-dfi]').forEach(function (e) { var i = +e.getAttribute('data-dfi'); if (dishForm.rows[i]) dishForm.rows[i].id = e.value; });
    $$('[data-dfq]').forEach(function (e) { var i = +e.getAttribute('data-dfq'); if (dishForm.rows[i]) dishForm.rows[i].q = e.value; });
  }
  function openDishForm(id) {
    if (!dishForm) {
      var r = id && D.REC[id];
      dishForm = r ? { id: id, name: r.name, cat: r.cat, per: '10', steps: r.steps.join('\n'), kind: (r.tags.indexOf('kofte') >= 0 ? 'kofte' : r.tags.indexOf('kebap') >= 0 ? 'kebap' : ''),
        sea: r.season ? '1' : '', m1: r.season ? r.season[0] : 1, m2: r.season ? r.season[1] : 12, rows: r.ing.map(function (x) { return { id: x.id, q: String(x.q) }; }), ni: null }
        : { id: null, name: '', cat: 'A', per: '10', steps: '', kind: '', sea: '', m1: 1, m2: 12, rows: [{ id: '', q: '' }], ni: null };
    }
    var f = dishForm;
    var h = '<div class="row spread"><h2>' + (f.id ? 'Yemeği düzenle' : '＋ Yeni yemek ekle') + '</h2><button class="btn sm" data-act="dfcancel">Kapat ✕</button></div>';
    h += '<label class="f">Yemek adı</label><input type="text" id="df_name" value="' + esc(f.name) + '" placeholder="Örn. Kıymalı Mantar Yemeği">';
    h += '<label class="f">Kategori</label><select id="df_cat">' + Object.keys(D.CAT_NAME).map(function (c) { return '<option value="' + c + '"' + (c === f.cat ? ' selected' : '') + '>' + esc(D.CAT_NAME[c]) + '</option>'; }).join('') + '</select>';
    h += '<label class="f">Malzeme miktarları kaç kişilik?</label><input type="number" min="1" inputmode="numeric" id="df_per" value="' + esc(f.per) + '">';
    h += '<label class="f">Malzemeler</label>';
    f.rows.forEach(function (rw, i) {
      var g = rw.id && D.ING[rw.id];
      h += '<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><select data-dfi="' + i + '" style="flex:2">' + ingOptions(rw.id) + '</select><input type="number" step="any" min="0" inputmode="decimal" data-dfq="' + i + '" value="' + esc(rw.q) + '" placeholder="Miktar" style="flex:1;min-width:70px"><span class="muted" style="min-width:34px">' + (g ? esc(g.unit) : '') + '</span><button class="btn sm danger" data-act="dfdelrow" data-i="' + i + '">✕</button></div>';
    });
    h += '<div class="row" style="margin:6px 0"><button class="btn sm" data-act="dfaddrow">＋ Malzeme satırı</button><button class="btn sm" data-act="dfnewing">Listede olmayan malzeme tanımla</button></div>';
    if (f.ni) {
      h += '<div class="card" style="background:#eef6fb"><b>Yeni malzeme</b><label class="f">Adı</label><input type="text" id="ni_name" value="' + esc(f.ni.name) + '" placeholder="Örn. mantar (taze)"><div class="row" style="flex-wrap:nowrap"><div style="flex:1"><label class="f">Birim</label><select id="ni_unit">' + ['g', 'ml', 'adet', 'demet'].map(function (u) { return '<option' + (u === f.ni.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div><div style="flex:2"><label class="f">Reyon (alışveriş grubu)</label><select id="ni_cat">' + Object.keys(D.CATS).map(function (c) { return '<option value="' + c + '"' + (c === f.ni.cat ? ' selected' : '') + '>' + esc(D.CATS[c]) + '</option>'; }).join('') + '</select></div></div><div class="row" style="margin-top:8px"><button class="btn sm primary" data-act="dfsaveing">Malzemeyi ekle</button><button class="btn sm" data-act="dfcancelng">Vazgeç</button></div></div>';
    }
    h += '<label class="f">Yapılışı (her satır bir adım)</label><textarea id="df_steps" rows="5" placeholder="Soğanı kavurun.\nKıymayı ekleyip pişirin.">' + esc(f.steps) + '</textarea>';
    h += '<label class="f">Sezon</label><select id="df_sea"><option value="">Her mevsim</option><option value="1"' + (f.sea ? ' selected' : '') + '>Belirli aylar</option></select>';
    if (f.sea) h += '<div class="row" style="flex-wrap:nowrap;margin-top:6px"><select id="df_m1">' + MONTH_OPTS(f.m1) + '</select><span>–</span><select id="df_m2">' + MONTH_OPTS(f.m2) + '</select></div>';
    h += '<label class="f">Tür (aynı gün/ardışık tekrarı önlemek için, isteğe bağlı)</label><select id="df_kind"><option value="">Belirtme</option><option value="kofte"' + (f.kind === 'kofte' ? ' selected' : '') + '>Köfte</option><option value="kebap"' + (f.kind === 'kebap' ? ' selected' : '') + '>Kebap</option></select>';
    h += '<div id="dfErr" style="color:var(--bad);font-weight:600;min-height:22px;margin:8px 0"></div><div class="row"><button class="btn" data-act="dfcancel">Vazgeç</button><button class="btn primary" data-act="dfsave">Kaydet</button></div>';
    showSheet(h);
  }
  function dfSave() {
    dfCollect(); var f = dishForm, er = $('#dfErr'), fail = function (m) { er.textContent = m; };
    var name = f.name.trim(); if (!name) return fail('Yemek adı yazın.');
    if (/tavuk|piliç|balık|hindi/i.test(name)) return fail('Menü kuralı: tavuk/balık/hindi içeren yemek eklenemez.');
    var dup = D.REC_LIST.filter(function (r) { return r.id !== f.id && r.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'); })[0];
    if (dup) return fail('Bu adla bir yemek zaten var: ' + dup.name);
    var per = Math.max(1, num(f.per) || 10), ings = [], seen = {};
    for (var i = 0; i < f.rows.length; i++) {
      var rw = f.rows[i]; if (!rw.id && !num(rw.q)) continue;
      if (!rw.id) return fail((i + 1) + '. satırda malzeme seçin.');
      if (!(num(rw.q) > 0)) return fail((D.ING[rw.id] ? D.ING[rw.id].name : 'Malzeme') + ' için miktar yazın.');
      if (seen[rw.id]) return fail(D.ING[rw.id].name + ' iki kez eklenmiş.');
      seen[rw.id] = 1;
      if (/tavuk|piliç|balık|hindi/i.test(D.ING[rw.id].name)) return fail('Menü kuralı: tavuk/balık/hindi malzemesi kullanılamaz.');
      ings.push({ id: rw.id, q: Math.round(num(rw.q) * 10 / per * 100) / 100 });
    }
    if (!ings.length) return fail('En az bir malzeme ekleyin.');
    if (f.cat === 'A' && !seen['dana-kiyma'] && !seen['dana-kusbasi']) return fail('Menü kuralı: ana yemek kıymalı veya kuşbaşı etli olmalı (dana kıyma / dana kuşbaşı ekleyin).');
    var steps = f.steps.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); if (!steps.length) return fail('Yapılışını yazın (en az bir adım).');
    var id = f.id;
    if (!id) { id = 'o-' + D.slug(name); var n = 2, base = id; while (D.REC[id]) id = base + '-' + (n++); }
    store.set('crec:' + id, { name: name, cat: f.cat, tags: f.kind ? [f.kind] : [], season: f.sea ? [f.m1, f.m2] : null, ing: ings, steps: steps });
    applyCustom(); dishForm = null; closeSheet(); toast(f.id ? 'Yemek güncellendi' : 'Yemek eklendi: ' + name); render();
  }

  // ---- kişi sayısı (aşçı), kilit, şifre
  function cookHc(d) { var v = store.get('ck:' + d); return v > 0 ? v : weekHc(C.mondayOf(d)); }
  function isLocked(mon) { return !!store.get('lk:' + mon); }
  function hashPin(p) { var h = 5381, x = 'yemekhane|' + p; for (var i = 0; i < x.length; i++) h = ((h << 5) + h + x.charCodeAt(i)) | 0; return String(h >>> 0); }
  function pinOn() { return !!store.get('set:pin'); }
  /* Yeniden oluşturma: kilitli haftalara ve (istenirse) geçmiş günlere dokunmaz; eski hali geri alınabilsin diye saklanır */
  function regenerate(start, end, ignoreHoliday, skipPast, desc) {
    var seed = (Math.random() * 4294967296) >>> 0;
    var gen = C.generate(start, end, seed, { prev: prevContext(start), ignoreHoliday: !!ignoreHoliday, exclude: exclMap(), includeCustom: true });
    var n = 0, prev = {};
    Object.keys(gen).forEach(function (d) {
      if (isLocked(C.mondayOf(d))) return;
      if (skipPast && d < today) return;
      var old = store.get('menu:' + d); prev[d] = old || 0;
      if (old && old.note) gen[d].note = old.note;
      store.set('menu:' + d, gen[d]); n++;
    });
    if (n) store.set('undo', { ts: Date.now(), desc: desc || 'Menü yeniden oluşturuldu', prev: prev });
    return n;
  }
  function regenPlan(start, end, skipPast) {
    var r = { n: 0, locked: 0, past: 0 };
    for (var d = start; d <= end; d = C.addDays(d, 1)) {
      if (C.dow(d) > 5) continue;
      if (isLocked(C.mondayOf(d))) r.locked++; else if (skipPast && d < today) r.past++; else r.n++;
    }
    return r;
  }
  function doUndo() {
    var u = store.get('undo'); if (!u) return;
    Object.keys(u.prev).forEach(function (d) {
      if (isLocked(C.mondayOf(d))) return;
      if (u.prev[d] === 0) store.del('menu:' + d); else store.set('menu:' + d, u.prev[d]);
    });
    store.del('undo'); toast('İşlem geri alındı'); render();
  }
  /* Onay penceresi: isteğe bağlı yönetici şifresi ve yazılı onay */
  var pendingConfirm = null;
  function confirmSheet(o) {
    pendingConfirm = o;
    var h = '<h2>' + esc(o.title) + '</h2><div class="card" style="background:var(--warn-l);color:#7c2d12">' + o.body + '</div>';
    if (pinOn()) h += '<label class="f">Yönetici şifresi</label><input type="password" id="cfPin" inputmode="numeric" autocomplete="off">';
    if (o.word) h += '<label class="f">Devam etmek için <b>' + esc(o.word) + '</b> yazın</label><input type="text" id="cfWord" autocomplete="off" autocapitalize="characters">';
    h += '<div id="cfErr" style="color:var(--bad);min-height:22px;margin:6px 0;font-weight:600"></div><div class="row"><button class="btn" data-act="cfcancel">Vazgeç</button><button class="btn ' + (o.danger ? 'warn' : 'primary') + '" data-act="cfok">' + esc(o.ok || 'Onayla') + '</button></div>';
    showSheet(h);
  }
  function monthRange(ym) {
    var first = ym + '-01', y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    var ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
    var last = C.addDays(ny + '-' + String(nm).padStart(2, '0') + '-01', -1);
    return [first, last];
  }
  function shiftMonth(ym, n) {
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + String(m + 1).padStart(2, '0');
  }
  function slotLabel(s) { return D.SLOT_LABEL[s] || s; }
  function recName(id) { var r = D.REC[id]; return r ? r.name : '(silinmiş tarif)'; }

  // ------------------------------------------------------------ MENÜ görünümü
  // ---------- aylık takvim
  function cellHtml(d, rng) {
    var day = getDay(d), w = C.dow(d), inM = d >= rng[0] && d <= rng[1];
    if (!inM) return '<div class="cell out"><span class="num">' + (+d.slice(8)) + '</span></div>';
    var cls = 'cell' + (isLocked(C.mondayOf(d)) ? ' lk' : '') + (d === today ? ' today' : '') + (d === st.selDay ? ' sel' : '') + (day && day.combo ? ' sp' + (w === 5 ? ' fri' : '') : '') + (day && day.off ? ' off' : '');
    var brief = '', full = '';
    if (!day) { brief = ''; full = '<span class="muted">—</span>'; }
    else if (day.off) { brief = 'Tatil'; full = '🚫 ' + esc(day.note || 'Yemek yok'); }
    else {
      var by = {}; day.slots.forEach(function (x) { by[x.s] = x.id; });
      brief = esc(recName(day.combo ? day.slots[0].id : by.ana));
      full = (day.combo ? '<b>' + esc(day.combo) + '</b>' : '') + day.slots.map(function (x) { return '<span class="fd ' + x.s + '">' + esc(recName(x.id)) + '</span>'; }).join('');
    }
    return '<button class="' + cls + '" data-act="sel" data-d="' + d + '"><span class="num">' + (+d.slice(8)) + '</span><span class="brief">' + brief + '</span><span class="full">' + full + '</span></button>';
  }
  function pickSelDay(rng) {
    if (st.selDay && st.selDay >= rng[0] && st.selDay <= rng[1]) return;
    var pick = null;
    if (today >= rng[0] && today <= rng[1] && C.dow(today) <= 5) pick = today;
    else for (var d = rng[0]; d <= rng[1]; d = C.addDays(d, 1)) { if (C.dow(d) <= 5 && getDay(d)) { pick = d; break; } }
    st.selDay = pick || rng[0];
  }
  function dayDetail(d) {
    var day = getDay(d), w = C.dow(d), mon = C.mondayOf(d);
    var lk = isLocked(mon);
    var h = '<div class="daycard" id="daycard"><div class="dc-head"><div><div class="dc-title">' + C.GUN[w] + ', ' + C.fmtDate(d, true) + '</div>' +
      (day && day.combo ? '<span class="chip">' + esc(day.combo) + '</span> ' : '') + (lk ? '<span class="chip lock">🔒 Hafta onaylı</span>' : '') + '</div><button class="btn sm primary" data-act="day" data-d="' + d + '">' + (lk ? '👁 Görüntüle' : '✏️ Düzenle') + '</button></div>';
    if (!day) h += '<div class="empty">Bu gün için menü yok.</div>';
    else if (day.off) h += '<div class="empty">🚫 Yemek yok' + (day.note ? ' — ' + esc(day.note) : '') + '</div>';
    else {
      h += '<div class="lgroup">' + day.slots.map(function (x) {
        return '<button class="lrow ' + x.s + '" data-act="recipe" data-id="' + x.id + '"><em class="dot"></em><span class="grow">' + esc(recName(x.id)) + '</span><i>›</i></button>';
      }).join('') + '</div>' + (day.note ? '<div class="muted" style="margin:6px 4px">📝 ' + esc(day.note) + '</div>' : '');
    }
    h += '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="goshop" data-w="' + mon + '">🛒 Haftanın alışverişi</button><button class="btn sm" data-act="gorec" data-w="' + mon + '">📖 Haftanın tarifleri</button><button class="btn sm" data-act="wregen" data-w="' + mon + '"' + (lk ? ' disabled' : '') + '>🔄 Haftayı yenile</button>' +
      (lk ? '<button class="btn sm" data-act="unlock" data-w="' + mon + '">🔓 Kilidi aç</button>' : '<button class="btn sm primary" data-act="lock" data-w="' + mon + '">🔒 Haftayı onayla ve kilitle</button>') + '</div>' +
      '<div class="muted" style="margin-top:6px;font-size:.82rem">' + (lk ? 'Bu hafta onaylandı: menü ve alışveriş kişi sayısı sabit, yeniden oluşturma bu haftaya dokunamaz.' : 'Menüyü kesinleştirince kilitleyin; böylece kimse yanlışlıkla değiştiremez.') + '</div></div>';
    return h;
  }

  function viewMenu() {
    var rng = monthRange(st.month), y = st.month.slice(0, 4), m = +st.month.slice(5, 7);
    pickSelDay(rng);
    var h = '';
    var u = store.get('undo');
    if (u && Date.now() - u.ts < 10 * 60 * 1000) h += '<div class="undobar"><span class="grow">↶ ' + esc(u.desc) + '</span><button class="btn sm" data-act="undo">Geri al</button></div>';
    h += '<div class="lt-row"><h1 class="large">' + C.AY[m] + ' <span class="yr">' + y + '</span></h1><div class="row" style="flex-wrap:nowrap"><button class="btn iconbtn" data-act="mprev" aria-label="Önceki ay">‹</button><button class="btn iconbtn" data-act="mnext" aria-label="Sonraki ay">›</button></div></div>';
    h += '<div class="toolbar"><button class="btn sm" data-act="mtoday">Bugün</button><button class="btn sm" data-act="myear">📆 Yıllık liste</button><button class="btn sm" data-act="mregen">🔄 Ayı yeniden oluştur</button><button class="btn sm" data-act="print">🖨️ Yazdır</button></div>';
    h += '<div class="cal"><div class="dow">Pzt</div><div class="dow">Sal</div><div class="dow">Çar</div><div class="dow">Per</div><div class="dow">Cum</div>';
    var any = false;
    for (var mon = C.mondayOf(rng[0]); mon <= rng[1]; mon = C.addDays(mon, 7)) {
      var cells = [], has = false;
      for (var i = 0; i < 5; i++) { var d = C.addDays(mon, i); if (d >= rng[0] && d <= rng[1]) has = true; cells.push(cellHtml(d, rng)); }
      if (has) { h += cells.join(''); any = true; }
    }
    h += '</div>';
    if (!any) h += '<div class="empty">Bu ay için gün yok.</div>';
    h += dayDetail(st.selDay);
    return h;
  }

  function viewRecipePage(pg) {
    var r = D.REC[pg.id]; if (!r) return '<div class="empty">Tarif bulunamadı.</div>';
    var hc = pg.hc || defaultHc();
    var h = '<h1 class="large">' + esc(r.name) + '</h1><div class="row" style="margin-bottom:12px"><span class="chip gray">' + esc(D.CAT_NAME[r.cat]) + '</span>' +
      '<span class="stepper"><button class="btn sm iconbtn" data-act="rhc-">−</button><input type="number" min="1" value="' + hc + '" data-chg="rhc"><button class="btn sm iconbtn" data-act="rhc+">+</button></span><span class="muted">kişilik</span></div>';
    h += '<h3>Malzemeler</h3><div class="lgroup">' + r.ing.map(function (x) {
      var g = ing(x.id); return '<div class="lrow static"><span class="grow">' + esc(g.name) + '</span><b>' + C.fmtQty(C.niceRound(C.scale(x.q, hc), g.unit), g.unit) + '</b></div>';
    }).join('') + '</div>';
    h += '<h3>Yapılışı</h3><div class="lgroup">' + r.steps.map(function (s, i) { return '<div class="lrow static step"><span class="stepno">' + (i + 1) + '</span><span class="grow">' + esc(s) + '</span></div>'; }).join('') + '</div>';
    if (r.season) h += '<p class="muted">Sezon: ' + C.AY[r.season[0]] + ' – ' + C.AY[r.season[1]] + '</p>';
    return h;
  }

  function viewYear() {
    var y = st.year, h = '<div class="lt-row"><h1 class="large">' + y + ' Listesi</h1><div class="row" style="flex-wrap:nowrap"><button class="btn iconbtn" data-act="yprev">‹</button><button class="btn iconbtn" data-act="ynext">›</button></div></div>' +
      '<div class="toolbar"><button class="btn sm" data-act="csv">⬇️ Excel/CSV indir</button><button class="btn sm" data-act="print">🖨️ Yazdır</button></div>';
    for (var m = 1; m <= 12; m++) {
      var ym = y + '-' + String(m).padStart(2, '0'), rng = monthRange(ym);
      h += '<h3>' + C.AY[m] + ' ' + y + '</h3><div class="card" style="overflow:auto;padding:6px"><table class="ingtable" style="min-width:680px"><tr><td><b>Gün</b></td><td style="text-align:left"><b>Çorba</b></td><td style="text-align:left"><b>Ana Yemek</b></td><td style="text-align:left"><b>Pilav / Makarna</b></td><td style="text-align:left"><b>Salata</b></td><td style="text-align:left"><b>Tatlı</b></td></tr>';
      for (var d = rng[0]; d <= rng[1]; d = C.addDays(d, 1)) {
        var w = C.dow(d); if (w > 5) continue; var day = getDay(d);
        var lab = '<td style="text-align:left;font-weight:600;white-space:nowrap">' + C.GUN[w].slice(0, 3) + ' ' + (+d.slice(8)) + '</td>';
        if (!day) h += '<tr>' + lab + '<td colspan="5" style="text-align:left" class="muted">—</td></tr>';
        else if (day.off) h += '<tr>' + lab + '<td colspan="5" style="text-align:left" class="muted">🚫 ' + esc(day.note || 'Yemek yok') + '</td></tr>';
        else if (day.combo) h += '<tr>' + lab + '<td colspan="5" style="text-align:left"><b>' + esc(day.combo) + ':</b> ' + day.slots.map(function (x) { return esc(recName(x.id)); }).join(', ') + '</td></tr>';
        else {
          var by = {}; day.slots.forEach(function (x) { by[x.s] = x.id; });
          h += '<tr>' + lab + ['corba', 'ana', 'ikinci', 'salata', 'tatli'].map(function (s) { return '<td style="text-align:left;font-weight:500">' + esc(recName(by[s])) + '</td>'; }).join('') + '</tr>';
        }
      }
      h += '</table></div>';
    }
    return h;
  }

  function csvYear(y) {
    var rows = [['Tarih', 'Gün', 'Tür', 'Çorba', 'Ana Yemek', 'Pilav/Makarna', 'Salata', 'Tatlı', 'Özel menü']];
    for (var d = y + '-01-01'; d <= y + '-12-31'; d = C.addDays(d, 1)) {
      var w = C.dow(d); if (w > 5) continue; var day = getDay(d);
      if (!day) continue;
      if (day.off) { rows.push([d, C.GUN[w], 'Yemek yok', '', '', '', '', '', day.note || '']); continue; }
      if (day.combo) { rows.push([d, C.GUN[w], day.combo, '', '', '', '', '', day.slots.map(function (x) { return recName(x.id); }).join(' + ')]); continue; }
      var by = {}; day.slots.forEach(function (x) { by[x.s] = recName(x.id); });
      rows.push([d, C.GUN[w], 'Normal', by.corba, by.ana, by.ikinci, by.salata, by.tatli, '']);
    }
    return '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
  }
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- gün düzenleme penceresi
  function recOptions(cats, selected, season) {
    var m = season ? C.monthOf(season) : 0;
    var html = '';
    cats.forEach(function (c) {
      var list = D.REC_LIST.filter(function (r) { return r.cat === c; }).sort(function (a, b) { return tr(a.name, b.name); });
      var opts = list.map(function (r) {
        var off = m && !D.inSeason(r, m) ? ' (sezon dışı)' : '';
        return '<option value="' + r.id + '"' + (r.id === selected ? ' selected' : '') + '>' + esc(r.name + off) + '</option>';
      }).join('');
      html += cats.length > 1 ? '<optgroup label="' + esc(D.CAT_NAME[c]) + '">' + opts + '</optgroup>' : opts;
    });
    return html;
  }
  var CAT_OF_SLOT = { corba: 'C', ana: 'A', ikinci: 'P', salata: 'S', tatli: 'T' };

  var sheetDay = null;
  function openDay(d) {
    sheetDay = d;
    var day = getDay(d), w = C.dow(d), h = '';
    if (isLocked(C.mondayOf(d))) {
      h += '<div class="row spread"><h2>' + C.GUN[w] + ', ' + C.fmtDate(d, true) + '</h2><button class="btn sm" data-act="close">Kapat ✕</button></div><div class="card" style="background:#eef2ff;color:#312e81">🔒 Bu hafta onaylı olduğu için değiştirilemez. Değiştirmek için önce menüdeki “Kilidi aç”ı kullanın.</div>';
      if (day && !day.off && day.slots) h += '<div class="lgroup">' + day.slots.map(function (x) { return '<div class="lrow static"><em class="dot"></em><span class="grow">' + esc(recName(x.id)) + '</span></div>'; }).join('') + '</div>';
      showSheet(h); return;
    }
    h += '<div class="row spread"><h2>' + C.GUN[w] + ', ' + C.fmtDate(d, true) + '</h2><button class="btn sm" data-act="close">Kapat ✕</button></div>';
    h += '<label class="row" style="margin:6px 0"><input type="checkbox" id="dOff" ' + ((day && day.off) ? 'checked' : '') + ' style="width:22px;height:22px"> <b>Bu gün yemek yok</b> (tatil / izin)</label>';
    if (!day || day.off) {
      h += '<label class="f">Not (isteğe bağlı)</label><input type="text" id="dNote" value="' + esc(day && day.note || '') + '" placeholder="Örn: Resmi tatil">';
      h += '<div class="row" style="margin-top:10px">' + (day && day.off ? '' : '') + '</div>';
    } else if (!day.combo) {
      day.slots.forEach(function (x, i) {
        h += '<div class="slotrow"><label>' + esc(slotLabel(x.s)) + '</label><select data-chg="dslot" data-i="' + i + '" data-d="' + d + '">' + recOptions([CAT_OF_SLOT[x.s]], x.id, d) + '</select></div>';
      });
    } else {
      h += '<div class="slotrow"><label>Menü paketi</label><select data-chg="dcombo" data-d="' + d + '"><option value="">Başka bir paket seç…</option>' +
        (w === 5 ? D.FRI : D.WED).map(function (c) { return '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>'; }).join('') + '</select></div>';
      h += '<div class="muted" style="margin:6px 0 2px">Şu an: <b>' + esc(day.combo) + '</b></div>';
      day.slots.forEach(function (x, i) {
        h += '<div class="slotrow row" style="flex-wrap:nowrap"><select class="grow" data-chg="dslot" data-i="' + i + '" data-d="' + d + '">' + recOptions(['F', 'K', 'S', 'T', 'C', 'A', 'P'], x.id) + '</select>' +
          '<button class="btn sm danger" data-act="ditemdel" data-i="' + i + '" data-d="' + d + '">✕</button></div>';
      });
      h += '<div class="slotrow"><select data-chg="ditemadd" data-d="' + d + '"><option value="">＋ Yemek ekle…</option>' + recOptions(['F', 'K', 'S', 'T', 'C', 'A', 'P'], '') + '</select></div>';
    }
    if (day && !day.off) h += '<label class="f">Not</label><input type="text" id="dNote" value="' + esc(day.note || '') + '" placeholder="Örn: Misafir var, 40 kişi">';
    h += '<div class="row" style="margin-top:14px">';
    if (!day || day.off) h += '<button class="btn primary" data-act="dgen" data-d="' + d + '">✨ Bu gün için menü oluştur</button>';
    else h += '<button class="btn" data-act="dshuffle" data-d="' + d + '">🔄 Bu günü yeniden oluştur</button>';
    if (store.has('menu:' + d)) h += '<button class="btn" data-act="dreset" data-d="' + d + '">↩︎ Önerilene dön</button>';
    h += '<button class="btn primary" data-act="dsave" data-d="' + d + '">Tamam</button></div>';
    showSheet(h);
  }
  function showSheet(html) { var s = $('#sheet'); s.innerHTML = '<div class="panel">' + html + '</div>'; s.hidden = false; }
  function closeSheet() { var s = $('#sheet'); s.hidden = true; s.innerHTML = ''; }

  function saveDayNote(d) {
    var el = $('#dNote'); if (!el) return;
    var day = getDay(d); if (!day) return;
    var o = clone(day); if (el.value.trim()) o.note = el.value.trim(); else delete o.note;
    if (JSON.stringify(o) !== JSON.stringify(day)) store.set('menu:' + d, o);
  }

  // ------------------------------------------------------------ ALIŞVERİŞ
  function shopData(mon) {
    var hc = weekHc(mon), need = C.weekNeed(getDay, mon, hc), buy = [], have = [], covered = [];
    Object.keys(need).forEach(function (id) {
      var g = ing(id); if (!g) return;
      var n = need[id].need, sa = stockAmt(id), x = store.get('wk:' + mon + ':x:' + id);
      var rem = Math.max(0, n - sa);
      var eps = (g.unit === 'adet' || g.unit === 'demet') ? 0.01 : 5;
      var it = { id: id, ing: g, need: n, stock: sa, rem: rem, buy: C.buyRound(rem, g.unit), uses: need[id].uses, bought: !!store.get('wk:' + mon + ':b:' + id), x: x };
      if (x === 'have' || x === 'out') have.push(it); else if (rem <= eps) covered.push(it); else buy.push(it);
    });
    var ex = store.keys('wk:' + mon + ':ex:').map(function (k) { var v = store.get(k); v.id = k.slice(('wk:' + mon + ':ex:').length); return v; });
    var days = 0; for (var i = 0; i < 5; i++) { var dd = getDay(C.addDays(mon, i)); if (dd && !dd.off && dd.slots) days++; }
    return { hc: hc, buy: buy, have: have, covered: covered, extras: ex, days: days };
  }
  function groupByCat(items) {
    var g = {}; items.forEach(function (it) { (g[it.ing.cat] = g[it.ing.cat] || []).push(it); });
    return Object.keys(D.CATS).filter(function (c) { return g[c]; }).map(function (c) {
      return { cat: c, items: g[c].sort(function (a, b) { return tr(a.ing.name, b.ing.name); }) };
    });
  }
  function usesText(it) {
    var by = {}; it.uses.forEach(function (u) { var k = C.GUN[C.dow(u.date)].slice(0, 3) + ': ' + u.recipe; by[k] = (by[k] || 0) + u.q; });
    return Object.keys(by).map(function (k) { return k + ' (' + C.fmtQty(C.niceRound(by[k], it.ing.unit), it.ing.unit) + ')'; }).join(' • ');
  }
  function hcBox(mon) {
    var hc = weekHc(mon), has = store.has('wk:' + mon + ':hc'), lk = isLocked(mon) ? ' disabled' : '';
    return '<span class="stepper noprint"><button class="btn sm iconbtn" data-act="hc-" data-w="' + mon + '"' + lk + '>−</button><input type="number" min="1" inputmode="numeric" value="' + hc + '" data-chg="hc" data-w="' + mon + '" aria-label="Alışveriş kişi sayısı"' + lk + '><button class="btn sm iconbtn" data-act="hc+" data-w="' + mon + '"' + lk + '>+</button></span> <span class="muted">kişilik alışveriş' + (has ? ' (bu hafta özel)' : '') + (lk ? ' 🔒' : '') + '</span>';
  }
  function cookBox(d) {
    var hc = cookHc(d), has = store.has('ck:' + d);
    return '<div class="cookbox noprint"><span class="ck-l">👨‍🍳 Bu gün kaç kişilik yemek yapılacak?</span><span class="stepper"><button class="btn sm iconbtn" data-act="chc-" data-d="' + d + '">−</button><input type="number" min="1" inputmode="numeric" value="' + hc + '" data-chg="chc" data-d="' + d + '" aria-label="Günlük kişi sayısı"><button class="btn sm iconbtn" data-act="chc+" data-d="' + d + '">+</button></span>' +
      (has ? '<button class="btn sm" data-act="chcreset" data-d="' + d + '">↩︎ ' + weekHc(C.mondayOf(d)) + ' kişiye dön</button>' : '') + '</div>';
  }
  function itemRow(it, mon, mode) {
    var key = 'i:' + mon + ':' + it.id, open = st.open[key] ? ' open' : '';
    var q = mode === 'buy' ? C.fmtQty(it.buy, it.ing.unit) : (mode === 'covered' ? 'Stokta' : '—');
    var detail = 'İhtiyaç: <b>' + C.fmtQty(C.niceRound(it.need, it.ing.unit), it.ing.unit) + '</b> • Stok: <b>' + C.fmtQty(it.stock, it.ing.unit) + '</b>' + (mode === 'buy' ? ' • Alınacak: <b>' + C.fmtQty(it.buy, it.ing.unit) + '</b>' : '') + '<br>' + esc(usesText(it));
    var acts = '';
    if (mode === 'buy') acts = '<button class="btn sm" data-act="xhave" data-w="' + mon + '" data-id="' + it.id + '">✔ Elimizde var</button><button class="btn sm" data-act="xout" data-w="' + mon + '" data-id="' + it.id + '">✕ Gerek yok</button><button class="btn sm" data-act="tostock" data-id="' + it.id + '">📦 Stoğa git</button>';
    else acts = '<button class="btn sm" data-act="xundo" data-w="' + mon + '" data-id="' + it.id + '">↩︎ Listeye geri al</button>';
    var sub = mode === 'have' ? (it.x === 'have' ? 'Elimizde var — listeden çıkarıldı' : 'Bu hafta gerekmiyor — listeden çıkarıldı') : (mode === 'covered' ? 'İhtiyaç ' + C.fmtQty(C.niceRound(it.need, it.ing.unit), it.ing.unit) + ', stokta ' + C.fmtQty(it.stock, it.ing.unit) : 'Menüde ' + it.uses.length + ' yerde kullanılıyor');
    return '<div class="item' + open + (mode === 'buy' && it.bought ? ' done' : '') + '" data-act="iopen" data-key="' + key + '">' +
      (mode === 'buy' ? '<input class="chk" type="checkbox" ' + (it.bought ? 'checked' : '') + ' data-chg="bought" data-w="' + mon + '" data-id="' + it.id + '" aria-label="Alındı">' : '') +
      '<div class="grow"><div class="name">' + esc(it.ing.name) + '</div><div class="sub">' + esc(sub) + '</div>' +
      '<div class="detail">' + detail + '</div><div class="acts">' + acts + '</div></div><div class="qty">' + q + '</div></div>';
  }
  function viewShop() {
    var mon = st.week, data = shopData(mon), h = '<h1 class="large">Alışveriş</h1>';
    h += '<div class="pager"><button class="btn iconbtn" data-act="wprev">◀</button><div class="title">' + C.isoWeekLabel(mon) + '</div><button class="btn iconbtn" data-act="wnext">▶</button></div>';
    h += '<div class="toolbar"><button class="btn sm" data-act="wtoday">Bu hafta</button>' + hcBox(mon) + '</div>';
    if (!data.days) { return h + '<div class="empty card">Bu haftada yemek yok (menü boş veya tatil).</div>'; }
    var boughtN = data.buy.filter(function (i) { return i.bought; }).length;
    h += '<div class="stat"><span class="box">' + data.days + ' yemek günü</span><span class="box">' + data.buy.length + ' kalem alınacak</span><span class="box">' + boughtN + ' alındı</span>' +
      (data.covered.length + data.have.length ? '<span class="box" style="background:#eee;color:#555">' + (data.covered.length + data.have.length) + ' kalem listeden çıktı</span>' : '') + '</div>';
    h += '<div class="toolbar noprint"><button class="btn sm primary" data-act="wa">📲 WhatsApp / Paylaş</button><button class="btn sm" data-act="copy">📋 Kopyala</button><button class="btn sm" data-act="print">🖨️ Yazdır</button></div>';
    if (!data.buy.length) h += '<div class="card empty">Alınacak malzeme kalmadı 🎉</div>';
    groupByCat(data.buy).forEach(function (g) {
      h += '<div class="card group"><h3>' + esc(D.CATS[g.cat]) + ' <small>' + g.items.length + ' kalem</small></h3>' + g.items.map(function (it) { return itemRow(it, mon, 'buy'); }).join('') + '</div>';
    });
    // ekstra
    h += '<div class="card group"><h3>Ekstra ürünler <small>(listeye kendin ekle)</small></h3>' +
      data.extras.map(function (e) {
        return '<div class="item' + (e.b ? ' done' : '') + '"><input class="chk" type="checkbox" ' + (e.b ? 'checked' : '') + ' data-chg="exbought" data-w="' + mon + '" data-id="' + e.id + '"><div class="grow"><div class="name">' + esc(e.n) + '</div></div><div class="qty">' + (e.a ? esc(e.a) + ' ' + esc(e.u || '') : '') + '</div><button class="btn sm danger noprint" data-act="exdel" data-w="' + mon + '" data-id="' + e.id + '">✕</button></div>';
      }).join('') +
      '<div class="row noprint" style="margin-top:8px;flex-wrap:nowrap"><input type="text" id="exName" placeholder="Ürün (örn. peçete)" style="flex:2"><input type="text" id="exAmt" placeholder="Miktar" style="flex:1" inputmode="decimal"><input type="text" id="exUnit" placeholder="Birim" style="flex:1;max-width:90px"><button class="btn primary iconbtn" data-act="exadd" data-w="' + mon + '">＋</button></div></div>';
    if (data.covered.length) h += '<details class="card collapsible"><summary>Stoktan karşılananlar (' + data.covered.length + ')</summary>' + groupByCat(data.covered).map(function (g) { return g.items.map(function (it) { return itemRow(it, mon, 'covered'); }).join(''); }).join('') + '</details>';
    if (data.have.length) h += '<details class="card collapsible" open><summary>Listeden çıkardıklarım (' + data.have.length + ')</summary>' + groupByCat(data.have).map(function (g) { return g.items.map(function (it) { return itemRow(it, mon, 'have'); }).join(''); }).join('') + '</details>';
    var closed = store.get('wk:' + mon + ':closed');
    h += '<div class="card noprint"><h3>Stok işlemleri</h3><p class="muted" style="margin:.2rem 0 .6rem">Alışverişten gelince işaretlediklerinizi stoğa ekleyin; hafta bitince kullanılanı stoktan düşün. Böylece sonraki haftaların listesi otomatik küçülür.</p>' +
      '<div class="row"><button class="btn" data-act="addstock" data-w="' + mon + '"' + (boughtN ? '' : ' disabled') + '>📥 Alınanları stoğa ekle (' + boughtN + ')</button>' +
      '<button class="btn warn" data-act="closeweek" data-w="' + mon + '"' + (closed ? ' disabled' : '') + '>' + (closed ? '✓ Hafta kapatıldı' : '📤 Haftayı kapat – kullanılanı stoktan düş') + '</button></div></div>';
    return h;
  }
  function shopText(mon) {
    var data = shopData(mon), lines = ['🛒 Alışveriş listesi', C.isoWeekLabel(mon) + ' • ' + data.hc + ' kişi', ''];
    groupByCat(data.buy.filter(function (i) { return !i.bought; })).forEach(function (g) {
      lines.push('*' + D.CATS[g.cat] + '*');
      g.items.forEach(function (it) { lines.push('• ' + it.ing.name + ': ' + C.fmtQty(it.buy, it.ing.unit)); });
      lines.push('');
    });
    var ex = data.extras.filter(function (e) { return !e.b; });
    if (ex.length) { lines.push('*Ekstra*'); ex.forEach(function (e) { lines.push('• ' + e.n + (e.a ? ': ' + e.a + ' ' + (e.u || '') : '')); }); }
    return lines.join('\n').trim();
  }

  // ------------------------------------------------------------ TARİFLER
  function recipeCard(r, hc, open) {
    var rows = r.ing.map(function (x) {
      var g = ing(x.id); var q = C.niceRound(C.scale(x.q, hc), g.unit);
      return '<tr><td>' + esc(g.name) + '</td><td>' + C.fmtQty(q, g.unit) + '</td></tr>';
    }).join('');
    return '<details class="recipe"' + (open ? ' open' : '') + '><summary><span class="chip gray">' + esc(D.CAT_NAME[r.cat]) + '</span> ' + esc(r.name) + '</summary><div class="body">' +
      '<div><b>Malzemeler</b> <small>(' + hc + ' kişilik)</small><table class="ingtable">' + rows + '</table></div>' +
      '<div><b>Yapılışı</b><ol>' + r.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      (r.season ? '<small class="muted">Sezon: ' + C.AY[r.season[0]] + ' – ' + C.AY[r.season[1]] + '</small>' : '') + '</div></div></details>';
  }
  function dishesBody() {
    var q = (st.dq || '').trim().toLocaleLowerCase('tr'), ex = exclMap(), total = 0, h = '';
    var order = ['C', 'A', 'P', 'S', 'T', 'F', 'K'];
    var cnt = order.map(function (c) { return D.REC_LIST.filter(function (r) { return r.cat === c; }).length; });
    D.REC_LIST.forEach(function () { total++; });
    h += '<div class="toolbar noprint"><button class="btn sm primary" data-act="newdish">＋ Yeni yemek ekle</button><button class="btn sm" data-act="print">🖨️ Yazdır</button></div>';
    h += '<div class="row noprint" style="margin-bottom:8px"><input type="search" id="dq" placeholder="Yemek ara…" value="' + esc(st.dq || '') + '" data-chg="dq" style="flex:1;min-width:200px"></div>';
    var bx = function (c, label, n) { var on = (st.dcat || '') === c; return '<button class="box dcat' + (on ? ' on' : '') + '" data-act="dcat" data-c="' + c + '" style="border:0;cursor:pointer;font:inherit;' + (on ? 'background:#14507a;color:#fff' : 'background:#eef2f6;color:#334155') + '">' + esc(label) + ' ' + n + '</button>'; };
    h += '<div class="stat" style="flex-wrap:wrap;gap:6px">' + bx('', 'Tümü', total) + order.map(function (c, i) { return bx(c, D.CAT_NAME[c].split(' ')[0], cnt[i]); }).join('') + (Object.keys(ex).length ? '<span class="box" style="background:#fff1e2;color:#b45309">' + Object.keys(ex).length + ' yemek menüde kullanılmıyor</span>' : '') + '</div>';
    order.forEach(function (c) {
      if (st.dcat && st.dcat !== c) return;
      var list = D.REC_LIST.filter(function (r) { return r.cat === c && (!q || r.name.toLocaleLowerCase('tr').indexOf(q) >= 0); }).sort(function (a, b) { return tr(a.name, b.name); });
      if (!list.length) return;
      h += '<div class="card group"><h3>' + esc(D.CAT_NAME[c]) + ' <small>' + list.length + ' yemek</small></h3>' + list.map(function (r) {
        var key = 'd:' + r.id, open = st.open[key] ? ' open' : '', isEx = !!ex[r.id];
        var sub = (r.season ? 'Sezon: ' + C.AY[r.season[0]] + ' – ' + C.AY[r.season[1]] + ' • ' : '') + r.ing.length + ' malzeme';
        var acts = '<button class="btn sm" data-act="recipe" data-id="' + r.id + '">📖 Tarif</button>' +
          ('CAPST'.indexOf(c) >= 0 ? '<button class="btn sm' + (isEx ? ' warn' : '') + '" data-act="exdish" data-id="' + r.id + '">' + (isEx ? '✓ Menüde tekrar kullan' : '🚫 Menüde kullanma') + '</button>' : '') +
          (r.custom ? '<button class="btn sm" data-act="editdish" data-id="' + r.id + '">✏️ Düzenle</button><button class="btn sm danger" data-act="deldish" data-id="' + r.id + '">🗑 Sil</button>' : '');
        return '<div class="item' + open + '" data-act="iopen" data-key="' + key + '"><div class="grow"><div class="name">' + esc(r.name) + (r.custom ? ' <span class="chip">Özel</span>' : '') + (isEx ? ' <span class="chip warn">Menüde yok</span>' : '') + '</div><div class="sub">' + esc(sub) + '</div><div class="acts">' + acts + '</div></div></div>';
      }).join('') + '</div>';
    });
    if (!h.match(/class="card group"/)) h += '<div class="empty">Sonuç yok.</div>';
    h += '<p class="muted" style="text-align:center">Bir yemeğe dokunarak tarifini açabilir, menüde kullanılıp kullanılmayacağını ayarlayabilirsiniz. “Menüde kullanma” seçilen yemek, yeniden oluşturulan menülere girmez; mevcut menüler değişmez.</p>';
    return h;
  }
  function viewRecipes() {
    var h = '<h1 class="large">Tarifler</h1><div class="toolbar"><div class="seg"><button data-act="tmode" data-m="hafta" class="' + (st.tarifMode === 'hafta' ? 'on' : '') + '">Bu haftanın tarifleri</button><button data-act="tmode" data-m="tum" class="' + (st.tarifMode === 'tum' ? 'on' : '') + '">Tüm tarifler</button><button data-act="tmode" data-m="liste" class="' + (st.tarifMode === 'liste' ? 'on' : '') + '">Yemek listesi</button></div></div>';
    if (st.tarifMode === 'liste') return h + dishesBody();
    if (st.tarifMode === 'tum') {
      var hc = defaultHc();
      h += '<div class="row noprint" style="margin-bottom:8px"><input type="search" id="rq" placeholder="Tarif ara… (örn. köfte, mantar)" value="' + esc(st.q) + '" data-chg="rq" style="flex:1;min-width:200px"></div>';
      h += '<div class="row noprint" style="margin-bottom:8px"><button class="chip ' + (st.cat ? 'gray' : '') + '" data-act="rcat" data-c="">Hepsi</button>' +
        Object.keys(D.CAT_NAME).map(function (c) { return '<button class="chip ' + (st.cat === c ? '' : 'gray') + '" data-act="rcat" data-c="' + c + '" style="border:0;cursor:pointer">' + esc(D.CAT_NAME[c]) + '</button>'; }).join('') + '</div>';
      var q = st.q.trim().toLocaleLowerCase('tr');
      var list = D.REC_LIST.filter(function (r) { return (!st.cat || r.cat === st.cat) && (!q || r.name.toLocaleLowerCase('tr').indexOf(q) >= 0 || r.ing.some(function (x) { return ing(x.id).name.toLocaleLowerCase('tr').indexOf(q) >= 0; })); })
        .sort(function (a, b) { return a.cat === b.cat ? tr(a.name, b.name) : (a.cat < b.cat ? -1 : 1); });
      h += '<p class="muted">' + list.length + ' tarif • miktarlar ' + hc + ' kişilik (Ayarlar’dan değişir)</p>';
      return h + (list.length ? list.map(function (r) { return recipeCard(r, hc, false); }).join('') : '<div class="empty">Sonuç yok.</div>');
    }
    var mon = st.week, hc2 = weekHc(mon);
    h = '<div class="pager"><button class="btn iconbtn" data-act="wprev">◀</button><div class="title">' + C.isoWeekLabel(mon) + '</div><button class="btn iconbtn" data-act="wnext">▶</button></div>' + h;
    h += '<div class="toolbar">' + hcBox(mon) + '<button class="btn sm" data-act="wtoday">Bu hafta</button><button class="btn sm" data-act="printrec">🖨️ Yazdır</button></div>';
    h += '<p class="muted noprint" style="margin:0 2px 8px">Yukarıdaki sayı <b>alışveriş</b> içindir. Her günün altından aşçı, o gün gerçekte kaç kişiye yemek yapılacaksa onu seçer; tarif miktarları ona göre değişir, alışveriş listesi etkilenmez.</p>';
    var any = false;
    for (var i = 0; i < 5; i++) {
      var d = C.addDays(mon, i), day = getDay(d); if (!day || day.off || !day.slots) continue; any = true;
      h += '<div class="dayhead">' + C.GUN[C.dow(d)] + ' – ' + C.fmtDate(d) + (day.combo ? ' • ' + esc(day.combo) : '') + ' <span class="chip">' + cookHc(d) + ' kişilik</span></div>' + cookBox(d);
      h += day.slots.map(function (x) { var r = D.REC[x.id]; return r ? recipeCard(r, cookHc(d), false) : ''; }).join('');
    }
    if (!any) h += '<div class="empty card">Bu hafta için menü yok.</div>';
    return h;
  }

  // ------------------------------------------------------------ STOK
  function unitMode(g, a) {
    var m = st.su[g.id]; if (m) return m;
    if (g.unit === 'g') return (a >= 1000 || (a === 0 && g.cat !== 'BAH' && g.cat !== 'KUR')) ? 'kg' : 'g';
    if (g.unit === 'ml') return (a >= 1000 || a === 0) ? 'lt' : 'ml';
    return g.unit;
  }
  var FACTOR = { kg: 1000, g: 1, lt: 1000, ml: 1, adet: 1, demet: 1 };
  function stockRow(g) {
    var a = stockAmt(g.id), m = stockMin(g.id), mode = unitMode(g, a), f = FACTOR[mode];
    var low = m > 0 && a < m, key = 's:' + g.id;
    var val = C.trimNum(Math.round(a / f * 1000) / 1000);
    var toggle = (g.unit === 'g' || g.unit === 'ml') ? '<button class="u" data-act="sunit" data-id="' + g.id + '" title="Birimi değiştir">' + mode + '</button>' : '<span class="u" style="padding:6px 8px">' + mode + '</span>';
    return '<div class="srow' + (low ? ' low' : '') + (st.open[key] ? ' open' : '') + '" data-srow="' + g.id + '"><div><div class="nm" data-act="smore" data-id="' + g.id + '">' + esc(g.name) + (low ? ' ⚠️' : '') + (g.custom ? ' <span class="chip gray">özel</span>' : '') + '</div><small class="muted">' + (a > 0 ? C.fmtQty(a, g.unit) : 'stokta yok') + (m > 0 ? ' • asgari ' + C.fmtQty(m, g.unit) : '') + '</small></div>' +
      '<div class="ctl"><button class="btn sm iconbtn" data-act="sstep" data-dir="-1" data-id="' + g.id + '">−</button><input type="text" inputmode="decimal" value="' + val + '" data-chg="sset" data-id="' + g.id + '" aria-label="' + esc(g.name) + ' miktarı">' + toggle + '<button class="btn sm iconbtn" data-act="sstep" data-dir="1" data-id="' + g.id + '">+</button></div>' +
      '<div class="more"><span>Asgari stok (uyarı):</span><input type="text" inputmode="decimal" value="' + C.trimNum(Math.round(m / f * 1000) / 1000) + '" data-chg="smin" data-id="' + g.id + '"> <span>' + mode + '</span>' + (g.custom ? '<button class="btn sm danger" data-act="sdelitem" data-id="' + g.id + '">Ürünü sil</button>' : '') + '</div></div>';
  }
  // ---- stoğa göre menü önerisi
  var sgHc = 0;
  function suggestSheet() {
    var hc = sgHc || defaultHc(), ex = exclMap(), anyStock = allIngs().some(function (g) { return stockAmt(g.id) > 0; });
    var h = '<div class="row spread"><h2>🍽️ Stoğa göre menü önerisi</h2><button class="btn sm" data-act="dfcancel">Kapat ✕</button></div>';
    if (!anyStock) return showSheet(h + '<p class="muted">Önce Stok sekmesinde elinizdeki malzemeleri girin; sonra buradan öneri alabilirsiniz.</p>');
    h += '<div class="row" style="align-items:center;margin:6px 0"><span>Kaç kişilik?</span><button class="btn sm" data-act="sgh-">−</button><b style="min-width:30px;text-align:center">' + hc + '</b><button class="btn sm" data-act="sgh+">＋</button></div>';
    h += '<p class="muted" style="margin:.2rem 0 .6rem">Her kategoride, elinizdeki stokla en çok karşılanan yemekler üstte. Eksik malzemeler yazılır.</p>';
    var sc = function (r) {
      var miss = [], have = 0;
      r.ing.forEach(function (x) { var g = ing(x.id), need = C.scale(x.q, hc), a = stockAmt(x.id); if (a >= need - 1e-6) have++; else miss.push(g.name + (a > 0 ? ' (' + C.fmtQty(C.niceRound(need - a, g.unit), g.unit) + ' eksik)' : '')); });
      return { r: r, have: have, n: r.ing.length, miss: miss, frac: r.ing.length ? have / r.ing.length : 0 };
    };
    var best = [];
    ['C', 'A', 'P', 'S', 'T'].forEach(function (c) {
      var list = D.REC_LIST.filter(function (r) { return r.cat === c && !ex[r.id]; }).map(sc).filter(function (x) { return x.have > 0; })
        .sort(function (a, b) { return b.frac - a.frac || b.have - a.have || tr(a.r.name, b.r.name); }).slice(0, 5);
      if (!list.length) return;
      best.push(list[0]);
      h += '<div class="card group"><h3>' + esc(D.CAT_NAME[c]) + '</h3>' + list.map(function (x) {
        var full = !x.miss.length;
        return '<div class="item open"><div class="grow"><div class="name">' + esc(x.r.name) + ' <span class="chip' + (full ? '' : ' warn') + '">' + (full ? '✓ Tamamı stokta' : x.have + '/' + x.n + ' malzeme var') + '</span></div>' +
          (full ? '' : '<div class="sub">Eksik: ' + esc(x.miss.join(', ')) + '</div>') + '<div class="acts"><button class="btn sm" data-act="recipe" data-id="' + x.r.id + '">📖 Tarif</button></div></div></div>';
      }).join('') + '</div>';
    });
    if (best.length) h = h.replace('<p class="muted"', '<div class="card" style="background:#eef6fb"><b>Önerilen menü:</b> ' + best.map(function (x) { return esc(x.r.name); }).join(' • ') + '</div><p class="muted"');
    else h += '<div class="empty card">Stoktaki malzemelerle eşleşen yemek bulunamadı.</div>';
    showSheet(h);
  }
  function viewStock() {
    var q = st.sq.trim().toLocaleLowerCase('tr');
    var list = allIngs().filter(function (g) {
      if (q && g.name.toLocaleLowerCase('tr').indexOf(q) < 0) return false;
      var a = stockAmt(g.id), m = stockMin(g.id);
      if (st.sf === 'low') return m > 0 && a < m; if (st.sf === 'have') return a > 0; if (st.sf === 'zero') return a <= 0; return true;
    });
    var totalHave = allIngs().filter(function (g) { return stockAmt(g.id) > 0; }).length;
    var lowN = allIngs().filter(function (g) { var m = stockMin(g.id); return m > 0 && stockAmt(g.id) < m; }).length;
    var h = '<h1 class="large">Stok</h1><div class="stat"><span class="box">' + totalHave + ' kalem stokta</span>' + (lowN ? '<span class="box" style="background:var(--warn-l);color:var(--warn)">' + lowN + ' kalem azaldı</span>' : '') + '</div>';
    h += '<div class="row noprint" style="margin-bottom:8px"><button class="btn primary" data-act="suggest">🍽️ Stoğa göre menü önerisi</button></div>';
    h += '<div class="row" style="margin-bottom:8px"><input type="search" id="sq" placeholder="Ürün ara…" value="' + esc(st.sq) + '" data-chg="sq" style="flex:1;min-width:180px"></div>';
    h += '<div class="seg" style="margin-bottom:10px;max-width:100%;overflow:auto">' + [['all', 'Hepsi'], ['have', 'Stokta olan'], ['zero', 'Olmayan'], ['low', 'Azalan']].map(function (x) { return '<button data-act="sf" data-f="' + x[0] + '" class="' + (st.sf === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var groups = {}; list.forEach(function (g) { (groups[g.cat] = groups[g.cat] || []).push(g); });
    Object.keys(D.CATS).forEach(function (c) {
      if (!groups[c]) return;
      h += '<div class="card group"><h3>' + esc(D.CATS[c]) + ' <small>' + groups[c].length + '</small></h3>' + groups[c].sort(function (a, b) { return tr(a.name, b.name); }).map(stockRow).join('') + '</div>';
    });
    if (!list.length) h += '<div class="empty card">Bu filtrede ürün yok.</div>';
    h += '<div class="card"><h3>Listede olmayan ürün ekle</h3><div class="row" style="flex-wrap:nowrap"><input type="text" id="niName" placeholder="Ürün adı" style="flex:2"><select id="niUnit" style="flex:1"><option value="g">gram/kg</option><option value="ml">ml/lt</option><option value="adet">adet</option></select><select id="niCat" style="flex:2">' + Object.keys(D.CATS).map(function (c) { return '<option value="' + c + '">' + esc(D.CATS[c]) + '</option>'; }).join('') + '</select><button class="btn primary" data-act="niadd">Ekle</button></div></div>';
    return h;
  }

  // ------------------------------------------------------------ AYARLAR
  function viewSettings() {
    var info = sync.info();
    var h = '<h1 class="large">Ayarlar</h1>';
    h += '<div class="card"><h3>Yemek sayısı (kişi)</h3><div class="row"><span class="stepper"><button class="btn sm iconbtn" data-act="dhc-">−</button><input type="number" min="1" id="defHc" value="' + defaultHc() + '" data-chg="defhc"><button class="btn sm iconbtn" data-act="dhc+">+</button></span><span class="muted">tüm haftalarda varsayılan. Haftaya özel sayıyı Alışveriş/Tarifler ekranından değiştirebilirsiniz.</span></div></div>';
    h += '<div class="card"><h3>☁️ Telefon–bilgisayar arası senkron</h3><p class="muted" style="margin:.2rem 0">Yemekhanedeki arkadaş telefondan stok girdiğinde sizde de görünsün istiyorsanız, ücretsiz bir Firebase veritabanı bağlayın (aşağıdaki adımlar). Bağlamazsanız uygulama yine çalışır ama veriler sadece o cihazda kalır.</p>' +
      '<label class="f">Firebase veritabanı adresi</label><input type="url" id="syUrl" placeholder="https://proje-adi-default-rtdb.firebaseio.com" value="' + esc(cfg.url) + '">' +
      '<label class="f">Ortak kod (aynı kodu giren herkes aynı veriyi görür)</label><div class="row" style="flex-wrap:nowrap"><input type="text" id="syCode" placeholder="örn. yemekhane-k7p2xq" value="' + esc(cfg.code) + '"><button class="btn" data-act="rndcode">Kod üret</button></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn primary" data-act="sysave">Kaydet ve senkronla</button><button class="btn" data-act="synow">Şimdi senkronla</button><button class="btn danger" data-act="syoff">Bağlantıyı kaldır</button></div>' +
      '<p style="margin:.6rem 0 0">Durum: <b>' + esc(info.status) + '</b>' + (info.lastOk ? ' • son: ' + new Date(info.lastOk).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '') + (info.lastErr ? ' • <span style="color:var(--bad)">' + esc(info.lastErr) + '</span>' : '') + ' • bekleyen kayıt: ' + store.dirtyKeys().length + '</p>' +
      '<details class="collapsible"><summary>Firebase nasıl kurulur? (5 dk, ücretsiz)</summary><ol style="padding-left:20px"><li><b>console.firebase.google.com</b> → “Proje ekle” (Analytics’i kapatabilirsiniz).</li><li>Sol menü → <b>Build → Realtime Database → Create database</b> (konum: Avrupa), “test mode” seçin.</li><li>Açılan sayfanın üstündeki adresi kopyalayın (<span class="kbd">https://…firebaseio.com</span>) ve yukarı yapıştırın.</li><li>Kural sekmesinde okuma/yazmanın açık olduğundan emin olun: <pre class="code">{ "rules": { ".read": true, ".write": true } }</pre></li><li>Aynı adres ve kodu telefondaki uygulamaya da girin. Kod tahmin edilmesi zor olduğu için başkaları verinize ulaşamaz; zaten içinde kişisel veri yoktur.</li></ol></details></div>';
    h += '<div class="card"><h3>🔐 Yönetici şifresi</h3><p class="muted" style="margin:.2rem 0 .6rem">Şifre koyarsanız haftayı kilitleme/açma, günü-haftayı-ayı yeniden oluşturma işlemleri şifre ister; yanlışlıkla yapılan işlemler önlenir. (Kısa bir sayı yeterli. Senkron açıksa tüm cihazlarda geçerlidir.)</p>' +
      (pinOn() ? '<div class="row"><span class="chip">Şifre tanımlı</span><button class="btn danger" data-act="pinclear">Şifreyi kaldır</button></div>' : '<div class="row" style="flex-wrap:nowrap"><input type="password" id="pinNew" placeholder="Yeni şifre" inputmode="numeric" autocomplete="off"><button class="btn primary" data-act="pinset">Kaydet</button></div>') + '</div>';
    h += '<div class="card"><h3>Yedek / dışa aktarma</h3><div class="row"><button class="btn" data-act="backup">⬇️ Yedeği indir (.json)</button><label class="btn" style="margin:0">⬆️ Yedeği yükle<input type="file" id="restoreFile" accept="application/json" hidden></label><button class="btn" data-act="csv2">📄 Yıllık menü (Excel/CSV)</button></div></div>';
    h += '<div class="card"><h3>Menü kuralları</h3><ul style="margin:.2rem 0;padding-left:20px"><li>Pazartesi, Salı, Perşembe: çorba • ana yemek • pilav/makarna • salata • tatlı</li><li>Çarşamba: fast food / geleneksel gün (hamburger, köfte ekmek, kısır-poğaça, lahmacun, tost)</li><li>Cuma: öğle yemeği kahvaltı (menemen, omlet, krep, pişi, gözleme…)</li><li>Tavuk yok • sade kuru baklagil yok • sebze yemekleri hep kıymalı veya kuşbaşılı • sebze/meyve sezonuna göre seçilir</li><li>Resmi tatiller “yemek yok” işaretlenir (günün üstüne dokunup değiştirebilirsiniz)</li></ul></div>';
    h += '<div class="card"><h3>Verileri sıfırla</h3><p class="muted" style="margin:.2rem 0 .6rem">Bu cihazdaki stok, menü değişiklikleri ve alışveriş işaretleri silinir. (Senkron açıksa buluttaki veri silinmez.)</p><button class="btn danger" data-act="wipe">Bu cihazdaki verileri sil</button></div>';
    h += '<p class="muted" style="text-align:center">Yemekhane Planlayıcı • ' + D.REC_LIST.length + ' tarif • menü ' + C.BASE.start.slice(0, 4) + '–' + C.BASE.end.slice(0, 4) + '</p>';
    return h;
  }

  // ------------------------------------------------------------ YAZDIR (hafta seçmeli)
  var ps = { start: null, count: 1, menu: true, market: true, rec: false };
  function weekList() {
    var out = [], a = C.mondayOf(C.BASE.start), b = C.mondayOf(C.BASE.end);
    for (var m = a; m <= b; m = C.addDays(m, 7)) out.push(m);
    return out;
  }
  function openPrint(pre) {
    if (pre) { ps.menu = !!pre.menu; ps.market = !!pre.market; ps.rec = !!pre.rec; }
    if (!ps.start) ps.start = st.week;
    var wl = weekList();
    var h = '<div class="row spread"><h2>🖨️ Yazdır / PDF</h2><button class="btn sm" data-act="close">Kapat ✕</button></div>' +
      '<p class="muted" style="margin:.2rem 0 .6rem">İstediğiniz haftayı seçin; o haftanın yemek listesi ve market listesi tek seferde yazdırılır (telefonda “PDF olarak kaydet” de seçilebilir).</p>' +
      '<label class="f">Başlangıç haftası</label><select id="psStart">' + wl.map(function (m) { return '<option value="' + m + '"' + (m === ps.start ? ' selected' : '') + '>' + C.isoWeekLabel(m) + (m === C.mondayOf(today) ? ' (bu hafta)' : '') + '</option>'; }).join('') + '</select>' +
      '<label class="f">Kaç hafta</label><select id="psCount">' + [1, 2, 3, 4].map(function (n) { return '<option' + (n === ps.count ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>' +
      '<div class="card" style="margin-top:10px">' +
      '<label class="row" style="margin:6px 0"><input type="checkbox" id="psMenu"' + (ps.menu ? ' checked' : '') + ' style="width:22px;height:22px"> <b>Yemek listesi</b> (haftalık menü)</label>' +
      '<label class="row" style="margin:6px 0"><input type="checkbox" id="psMarket"' + (ps.market ? ' checked' : '') + ' style="width:22px;height:22px"> <b>Market listesi</b> (stoktan düşülmüş)</label>' +
      '<label class="row" style="margin:6px 0"><input type="checkbox" id="psRec"' + (ps.rec ? ' checked' : '') + ' style="width:22px;height:22px"> <b>Tarifler</b> (aşçı için, günlük kişi sayısıyla)</label></div>' +
      '<div class="muted" style="font-size:.82rem;margin:4px 2px 10px">Onaylanmamış haftalarda menü değişirse liste de değişir; yazdırmadan önce haftayı onaylayıp kilitlemeniz önerilir.</div>' +
      '<button class="btn primary" data-act="doprint" style="width:100%">🖨️ Yazdır / PDF</button>';
    showSheet(h);
  }
  function ppHead(title, mon, extra) { return '<h1>' + esc(title) + '</h1><div class="pp-sub">' + C.isoWeekLabel(mon) + (isLocked(mon) ? ' • onaylı' : '') + (extra ? ' • ' + extra : '') + '</div>'; }
  function menuPrint(mon) {
    var h = '<section class="pp">' + ppHead('Haftalık Yemek Listesi', mon) + '<table class="pp-t"><tr><th style="width:24%">Gün</th><th>Menü</th></tr>';
    for (var i = 0; i < 5; i++) {
      var d = C.addDays(mon, i), day = getDay(d), body;
      if (!day) body = '—'; else if (day.off) body = 'Yemek yok' + (day.note ? ' (' + esc(day.note) + ')' : '');
      else if (day.combo) body = '<b>' + esc(day.combo) + '</b><br>' + day.slots.map(function (x) { return esc(recName(x.id)); }).join(' • ');
      else body = day.slots.map(function (x) { return '<b>' + esc(slotLabel(x.s)) + ':</b> ' + esc(recName(x.id)); }).join('<br>');
      h += '<tr><td><b>' + C.GUN[i + 1] + '</b><br>' + C.fmtDate(d) + '</td><td>' + body + '</td></tr>';
    }
    return h + '</table></section>';
  }
  function marketPrint(mon) {
    var data = shopData(mon), h = '<section class="pp">' + ppHead('Market Listesi', mon, data.hc + ' kişilik');
    groupByCat(data.buy).forEach(function (g) {
      h += '<h2>' + esc(D.CATS[g.cat]) + '</h2><table class="pp-t">' + g.items.map(function (it) { return '<tr><td><span class="pp-box"></span>' + esc(it.ing.name) + '</td><td class="r"><b>' + C.fmtQty(it.buy, it.ing.unit) + '</b></td></tr>'; }).join('') + '</table>';
    });
    if (data.extras.length) h += '<h2>Ekstra</h2><table class="pp-t">' + data.extras.map(function (e) { return '<tr><td><span class="pp-box"></span>' + esc(e.n) + '</td><td class="r">' + (e.a ? esc(e.a) + ' ' + esc(e.u || '') : '') + '</td></tr>'; }).join('') + '</table>';
    if (!data.buy.length && !data.extras.length) h += '<p>Alınacak malzeme yok.</p>';
    return h + '</section>';
  }
  function recipePrint(mon) {
    var h = '';
    for (var i = 0; i < 5; i++) {
      var d = C.addDays(mon, i), day = getDay(d); if (!day || day.off || !day.slots) continue;
      var hc = cookHc(d);
      h += '<section class="pp"><h1>' + C.GUN[i + 1] + ' • ' + C.fmtDate(d) + ' tarifleri</h1><div class="pp-sub">' + hc + ' kişilik' + (day.combo ? ' • ' + esc(day.combo) : '') + '</div>';
      day.slots.forEach(function (x) {
        var r = D.REC[x.id]; if (!r) return;
        h += '<h2>' + esc(r.name) + '</h2><table class="pp-t">' + r.ing.map(function (y) { var g = ing(y.id); return '<tr><td>' + esc(g.name) + '</td><td class="r">' + C.fmtQty(C.niceRound(C.scale(y.q, hc), g.unit), g.unit) + '</td></tr>'; }).join('') + '</table><ol class="pp-s">' + r.steps.map(function (z) { return '<li>' + esc(z) + '</li>'; }).join('') + '</ol>';
      });
      h += '</section>';
    }
    return h;
  }
  function doPrint() {
    var html = '';
    for (var i = 0; i < ps.count; i++) {
      var mon = C.addDays(ps.start, i * 7);
      if (ps.menu) html += menuPrint(mon);
      if (ps.market) html += marketPrint(mon);
      if (ps.rec) html += recipePrint(mon);
    }
    if (!html) { toast('Yazdırılacak bir şey seçilmedi'); return; }
    closeSheet(); render();
    $('#printArea').innerHTML = html;
    document.body.classList.add('pa');
    setTimeout(function () { window.print(); }, 80);
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('pa'); $('#printArea').innerHTML = ''; });

  // ------------------------------------------------------------ çizim
  var pendingRender = false;
  function navState() { return { page: st.page, tab: st.tab, month: st.month, week: st.week, sel: st.selDay, year: st.year, tm: st.tarifMode }; }
  function saveNav() {
    try { var ns = navState(); if (JSON.stringify(history.state) !== JSON.stringify(ns)) history.replaceState(ns, ''); } catch (e) { }
  }
  function push(page) {
    try { history.pushState(navState(), ''); } catch (e) { }
    st.page = page; render(false); window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', function (e) {
    var s2 = e.state || {};
    st.page = s2.page || null; if (s2.tab) st.tab = s2.tab; if (s2.month) st.month = s2.month; if (s2.week) st.week = s2.week;
    st.selDay = s2.sel || st.selDay; if (s2.year) st.year = s2.year; if (s2.tm) st.tarifMode = s2.tm;
    closeSheet(); render(false);
  });
  function render(keepScroll) {
    var y = window.scrollY;
    var v = $('#view');
    var html = st.page ? ({ recipe: viewRecipePage, shop: viewShop, rec: viewRecipes, year: viewYear }[st.page.type])(st.page)
      : st.tab === 'menu' ? viewMenu() : st.tab === 'alis' ? viewShop() : st.tab === 'tarif' ? viewRecipes() : st.tab === 'stok' ? viewStock() : viewSettings();
    // açık tarifler yeniden çizimde kapanmasın
    var viewKey = st.tab + '|' + (st.page ? st.page.type : '') + '|' + st.week + '|' + st.tarifMode + '|' + st.cat + '|' + st.q;
    var openRec = (viewKey === render._key) ? $$('details.recipe[open] summary', v).map(function (s) { return s.textContent; }) : [];
    render._key = viewKey;
    v.innerHTML = html;
    if (openRec.length) $$('details.recipe', v).forEach(function (d) { if (openRec.indexOf($('summary', d).textContent) >= 0) d.open = true; });
    $$('#tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === st.tab); });
    var TITLES = { menu: 'Menü', alis: 'Alışveriş', tarif: 'Tarifler', stok: 'Stok', ayar: 'Ayarlar' }, PT = { recipe: 'Tarif', shop: 'Alışveriş', rec: 'Tarifler', year: 'Yıllık Liste' };
    $('#navTitle').textContent = st.page ? PT[st.page.type] : TITLES[st.tab];
    $('#backBtn').hidden = !st.page;
    saveNav();
    updateSyncInfo();
    if (keepScroll !== false) window.scrollTo(0, y);
    pendingRender = false;
  }
  function typing() { var a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && ($('#view').contains(a) || $('#sheet').contains(a)); }
  function safeRender() { if (typing() || !$('#sheet').hidden) { pendingRender = true; return; } render(); }
  document.addEventListener('focusout', function () { if (pendingRender) setTimeout(function () { if (!typing() && $('#sheet').hidden) render(); }, 80); });

  function updateSyncInfo() {
    var el = $('#syncInfo'), info = sync.info();
    if (!sync.endpoint()) { el.textContent = 'Yerel'; return; }
    var n = store.dirtyKeys().length;
    el.textContent = info.status === 'bağlı' ? '☁️' + (n ? ' ' + n : ' ✓') : (info.status === 'çevrimdışı' ? '⚠️' + (n ? ' ' + n : '') : '☁️…');
  }

  var syncTimer = null;
  function scheduleSync(delay) {
    if (!sync.endpoint()) return;
    clearTimeout(syncTimer); syncTimer = setTimeout(doSync, delay || 1200);
  }
  async function doSync(manual) {
    var r = await sync.sync();
    updateSyncInfo();
    if (r && r.changed && r.changed.length) safeRender();
    if (manual) { if (r && r.error) toast('Senkron hatası: ' + r.error); else if (r && r.off) toast('Önce adres ve kod girin'); else toast('Senkron tamam ✓'); if (st.tab === 'ayar') safeRender(); }
    return r;
  }
  store.on(function (keys, remote) { if (!remote) scheduleSync(); if (keys && keys.some(function (k) { return /^(crec|cing):/.test(k); })) applyCustom(); });
  setInterval(function () { if (!document.hidden) doSync(); }, 20000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) doSync(); });
  window.addEventListener('online', function () { doSync(); });

  // ------------------------------------------------------------ olaylar
  function setTab(t) { st.tab = t; st.page = null; closeSheet(); render(false); window.scrollTo(0, 0); }
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) setTab(b.getAttribute('data-tab')); });

  function stepFor(g, mode) { return mode === 'kg' || mode === 'lt' ? 0.5 : (mode === 'g' ? (g.cat === 'BAH' ? 10 : 100) : (mode === 'ml' ? 100 : 1)); }

  function refreshStockRow(id) {
    var g = ing(id), el = $('[data-srow="' + id + '"]'); if (!g || !el) return;
    var ae = document.activeElement;
    if (ae && ae !== document.body && el.contains(ae)) { try { ae.blur(); } catch (x) { } el = $('[data-srow="' + id + '"]'); if (!el) return; }
    var tmp = document.createElement('div'); tmp.innerHTML = stockRow(g);
    try { el.replaceWith(tmp.firstChild); } catch (x) { render(); }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var a = t.getAttribute('data-act'), id = t.getAttribute('data-id'), w = t.getAttribute('data-w'), d = t.getAttribute('data-d');
    if (a === 'iopen') {
      if (e.target.closest('input,button,select,textarea')) return;
      var key = t.getAttribute('data-key'); st.open[key] = !st.open[key]; t.classList.toggle('open', !!st.open[key]); return;
    }
    switch (a) {
      case 'day': openDay(d); break;
      case 'close': closeSheet(); render(); break;
      case 'mprev': st.month = shiftMonth(st.month, -1); st.selDay = null; render(false); window.scrollTo(0, 0); break;
      case 'mnext': st.month = shiftMonth(st.month, 1); st.selDay = null; render(false); window.scrollTo(0, 0); break;
      case 'mtoday': st.month = today.slice(0, 7); st.selDay = C.dow(today) <= 5 ? today : null; render(false); break;
      case 'mregen':
        var mr = monthRange(st.month), pl = regenPlan(mr[0], mr[1], true), mname = C.AY[+st.month.slice(5)];
        if (!pl.n) { toast('Yenilenecek gün yok (geçmiş veya kilitli haftalar korunur)'); break; }
        confirmSheet({ title: mname + ' ayını yeniden oluştur', body: '<b>' + pl.n + ' günün</b> menüsü değişecek, elle yaptığınız değişiklikler de silinir; alışveriş listeleri etkilenir.<br>Korunanlar: ' + pl.past + ' geçmiş gün, ' + pl.locked + ' kilitli hafta günü.<br>İşlemden sonra 10 dakika içinde “Geri al” yapabilirsiniz.', word: 'ONAYLA', danger: true, ok: 'Ayı yeniden oluştur',
          run: function () { var n = regenerate(mr[0], mr[1], false, true, mname + ' ayı yeniden oluşturuldu (' + pl.n + ' gün)'); toast(n + ' gün yeniden oluşturuldu'); } });
        break;
      case 'wregen':
        if (isLocked(w)) { toast('Hafta kilitli'); break; }
        confirmSheet({ title: 'Haftayı yeniden oluştur', body: C.isoWeekLabel(w) + ' haftasının menüsü değişecek ve alışveriş listesi etkilenecek. “Geri al” ile geri alınabilir.', danger: true, ok: 'Haftayı yenile',
          run: function () { var n = regenerate(w, C.addDays(w, 4), false, false, 'Hafta yeniden oluşturuldu'); toast(n + ' gün yeniden oluşturuldu'); } });
        break;
      case 'lock':
        confirmSheet({ title: 'Haftayı onayla ve kilitle', body: C.isoWeekLabel(w) + ' haftasının menüsü ve alışveriş kişi sayısı sabitlenecek. Kilit açılana kadar hiçbir işlem (gün/ay yenileme, yemek değiştirme) bu haftayı değiştiremez.', ok: 'Kilitle',
          run: function () { store.set('lk:' + w, { at: Date.now() }); toast('Hafta kilitlendi'); } });
        break;
      case 'unlock':
        confirmSheet({ title: 'Kilidi aç', body: 'Hafta tekrar değiştirilebilir olacak; menü ve alışveriş listesi değişebilir.', danger: true, ok: 'Kilidi aç', run: function () { store.del('lk:' + w); toast('Kilit açıldı'); } });
        break;
      case 'undo': doUndo(); break;
      case 'cfcancel': pendingConfirm = null; closeSheet(); render(); break;
      case 'cfok':
        var pc = pendingConfirm, er = $('#cfErr'); if (!pc) break;
        if (pinOn() && hashPin(($('#cfPin') || {}).value || '') !== store.get('set:pin')) { er.textContent = 'Şifre yanlış.'; break; }
        if (pc.word && (($('#cfWord') || {}).value || '').trim().toLocaleUpperCase('tr') !== pc.word.toLocaleUpperCase('tr')) { er.textContent = 'Onay kelimesi yanlış.'; break; }
        pendingConfirm = null; closeSheet(); pc.run(); render(); break;
      case 'chc-': case 'chc+': store.set('ck:' + d, Math.max(1, cookHc(d) + (a === 'chc+' ? 1 : -1))); render(); break;
      case 'chcreset': store.del('ck:' + d); render(); break;
      case 'pinset':
        var pv = ($('#pinNew') || {}).value || ''; if (pv.length < 3) { toast('Şifre en az 3 karakter olmalı'); break; }
        store.set('set:pin', hashPin(pv)); toast('Şifre kaydedildi'); render(); break;
      case 'pinclear':
        confirmSheet({ title: 'Şifreyi kaldır', body: 'Şifre kalkarsa korumalı işlemler şifresiz yapılabilir.', danger: true, ok: 'Kaldır', run: function () { store.del('set:pin'); toast('Şifre kaldırıldı'); } });
        break;
      case 'myear': st.year = st.month.slice(0, 4); push({ type: 'year' }); break;
      case 'back': history.back(); break;
      case 'sel': st.selDay = d; render(); var dc = $('#daycard'); if (dc && dc.scrollIntoView) dc.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); break;
      case 'recipe': closeSheet(); push({ type: 'recipe', id: id, hc: cookHc(st.selDay || today) }); break;
      case 'rhc-': case 'rhc+': st.page.hc = Math.max(1, (st.page.hc || defaultHc()) + (a === 'rhc+' ? 1 : -1)); render(); break;
      case 'yprev': st.year = String(+st.year - 1); render(false); break;
      case 'ynext': st.year = String(+st.year + 1); render(false); break;
      case 'csv': case 'csv2': var yy = a === 'csv' ? st.year : (st.year || today.slice(0, 4)); download('yemek-listesi-' + yy + '.csv', csvYear(yy), 'text/csv;charset=utf-8'); break;
      case 'print':
        if (st.page && st.page.type === 'year') { $$('details.recipe').forEach(function (x) { x.open = true; }); window.print(); }
        else openPrint(st.tab === 'alis' || (st.page && st.page.type === 'shop') ? { menu: false, market: true, rec: false } : { menu: true, market: true, rec: false });
        break;
      case 'printrec': openPrint({ menu: false, market: false, rec: true }); break;
      case 'doprint': doPrint(); break;
      case 'goshop': st.week = w; push({ type: 'shop' }); break;
      case 'gorec': st.week = w; st.tarifMode = 'hafta'; push({ type: 'rec' }); break;
      case 'wprev': st.week = C.addDays(st.week, -7); render(false); window.scrollTo(0, 0); break;
      case 'wnext': st.week = C.addDays(st.week, 7); render(false); window.scrollTo(0, 0); break;
      case 'wtoday': st.week = C.mondayOf(today); render(false); break;
      case 'hc-': case 'hc+':
        if (isLocked(w)) { toast('Hafta kilitli'); break; }
        var cur = weekHc(w), nv = Math.max(1, cur + (a === 'hc+' ? 1 : -1)); store.set('wk:' + w + ':hc', nv); render(); break;
      case 'dhc-': case 'dhc+': store.set('set:hc', Math.max(1, defaultHc() + (a === 'dhc+' ? 1 : -1))); render(); break;
      case 'xhave': store.set('wk:' + w + ':x:' + id, 'have'); toast('Listeden çıkarıldı (elimizde var)'); render(); break;
      case 'xout': store.set('wk:' + w + ':x:' + id, 'out'); toast('Listeden çıkarıldı'); render(); break;
      case 'xundo': store.del('wk:' + w + ':x:' + id); render(); break;
      case 'tostock': st.sq = ing(id).name; st.sf = 'all'; setTab('stok'); break;
      case 'exadd':
        var nm = $('#exName').value.trim(); if (!nm) { toast('Ürün adı yazın'); break; }
        store.set('wk:' + w + ':ex:' + uid(), { n: nm, a: $('#exAmt').value.trim(), u: $('#exUnit').value.trim(), b: false }); render(); break;
      case 'exdel': store.del('wk:' + w + ':ex:' + id); render(); break;
      case 'wa': case 'copy':
        var text = shopText(st.week);
        if (a === 'wa') {
          if (navigator.share) { navigator.share({ text: text }).catch(function () { }); }
          else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
        } else {
          (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Liste kopyalandı'); }, function () { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Liste kopyalandı'); } catch (x) { toast('Kopyalanamadı'); } ta.remove(); });
        }
        break;
      case 'addstock':
        var dd = shopData(w), n2 = 0;
        dd.buy.filter(function (i) { return i.bought; }).forEach(function (i) { setStock(i.id, i.stock + i.buy); store.del('wk:' + w + ':b:' + i.id); n2++; });
        toast(n2 + ' kalem stoğa eklendi'); render(); break;
      case 'closeweek':
        if (confirm('Bu haftanın tüketimi stoktan düşülsün mü? (Haftayı yalnız bir kez kapatabilirsiniz)')) {
          var dc = C.weekNeed(getDay, w, weekHc(w)), k2 = 0;
          Object.keys(dc).forEach(function (iid) { if (store.get('wk:' + w + ':x:' + iid) === 'out') return; var sa = stockAmt(iid); if (sa > 0) { setStock(iid, sa - dc[iid].need); k2++; } });
          store.set('wk:' + w + ':closed', true); toast('Stoktan düşüldü (' + k2 + ' kalem)'); render();
        } break;
      case 'dcat': st.dcat = t.getAttribute('data-c'); render(false); break;
      case 'suggest': sgHc = 0; suggestSheet(); break;
      case 'sgh-': case 'sgh+': sgHc = Math.max(1, (sgHc || defaultHc()) + (a === 'sgh+' ? 1 : -1)); suggestSheet(); break;
      case 'newdish': dishForm = null; openDishForm(null); break;
      case 'editdish': dishForm = null; openDishForm(id); break;
      case 'dfcancel': dishForm = null; closeSheet(); render(); break;
      case 'dfaddrow': dfCollect(); dishForm.rows.push({ id: '', q: '' }); openDishForm(); break;
      case 'dfdelrow': dfCollect(); dishForm.rows.splice(+t.getAttribute('data-i'), 1); if (!dishForm.rows.length) dishForm.rows.push({ id: '', q: '' }); openDishForm(); break;
      case 'dfnewing': dfCollect(); dishForm.ni = { name: '', unit: 'g', cat: 'SEB' }; openDishForm(); break;
      case 'dfcancelng': dfCollect(); dishForm.ni = null; openDishForm(); break;
      case 'dfsaveing':
        dfCollect();
        var nn = ($('#ni_name').value || '').trim(), nu = $('#ni_unit').value, nc = $('#ni_cat').value, ne = $('#dfErr');
        if (!nn) { ne.textContent = 'Malzeme adını yazın.'; break; }
        if (/tavuk|piliç|balık|hindi/i.test(nn)) { ne.textContent = 'Menü kuralı: tavuk/balık/hindi malzemesi eklenemez.'; break; }
        var nid = D.slug(nn), existing = D.ING[nid];
        if (!existing) { store.set('cing:' + nid, { name: nn, unit: nu, cat: nc }); applyCustom(); }
        var emptyRow = dishForm.rows.filter(function (x) { return !x.id && !x.q; })[0];
        if (emptyRow) emptyRow.id = nid; else dishForm.rows.push({ id: nid, q: '' });
        dishForm.ni = null; openDishForm(); break;
      case 'dfsave': dfSave(); break;
      case 'exdish': if (store.has('rex:' + id)) store.del('rex:' + id); else store.set('rex:' + id, true); render(); break;
      case 'deldish':
        var used = usedInMenus(id), rr = D.REC[id]; if (!rr) break;
        if (used.length) { toast('Bu yemek ' + used.length + ' günlük menüde kullanılıyor; önce o günlerden çıkarın (örn. ' + C.fmtDate(used[0]) + ')'); break; }
        confirmSheet({ title: 'Yemeği sil', body: '<b>' + esc(rr.name) + '</b> kalıcı olarak silinecek.', danger: true, ok: 'Sil', run: function () { store.del('crec:' + id); store.del('rex:' + id); applyCustom(); toast('Yemek silindi'); } });
        break;
      case 'tmode': st.tarifMode = t.getAttribute('data-m'); render(false); break;
      case 'rcat': st.cat = t.getAttribute('data-c'); render(false); break;
      case 'sf': st.sf = t.getAttribute('data-f'); render(false); break;
      case 'smore': st.open['s:' + id] = !st.open['s:' + id]; var rowEl = t.closest('.srow'); rowEl.classList.toggle('open', !!st.open['s:' + id]); break;
      case 'sunit': var g1 = ing(id), cm = unitMode(g1, stockAmt(id)); st.su[id] = cm === 'kg' ? 'g' : cm === 'g' ? 'kg' : cm === 'lt' ? 'ml' : 'lt'; refreshStockRow(id); break;
      case 'sstep':
        var g2 = ing(id), md = unitMode(g2, stockAmt(id)), stp = stepFor(g2, md) * FACTOR[md] * (+t.getAttribute('data-dir'));
        setStock(id, stockAmt(id) + stp); st.su[id] = md; refreshStockRow(id); break;
      case 'niadd':
        var nn = $('#niName').value.trim(); if (!nn) { toast('Ürün adı yazın'); break; }
        var nid = 'u-' + D.slug(nn) + '-' + uid().slice(-3);
        store.set('item:' + nid, { n: nn, u: $('#niUnit').value, c: $('#niCat').value }); st.sq = nn; render(); toast('Ürün eklendi'); break;
      case 'sdelitem': if (confirm('Bu ürün silinsin mi?')) { store.del('item:' + id); store.del('stock:' + id); render(); } break;
      case 'rndcode': $('#syCode').value = 'yemekhane-' + Math.random().toString(36).slice(2, 8); break;
      case 'sysave':
        var nu = $('#syUrl').value.trim(), nc = $('#syCode').value.trim();
        if (!(/^https:\/\/.+/.test(nu) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(nu)) || !nc) { toast('Adres https:// ile başlamalı ve kod yazılmalı'); break; }
        cfg.url = nu; cfg.code = nc; saveCfg();
        store.markAllDirty(); doSync(true); break;
      case 'synow': doSync(true); break;
      case 'syoff': cfg = { url: '', code: '' }; saveCfg(); toast('Senkron kapatıldı'); render(); break;
      case 'backup': download('yemekhane-yedek-' + today + '.json', JSON.stringify(store.exportAll()), 'application/json'); break;
      case 'wipe': if (confirm('Bu cihazdaki tüm veriler silinsin mi? Bu işlem geri alınamaz.')) { store.clearAll(); toast('Silindi'); render(); } break;
      // gün penceresi
      case 'dsave': saveDayNote(d); closeSheet(); render(); break;
      case 'dgen': saveDayNote(d); regenerate(d, d, true, false, 'Gün menüsü oluşturuldu'); closeSheet(); openDay(d); render(); break;
      case 'dshuffle':
        saveDayNote(d);
        confirmSheet({ title: 'Günü yeniden oluştur', body: '<b>' + C.fmtDate(d) + '</b> gününün tüm yemekleri değişecek ve alışveriş listesi etkilenecek. “Geri al” ile geri alınabilir.', danger: true, ok: 'Yeniden oluştur',
          run: function () { regenerate(d, d, true, false, C.fmtDate(d) + ' yeniden oluşturuldu'); toast('Gün yeniden oluşturuldu'); openDay(d); } });
        break;
      case 'dreset': store.del('menu:' + d); closeSheet(); openDay(d); render(); break;
      case 'ditemdel':
        var o1 = clone(getDay(d)); o1.slots.splice(+t.getAttribute('data-i'), 1); store.set('menu:' + d, o1); openDay(d); render(); break;
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target, a = t.getAttribute && t.getAttribute('data-chg');
    if (e.target.id === 'restoreFile') {
      var f = e.target.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () { try { var n = store.importAll(JSON.parse(rd.result)); toast(n + ' kayıt yüklendi'); render(); } catch (x) { toast('Dosya okunamadı'); } }; rd.readAsText(f); return;
    }
    if (dishForm && (e.target.hasAttribute('data-dfi') || e.target.id === 'df_sea' || e.target.id === 'df_cat')) { dfCollect(); openDishForm(); return; }
    if (e.target.id === 'psStart') { ps.start = e.target.value; return; }
    if (e.target.id === 'psCount') { ps.count = +e.target.value; return; }
    if (e.target.id === 'psMenu') { ps.menu = e.target.checked; return; }
    if (e.target.id === 'psMarket') { ps.market = e.target.checked; return; }
    if (e.target.id === 'psRec') { ps.rec = e.target.checked; return; }
    if (e.target.id === 'dOff') {
      var dayD = sheetDay; if (!dayD) return;
      if (e.target.checked) { var noteEl = $('#dNote'); store.set('menu:' + dayD, { off: true, note: noteEl ? noteEl.value.trim() : '' }); }
      else { regenerate(dayD, dayD, true); }
      closeSheet(); openDay(dayD); render(); return;
    }
    if (!a) return;
    var id = t.getAttribute('data-id'), w = t.getAttribute('data-w'), d = t.getAttribute('data-d');
    switch (a) {
      case 'bought': if (t.checked) store.set('wk:' + w + ':b:' + id, true); else store.del('wk:' + w + ':b:' + id); render(); break;
      case 'exbought': var ex = store.get('wk:' + w + ':ex:' + id); if (ex) { ex = clone(ex); ex.b = t.checked; store.set('wk:' + w + ':ex:' + id, ex); } render(); break;
      case 'chc': store.set('ck:' + d, Math.max(1, Math.round(num(t.value)) || weekHc(C.mondayOf(d)))); render(); break;
      case 'hc': if (isLocked(w)) { render(); break; } var v = Math.max(1, Math.round(num(t.value)) || defaultHc()); store.set('wk:' + w + ':hc', v); render(); break;
      case 'rhc': st.page.hc = Math.max(1, Math.round(num(t.value)) || defaultHc()); render(); break;
      case 'defhc': store.set('set:hc', Math.max(1, Math.round(num(t.value)) || 16)); toast('Kaydedildi'); break;
      case 'sset': var g = ing(id), md = unitMode(g, stockAmt(id)); setStock(id, num(t.value) * FACTOR[md]); st.su[id] = md; refreshStockRow(id); break;
      case 'smin': var g3 = ing(id), md3 = unitMode(g3, stockAmt(id)); setStock(id, stockAmt(id), num(t.value) * FACTOR[md3]); refreshStockRow(id); break;
      case 'dslot':
        var o = clone(getDay(d)); o.slots[+t.getAttribute('data-i')].id = t.value; store.set('menu:' + d, o); openDay(d); render(); break;
      case 'dcombo':
        if (!t.value) break; var w5 = C.dow(d), pk = (w5 === 5 ? D.FRI : D.WED).filter(function (c) { return c.name === t.value; })[0];
        if (pk) { var o2 = clone(getDay(d)); o2.combo = pk.name; o2.slots = pk.items.map(function (i) { return { s: 'ozel', id: i }; }); store.set('menu:' + d, o2); openDay(d); render(); } break;
      case 'ditemadd':
        if (!t.value) break; var o3 = clone(getDay(d)); o3.slots.push({ s: 'ozel', id: t.value }); store.set('menu:' + d, o3); openDay(d); render(); break;
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target, a = t.getAttribute && t.getAttribute('data-chg');
    if (a === 'sq') { st.sq = t.value; var pos = t.selectionStart; render(); var el = $('#sq'); el.focus(); el.setSelectionRange(pos, pos); }
    if (a === 'dq') { st.dq = t.value; var pos3 = t.selectionStart; render(); var el3 = $('#dq'); el3.focus(); el3.setSelectionRange(pos3, pos3); }
    if (a === 'rq') { st.q = t.value; var pos2 = t.selectionStart; render(); var el2 = $('#rq'); el2.focus(); el2.setSelectionRange(pos2, pos2); }
  });
  $('#sheet').addEventListener('click', function (e) { if (e.target.id === 'sheet') { closeSheet(); render(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sheet').hidden) { closeSheet(); render(); } });

  // ------------------------------------------------------------ başlat
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }
  applyCustom();
  render(false);
  if (sync.endpoint()) doSync();
  window.__yemekhane = { store: store, getDay: getDay, st: st, render: render, shopData: shopData, regenerate: regenerate, sync: sync };
})();
