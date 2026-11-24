/* Yemekhane – çekirdek: tarih yardımcıları, menü oluşturucu, alışveriş hesabı, biçimlendirme */
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.YDATA;

  // ---------- Tarih (saat dilimi sorunu olmasın diye UTC üzerinden) ----------
  function parseISO(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function addDays(s, n) { var d = parseISO(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function dow(s) { var w = parseISO(s).getUTCDay(); return w === 0 ? 7 : w; } // 1=Pzt … 7=Paz
  function mondayOf(s) { return addDays(s, -(dow(s) - 1)); }
  function monthOf(s) { return +s.slice(5, 7); }
  function todayISO() {
    var n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
  }
  var GUN = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  var AY = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  function fmtDate(s, withYear) {
    var p = s.split('-');
    return (+p[2]) + ' ' + AY[+p[1]] + (withYear ? ' ' + p[0] : '');
  }
  function isoWeekLabel(mon) { return fmtDate(mon) + ' – ' + fmtDate(addDays(mon, 6), true); }

  // ---------- Rastgele (tohumlu) ----------
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Menü oluşturucu ----------
  var NORMAL_ORDER = ['ana', 'ikinci', 'corba', 'salata', 'tatli'];
  var KIND = ['kofte', 'kebap'];
  var CATLET = { corba: 'C', ana: 'A', ikinci: 'P', salata: 'S', tatli: 'T' };

  var COMBO_IDS = {};
  D.WED.concat(D.FRI).forEach(function (cb) { cb.items.forEach(function (id) { COMBO_IDS[id] = 1; }); });
  // Normal gün havuzu: özel gün paketlerinde geçen tarifler (Kısır, Çay…) günlük menüye girmez
  function listBySlot(slot) { return D.REC_LIST.filter(function (r) { return r.cat === CATLET[slot] && !COMBO_IDS[r.id]; }); }

  /* generate(start, end, seed, opts)
     opts.prev: öncesindeki günlerin menüsü [{slots:[...]}] (eski→yeni) – tekrarı önlemek için bağlam */
  function generate(start, end, seed, opts) {
    opts = opts || {};
    var rand = rng(seed);
    var out = {};
    var last = {};            // tarif id -> son kullanılan sayaç
    var nNormal = 0, nWed = 0, nFri = 0;
    var prevTags = [], prevAnaKind = null;

    (opts.prev || []).forEach(function (day) {
      if (!day || day.off || !day.slots) return;
      var isNormal = day.slots.some(function (x) { return x.s === 'ana'; });
      var counter;
      if (isNormal) { nNormal++; counter = nNormal; } else if (day.combo && /Kahvaltı/.test(day.combo)) { nFri++; counter = nFri; } else { nWed++; counter = nWed; }
      var tags = [];
      if (day.combo) last['combo:' + day.combo] = counter;
      day.slots.forEach(function (x) { last[x.id] = counter; var r = D.REC[x.id]; if (r) { tags = tags.concat(r.tags); if (x.s === 'ana') prevAnaKind = r.tags.filter(function (t) { return KIND.indexOf(t) >= 0; })[0] || null; } });
      if (isNormal) prevTags = tags;
    });

    var catCount = {};
    NORMAL_ORDER.forEach(function (s) { catCount[s] = listBySlot(s).length; });

    for (var d = start; d <= end; d = addDays(d, 1)) {
      var w = dow(d);
      if (w > 5) continue;
      if (D.HOLIDAYS[d] && !opts.ignoreHoliday) { out[d] = { off: true, note: D.HOLIDAYS[d] }; continue; }
      var m = monthOf(d);

      if (w === 3 || w === 5) {
        var combos = w === 3 ? D.WED : D.FRI;
        var counter = w === 3 ? ++nWed : ++nFri;
        var best = null, bestScore = -1e9;
        combos.forEach(function (c) {
          var s = (last['combo:' + c.name] == null) ? 1000 : counter - last['combo:' + c.name];
          var sc = Math.min(s, 50) + rand() * 1.5;
          if (sc > bestScore) { bestScore = sc; best = c; }
        });
        last['combo:' + best.name] = counter;
        out[d] = { combo: best.name, slots: best.items.map(function (id) { last[id] = counter; return { s: 'ozel', id: id }; }) };
        continue;
      }

      // normal gün (Pzt, Salı, Perşembe)
      nNormal++;
      var dayTags = [], slots = [];
      NORMAL_ORDER.forEach(function (slot) {
        var all = listBySlot(slot).filter(function (r) { return D.inSeason(r, m); });
        var gap = Math.max(4, Math.floor(catCount[slot] * (slot === 'ana' ? 0.55 : 0.5)));
        var cand = [];
        var g = gap;
        while (!cand.length && g >= 0) {
          cand = all.filter(function (r) {
            var l = last[r.id]; if (l != null && nNormal - l < g) return false;
            return !r.tags.some(function (t) { return dayTags.indexOf(t) >= 0; });
          });
          g = g > 1 ? Math.floor(g / 2) : g - 1;
        }
        if (!cand.length) cand = all;
        var pick = null, ps = -1e9;
        cand.forEach(function (r) {
          var l = last[r.id]; var since = l == null ? 80 : nNormal - l;
          var sc = Math.min(since, 80) + rand() * 25;
          if (r.tags.some(function (t) { return prevTags.indexOf(t) >= 0; })) sc -= 18;
          if (slot === 'ana') { var k = r.tags.filter(function (t) { return KIND.indexOf(t) >= 0; })[0]; if (k && k === prevAnaKind) sc -= 25; }
          if (sc > ps) { ps = sc; pick = r; }
        });
        last[pick.id] = nNormal;
        dayTags = dayTags.concat(pick.tags);
        if (slot === 'ana') prevAnaKind = pick.tags.filter(function (t) { return KIND.indexOf(t) >= 0; })[0] || null;
        slots.push({ s: slot, id: pick.id });
      });
      prevTags = dayTags;
      var order = ['corba', 'ana', 'ikinci', 'salata', 'tatli'];
      slots.sort(function (a, b) { return order.indexOf(a.s) - order.indexOf(b.s); });
      out[d] = { slots: slots };
    }
    return out;
  }

  // ---------- Miktar hesabı ----------
  function scale(q, hc) { return q * hc / 10; }

  /* weekNeed(getDay, monday, hc) → {ing: {need, uses:[{date,recipe,q}]}} */
  function weekNeed(getDay, monday, hc) {
    var need = {};
    for (var i = 0; i < 7; i++) {
      var d = addDays(monday, i), day = getDay(d);
      if (!day || day.off || !day.slots) continue;
      day.slots.forEach(function (sl) {
        var r = D.REC[sl.id]; if (!r) return;
        r.ing.forEach(function (x) {
          var o = need[x.id] || (need[x.id] = { need: 0, uses: [] });
          var q = scale(x.q, hc); o.need += q; o.uses.push({ date: d, recipe: r.name, q: q });
        });
      });
    }
    return need;
  }

  function ceilTo(q, step) { return Math.ceil(q / step - 1e-9) * step; }
  // satın alma için yukarı yuvarla
  function buyRound(q, unit) {
    if (q <= 0) return 0;
    if (unit === 'adet' || unit === 'demet') return Math.ceil(q - 1e-9);
    if (q < 100) return ceilTo(q, 5);
    if (q < 1000) return ceilTo(q, 50);
    return ceilTo(q, 100);
  }
  // tarif ekranı için en yakın "güzel" değer
  function niceRound(q, unit) {
    if (unit === 'adet' || unit === 'demet') { var h = Math.round(q * 2) / 2; return h < 0.5 ? 0.5 : h; }
    if (q < 10) return Math.round(q * 2) / 2 || 0.5;
    if (q < 100) return Math.round(q / 5) * 5;
    if (q < 1000) return Math.round(q / 10) * 10;
    return Math.round(q / 50) * 50;
  }
  function trimNum(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }
  function fmtQty(q, unit) {
    if (unit === 'g') return q >= 1000 ? trimNum(q / 1000) + ' kg' : trimNum(q) + ' g';
    if (unit === 'ml') return q >= 1000 ? trimNum(q / 1000) + ' lt' : trimNum(q) + ' ml';
    return trimNum(q) + ' ' + unit;
  }

  var api = {
    parseISO: parseISO, iso: iso, addDays: addDays, dow: dow, mondayOf: mondayOf, monthOf: monthOf, todayISO: todayISO,
    GUN: GUN, AY: AY, fmtDate: fmtDate, isoWeekLabel: isoWeekLabel,
    BASE: { start: '2026-11-23', end: '2028-12-31', seed: 20261124 },
    hash: hash, rng: rng, generate: generate, weekNeed: weekNeed, scale: scale,
    buyRound: buyRound, niceRound: niceRound, fmtQty: fmtQty, trimNum: trimNum
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.YCORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
