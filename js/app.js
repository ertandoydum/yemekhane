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
  var cfg = { url: '', code: '' };
  try { cfg = Object.assign(cfg, JSON.parse(storage.getItem(CFG_KEY) || '{}')); } catch (e) { }
  function saveCfg() { try { storage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { } }
  var sync = S.createSync(store, function () { return cfg; });

  var BASE = C.generate(C.BASE.start, C.BASE.end, C.BASE.seed);
  var today = C.todayISO();

  var st = {
    tab: 'menu', menuMode: 'ay', month: today.slice(0, 7), year: today.slice(0, 4),
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
  function regenerate(start, end, ignoreHoliday) {
    var seed = (Math.random() * 4294967296) >>> 0;
    var gen = C.generate(start, end, seed, { prev: prevContext(start), ignoreHoliday: !!ignoreHoliday });
    var n = 0;
    Object.keys(gen).forEach(function (d) { var old = store.get('menu:' + d); if (old && old.note) gen[d].note = old.note; store.set('menu:' + d, gen[d]); n++; });
    return n;
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
  function dayCard(d) {
    var day = getDay(d), w = C.dow(d);
    var cls = 'day' + (d === today ? ' today' : '') + (day && day.combo ? ' special' + (w === 5 ? ' fri' : '') : '') + (day && day.off ? ' off' : '');
    var head = '<h4>' + C.GUN[w] + ' <span>' + C.fmtDate(d) + '</span></h4>';
    var body;
    if (!day) body = '<div class="muted">Menü yok — dokunup oluşturun</div>';
    else if (day.off) body = '<div>🚫 Yemek yok' + (day.note ? ' — ' + esc(day.note) : '') + '</div>';
    else {
      body = (day.combo ? '<div class="combo">' + esc(day.combo) + '</div>' : '') +
        day.slots.map(function (x) {
          return '<div class="dish ' + x.s + '"><em>' + (x.s === 'ozel' ? '' : esc(slotLabel(x.s).split(' ')[0])) + '</em><span>' + esc(recName(x.id)) + '</span></div>';
        }).join('') + (day.note ? '<div class="muted" style="margin-top:4px">📝 ' + esc(day.note) + '</div>' : '');
    }
    return '<div class="' + cls + '" data-act="day" data-d="' + d + '">' + head + body + '</div>';
  }

  function viewMenu() {
    if (st.menuMode === 'yil') return viewYear();
    var rng = monthRange(st.month), y = st.month.slice(0, 4), m = +st.month.slice(5, 7);
    var h = '<div class="pager"><button class="btn iconbtn" data-act="mprev" aria-label="Önceki ay">◀</button>' +
      '<div class="title">' + C.AY[m] + ' ' + y + '</div><button class="btn iconbtn" data-act="mnext" aria-label="Sonraki ay">▶</button></div>';
    h += '<div class="toolbar"><button class="btn sm" data-act="mtoday">Bugün</button>' +
      '<button class="btn sm" data-act="mregen">🔄 Ayı yeniden oluştur</button>' +
      '<button class="btn sm" data-act="myear">📆 Yıllık liste</button>' +
      '<button class="btn sm" data-act="print">🖨️ Yazdır</button></div>';
    var mon = C.mondayOf(rng[0]), any = false;
    for (; mon <= rng[1]; mon = C.addDays(mon, 7)) {
      var days = [];
      for (var i = 0; i < 5; i++) { var d = C.addDays(mon, i); if (d >= rng[0] && d <= rng[1]) days.push(d); }
      if (!days.length) continue; any = true;
      h += '<section class="week"><div class="weekhead"><b>' + C.isoWeekLabel(mon) + '</b><span class="row noprint">' +
        '<button class="btn sm" data-act="goshop" data-w="' + mon + '">🛒 Alışveriş</button>' +
        '<button class="btn sm" data-act="gorec" data-w="' + mon + '">📖 Tarifler</button>' +
        '<button class="btn sm" data-act="wregen" data-w="' + mon + '">🔄</button></span></div>' +
        '<div class="days">' + days.map(dayCard).join('') + '</div></section>';
    }
    if (!any) h += '<div class="empty">Bu ay için gün yok.</div>';
    return h;
  }

  function viewYear() {
    var y = st.year, h = '<div class="pager"><button class="btn iconbtn" data-act="yprev">◀</button><div class="title">' + y + ' Yıllık Yemek Listesi</div><button class="btn iconbtn" data-act="ynext">▶</button></div>' +
      '<div class="toolbar"><button class="btn sm" data-act="mback">← Aylık görünüm</button><button class="btn sm" data-act="csv">⬇️ Excel/CSV indir</button><button class="btn sm" data-act="print">🖨️ Yazdır</button></div>';
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
    var hc = weekHc(mon), has = store.has('wk:' + mon + ':hc');
    return '<span class="stepper noprint"><button class="btn sm iconbtn" data-act="hc-" data-w="' + mon + '">−</button><input type="number" min="1" inputmode="numeric" value="' + hc + '" data-chg="hc" data-w="' + mon + '" aria-label="Kişi sayısı"><button class="btn sm iconbtn" data-act="hc+" data-w="' + mon + '">+</button></span> <span class="muted">kişi' + (has ? ' (bu hafta özel)' : '') + '</span>';
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
    var mon = st.week, data = shopData(mon), h = '';
    h += '<div class="pager"><button class="btn iconbtn" data-act="wprev">◀</button><div class="title">' + C.isoWeekLabel(mon) + '</div><button class="btn iconbtn" data-act="wnext">▶</button></div>';
    h += '<div class="toolbar"><button class="btn sm" data-act="wtoday">Bu hafta</button>' + hcBox(mon) + '</div>';
    if (!data.days) { return h + '<div class="empty card">Bu haftada yemek yok (menü boş veya tatil).<br><br><button class="btn primary" data-act="gomenu">Menüye git</button></div>'; }
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
  function viewRecipes() {
    var h = '<div class="toolbar"><div class="seg"><button data-act="tmode" data-m="hafta" class="' + (st.tarifMode === 'hafta' ? 'on' : '') + '">Bu haftanın tarifleri</button><button data-act="tmode" data-m="tum" class="' + (st.tarifMode === 'tum' ? 'on' : '') + '">Tüm tarifler</button></div></div>';
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
    h += '<div class="toolbar">' + hcBox(mon) + '<button class="btn sm" data-act="wtoday">Bu hafta</button><button class="btn sm" data-act="printrec">🖨️ Tarifleri yazdır</button></div>';
    var any = false;
    for (var i = 0; i < 5; i++) {
      var d = C.addDays(mon, i), day = getDay(d); if (!day || day.off || !day.slots) continue; any = true;
      h += '<div class="dayhead">' + C.GUN[C.dow(d)] + ' – ' + C.fmtDate(d) + (day.combo ? ' • ' + esc(day.combo) : '') + '</div>';
      h += day.slots.map(function (x) { var r = D.REC[x.id]; return r ? recipeCard(r, hc2, false) : ''; }).join('');
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
  function viewStock() {
    var q = st.sq.trim().toLocaleLowerCase('tr');
    var list = allIngs().filter(function (g) {
      if (q && g.name.toLocaleLowerCase('tr').indexOf(q) < 0) return false;
      var a = stockAmt(g.id), m = stockMin(g.id);
      if (st.sf === 'low') return m > 0 && a < m; if (st.sf === 'have') return a > 0; if (st.sf === 'zero') return a <= 0; return true;
    });
    var totalHave = allIngs().filter(function (g) { return stockAmt(g.id) > 0; }).length;
    var lowN = allIngs().filter(function (g) { var m = stockMin(g.id); return m > 0 && stockAmt(g.id) < m; }).length;
    var h = '<h2>Ana stok listesi</h2><div class="stat"><span class="box">' + totalHave + ' kalem stokta</span>' + (lowN ? '<span class="box" style="background:var(--warn-l);color:var(--warn)">' + lowN + ' kalem azaldı</span>' : '') + '</div>';
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
    var h = '<h2>Ayarlar</h2>';
    h += '<div class="card"><h3>Yemek sayısı (kişi)</h3><div class="row"><span class="stepper"><button class="btn sm iconbtn" data-act="dhc-">−</button><input type="number" min="1" id="defHc" value="' + defaultHc() + '" data-chg="defhc"><button class="btn sm iconbtn" data-act="dhc+">+</button></span><span class="muted">tüm haftalarda varsayılan. Haftaya özel sayıyı Alışveriş/Tarifler ekranından değiştirebilirsiniz.</span></div></div>';
    h += '<div class="card"><h3>☁️ Telefon–bilgisayar arası senkron</h3><p class="muted" style="margin:.2rem 0">Yemekhanedeki arkadaş telefondan stok girdiğinde sizde de görünsün istiyorsanız, ücretsiz bir Firebase veritabanı bağlayın (aşağıdaki adımlar). Bağlamazsanız uygulama yine çalışır ama veriler sadece o cihazda kalır.</p>' +
      '<label class="f">Firebase veritabanı adresi</label><input type="url" id="syUrl" placeholder="https://proje-adi-default-rtdb.firebaseio.com" value="' + esc(cfg.url) + '">' +
      '<label class="f">Ortak kod (aynı kodu giren herkes aynı veriyi görür)</label><div class="row" style="flex-wrap:nowrap"><input type="text" id="syCode" placeholder="örn. yemekhane-k7p2xq" value="' + esc(cfg.code) + '"><button class="btn" data-act="rndcode">Kod üret</button></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn primary" data-act="sysave">Kaydet ve senkronla</button><button class="btn" data-act="synow">Şimdi senkronla</button><button class="btn danger" data-act="syoff">Bağlantıyı kaldır</button></div>' +
      '<p style="margin:.6rem 0 0">Durum: <b>' + esc(info.status) + '</b>' + (info.lastOk ? ' • son: ' + new Date(info.lastOk).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '') + (info.lastErr ? ' • <span style="color:var(--bad)">' + esc(info.lastErr) + '</span>' : '') + ' • bekleyen kayıt: ' + store.dirtyKeys().length + '</p>' +
      '<details class="collapsible"><summary>Firebase nasıl kurulur? (5 dk, ücretsiz)</summary><ol style="padding-left:20px"><li><b>console.firebase.google.com</b> → “Proje ekle” (Analytics’i kapatabilirsiniz).</li><li>Sol menü → <b>Build → Realtime Database → Create database</b> (konum: Avrupa), “test mode” seçin.</li><li>Açılan sayfanın üstündeki adresi kopyalayın (<span class="kbd">https://…firebaseio.com</span>) ve yukarı yapıştırın.</li><li>Kural sekmesinde okuma/yazmanın açık olduğundan emin olun: <pre class="code">{ "rules": { ".read": true, ".write": true } }</pre></li><li>Aynı adres ve kodu telefondaki uygulamaya da girin. Kod tahmin edilmesi zor olduğu için başkaları verinize ulaşamaz; zaten içinde kişisel veri yoktur.</li></ol></details></div>';
    h += '<div class="card"><h3>Yedek / dışa aktarma</h3><div class="row"><button class="btn" data-act="backup">⬇️ Yedeği indir (.json)</button><label class="btn" style="margin:0">⬆️ Yedeği yükle<input type="file" id="restoreFile" accept="application/json" hidden></label><button class="btn" data-act="csv2">📄 Yıllık menü (Excel/CSV)</button></div></div>';
    h += '<div class="card"><h3>Menü kuralları</h3><ul style="margin:.2rem 0;padding-left:20px"><li>Pazartesi, Salı, Perşembe: çorba • ana yemek • pilav/makarna • salata • tatlı</li><li>Çarşamba: fast food / geleneksel gün (hamburger, köfte ekmek, kısır-poğaça, lahmacun, tost)</li><li>Cuma: öğle yemeği kahvaltı (menemen, omlet, krep, pişi, gözleme…)</li><li>Tavuk yok • sade kuru baklagil yok • sebze yemekleri hep kıymalı veya kuşbaşılı • sebze/meyve sezonuna göre seçilir</li><li>Resmi tatiller “yemek yok” işaretlenir (günün üstüne dokunup değiştirebilirsiniz)</li></ul></div>';
    h += '<div class="card"><h3>Verileri sıfırla</h3><p class="muted" style="margin:.2rem 0 .6rem">Bu cihazdaki stok, menü değişiklikleri ve alışveriş işaretleri silinir. (Senkron açıksa buluttaki veri silinmez.)</p><button class="btn danger" data-act="wipe">Bu cihazdaki verileri sil</button></div>';
    h += '<p class="muted" style="text-align:center">Yemekhane Planlayıcı • ' + D.REC_LIST.length + ' tarif • menü ' + C.BASE.start.slice(0, 4) + '–' + C.BASE.end.slice(0, 4) + '</p>';
    return h;
  }

  // ------------------------------------------------------------ çizim
  var pendingRender = false;
  function render(keepScroll) {
    var y = window.scrollY;
    var v = $('#view');
    var html = st.tab === 'menu' ? viewMenu() : st.tab === 'alis' ? viewShop() : st.tab === 'tarif' ? viewRecipes() : st.tab === 'stok' ? viewStock() : viewSettings();
    // açık tarifler yeniden çizimde kapanmasın
    var viewKey = st.tab + '|' + st.week + '|' + st.tarifMode + '|' + st.cat + '|' + st.q;
    var openRec = (viewKey === render._key) ? $$('details.recipe[open] summary', v).map(function (s) { return s.textContent; }) : [];
    render._key = viewKey;
    v.innerHTML = html;
    if (openRec.length) $$('details.recipe', v).forEach(function (d) { if (openRec.indexOf($('summary', d).textContent) >= 0) d.open = true; });
    $$('#tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === st.tab); });
    updateSyncInfo();
    if (keepScroll !== false) window.scrollTo(0, y);
    pendingRender = false;
  }
  function typing() { var a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && ($('#view').contains(a) || $('#sheet').contains(a)); }
  function safeRender() { if (typing() || !$('#sheet').hidden) { pendingRender = true; return; } render(); }
  document.addEventListener('focusout', function () { if (pendingRender) setTimeout(function () { if (!typing() && $('#sheet').hidden) render(); }, 80); });

  function updateSyncInfo() {
    var el = $('#syncInfo'), info = sync.info();
    if (!sync.endpoint()) { el.textContent = 'Yerel kayıt (senkron kapalı)'; return; }
    var n = store.dirtyKeys().length;
    el.textContent = info.status === 'bağlı' ? '☁️ Senkron açık' + (n ? ' • ' + n + ' bekliyor' : ' ✓') : (info.status === 'çevrimdışı' ? '⚠️ Çevrimdışı' + (n ? ' • ' + n + ' bekliyor' : '') : '☁️ Bağlanıyor…');
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
  store.on(function (keys, remote) { if (!remote) scheduleSync(); });
  setInterval(function () { if (!document.hidden) doSync(); }, 20000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) doSync(); });
  window.addEventListener('online', function () { doSync(); });

  // ------------------------------------------------------------ olaylar
  function setTab(t) { st.tab = t; closeSheet(); render(false); window.scrollTo(0, 0); }
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
      case 'mprev': st.month = shiftMonth(st.month, -1); render(false); window.scrollTo(0, 0); break;
      case 'mnext': st.month = shiftMonth(st.month, 1); render(false); window.scrollTo(0, 0); break;
      case 'mtoday': st.month = today.slice(0, 7); render(false); break;
      case 'mregen':
        if (confirm(C.AY[+st.month.slice(5)] + ' ayının menüsü yeniden oluşturulsun mu? (Elle yaptığınız değişiklikler de silinir)')) {
          var r = monthRange(st.month); var n = regenerate(r[0], r[1]); toast(n + ' gün yeniden oluşturuldu'); render();
        } break;
      case 'wregen':
        if (confirm('Bu haftanın menüsü yeniden oluşturulsun mu?')) { regenerate(w, C.addDays(w, 4)); toast('Hafta yenilendi'); render(); } break;
      case 'myear': st.menuMode = 'yil'; st.year = st.month.slice(0, 4); render(false); window.scrollTo(0, 0); break;
      case 'mback': st.menuMode = 'ay'; render(false); break;
      case 'yprev': st.year = String(+st.year - 1); render(false); break;
      case 'ynext': st.year = String(+st.year + 1); render(false); break;
      case 'csv': case 'csv2': var yy = a === 'csv' ? st.year : (st.year || today.slice(0, 4)); download('yemek-listesi-' + yy + '.csv', csvYear(yy), 'text/csv;charset=utf-8'); break;
      case 'print': $$('details.recipe').forEach(function (x) { x.open = true; }); window.print(); break;
      case 'printrec': $$('details.recipe').forEach(function (x) { x.open = true; }); window.print(); break;
      case 'goshop': st.week = w; setTab('alis'); break;
      case 'gorec': st.week = w; st.tarifMode = 'hafta'; setTab('tarif'); break;
      case 'gomenu': setTab('menu'); break;
      case 'wprev': st.week = C.addDays(st.week, -7); render(false); window.scrollTo(0, 0); break;
      case 'wnext': st.week = C.addDays(st.week, 7); render(false); window.scrollTo(0, 0); break;
      case 'wtoday': st.week = C.mondayOf(today); render(false); break;
      case 'hc-': case 'hc+':
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
      case 'dgen': saveDayNote(d); regenerate(d, d, true); closeSheet(); openDay(d); render(); break;
      case 'dshuffle': saveDayNote(d); regenerate(d, d, true); closeSheet(); openDay(d); render(); break;
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
      case 'hc': var v = Math.max(1, Math.round(num(t.value)) || defaultHc()); store.set('wk:' + w + ':hc', v); render(); break;
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
    if (a === 'rq') { st.q = t.value; var pos2 = t.selectionStart; render(); var el2 = $('#rq'); el2.focus(); el2.setSelectionRange(pos2, pos2); }
  });
  $('#sheet').addEventListener('click', function (e) { if (e.target.id === 'sheet') { closeSheet(); render(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sheet').hidden) { closeSheet(); render(); } });

  // ------------------------------------------------------------ başlat
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }
  render(false);
  if (sync.endpoint()) doSync();
  window.__yemekhane = { store: store, getDay: getDay, st: st, render: render, shopData: shopData, regenerate: regenerate, sync: sync };
})();
