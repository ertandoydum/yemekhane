/* Yemekhane – yerel depo (anahtar → {v,t}) ve isteğe bağlı Firebase Realtime Database senkronu.
   Her anahtar kendi zaman damgasıyla saklanır; çakışmada en yeni yazan kazanır (anahtar bazında).
   Böylece iki kişi aynı anda farklı ürünleri güncellerse hiçbiri kaybolmaz. */
(function (root) {
  'use strict';

  function createStore(opts) {
    opts = opts || {};
    var storage = opts.storage || null;           // localStorage benzeri
    var now = opts.now || function () { return Date.now(); };
    var NS = opts.key || 'yemekhane.kv.v1';
    var kv = {}, dirty = {}, listeners = [], saveTimer = null;

    try {
      if (storage) {
        var raw = storage.getItem(NS);
        if (raw) { var o = JSON.parse(raw); kv = o.kv || {}; dirty = o.dirty || {}; }
      }
    } catch (e) { kv = {}; dirty = {}; }

    function persist() {
      if (!storage) return;
      try { storage.setItem(NS, JSON.stringify({ kv: kv, dirty: dirty })); } catch (e) { /* kota dolu olabilir */ }
    }
    function schedule() {
      if (saveTimer) return;
      saveTimer = setTimeout(function () { saveTimer = null; persist(); }, 150);
    }
    function emit(keys, remote) { listeners.forEach(function (fn) { try { fn(keys, remote); } catch (e) { console.error(e); } }); }

    var api = {
      get: function (k) { var e = kv[k]; return (e && e.v !== null && e.v !== undefined) ? e.v : undefined; },
      has: function (k) { return api.get(k) !== undefined; },
      set: function (k, v) {
        var t = now(); var prev = kv[k]; if (prev && prev.t >= t) t = prev.t + 1;
        kv[k] = { v: v === undefined ? null : v, t: t }; dirty[k] = 1; schedule(); emit([k], false);
      },
      del: function (k) { api.set(k, null); },
      keys: function (prefix) {
        return Object.keys(kv).filter(function (k) { return k.indexOf(prefix) === 0 && kv[k].v !== null && kv[k].v !== undefined; });
      },
      on: function (fn) { listeners.push(fn); },
      dirtyKeys: function () { return Object.keys(dirty); },
      clearDirty: function (k, t) { if (dirty[k] && kv[k] && kv[k].t === t) delete dirty[k]; schedule(); },
      entry: function (k) { return kv[k]; },
      markAllDirty: function () { Object.keys(kv).forEach(function (k) { dirty[k] = 1; }); schedule(); },
      // uzaktan gelen kayıtları birleştir; değişen anahtarları döndür
      merge: function (remote) {
        var changed = [];
        Object.keys(remote || {}).forEach(function (k) {
          var r = remote[k]; if (!r || typeof r.t !== 'number') return;
          var l = kv[k];
          if (!l || r.t > l.t) { kv[k] = { v: (r.v === undefined ? null : r.v), t: r.t }; delete dirty[k]; changed.push(k); }
        });
        if (changed.length) { schedule(); emit(changed, true); }
        return changed;
      },
      flush: function () { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; } persist(); },
      exportAll: function () { return JSON.parse(JSON.stringify(kv)); },
      importAll: function (data) {
        var n = 0; Object.keys(data || {}).forEach(function (k) {
          var r = data[k]; if (r && typeof r.t === 'number') { kv[k] = { v: r.v === undefined ? null : r.v, t: r.t }; dirty[k] = 1; n++; }
        });
        schedule(); emit(Object.keys(data || {}), false); return n;
      },
      clearAll: function () { kv = {}; dirty = {}; persist(); emit([], false); }
    };
    return api;
  }

  // ---------- Firebase RTDB (REST) ----------
  function encKey(k) { return encodeURIComponent(k).replace(/\./g, '%2E'); }
  function decKey(k) { try { return decodeURIComponent(k); } catch (e) { return k; } }

  function normalizeBase(url) {
    url = String(url || '').trim().replace(/\.json.*$/, '').replace(/\/+$/, '');
    return url;
  }

  function createSync(store, getCfg, fetchFn) {
    var f = fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(root) : null);
    var busy = false, lastOk = null, lastErr = null, status = 'kapalı';

    function endpoint() {
      var cfg = getCfg() || {}; var base = normalizeBase(cfg.url); var code = String(cfg.code || '').trim();
      if (!base || !code) return null;
      return base + '/yemekhane/' + encodeURIComponent(code) + '.json';
    }

    async function pull() {
      var ep = endpoint(); if (!ep) return [];
      var res = await f(ep, { cache: 'no-store' });
      if (!res.ok) throw new Error('Sunucu yanıtı: ' + res.status);
      var data = await res.json();
      var map = {};
      if (data) Object.keys(data).forEach(function (k) { var e = data[k]; if (e && typeof e === 'object') map[decKey(k)] = { v: e.v === undefined ? null : e.v, t: e.t }; });
      return store.merge(map);
    }

    async function push() {
      var ep = endpoint(); if (!ep) return 0;
      var keys = store.dirtyKeys(); if (!keys.length) return 0;
      var body = {}, sent = [];
      keys.forEach(function (k) { var e = store.entry(k); if (e) { body[encKey(k)] = { v: e.v, t: e.t }; sent.push([k, e.t]); } });
      var res = await f(ep, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Gönderilemedi: ' + res.status);
      sent.forEach(function (p) { store.clearDirty(p[0], p[1]); });
      return sent.length;
    }

    async function sync() {
      if (busy) return { skipped: true };
      if (!endpoint()) { status = 'kapalı'; return { off: true }; }
      busy = true;
      try {
        var changed = await pull();
        var sent = await push();
        lastOk = Date.now(); lastErr = null; status = 'bağlı';
        return { pulled: changed.length, pushed: sent, changed: changed };
      } catch (e) {
        lastErr = String(e && e.message || e); status = 'çevrimdışı'; return { error: lastErr };
      } finally { busy = false; }
    }

    return {
      sync: sync, pull: pull, push: push, endpoint: endpoint,
      info: function () { return { status: status, lastOk: lastOk, lastErr: lastErr }; }
    };
  }

  var api = { createStore: createStore, createSync: createSync, encKey: encKey, decKey: decKey, normalizeBase: normalizeBase };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.YSTORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
