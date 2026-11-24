// Firebase RTDB davranışını taklit eden küçük sunucu ile iki cihazın senkronunu test eder
const http = require('http');
const S = require('../js/store.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('✗', m); } else console.log('✓', m); };

const db = {}; // path -> object
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let body = ''; req.on('data', c => body += c);
  req.on('end', () => {
    const path = decodeURIComponent(req.url.split('?')[0]);
    if (/[\$#\[\]]/.test(req.url.split('?')[0].replace(/%24|%23/g, ''))) { /* RTDB yasak karakterler ham halde gelmemeli */ }
    if (req.method === 'GET') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(db[path] || null)); }
    if (req.method === 'PATCH') {
      const o = JSON.parse(body);
      for (const k of Object.keys(o)) {
        if (/[.$#\[\]\/]/.test(k)) { res.statusCode = 400; return res.end('{"error":"Invalid key: ' + k + '"}'); }
      }
      db[path] = Object.assign(db[path] || {}, o);
      // RTDB null değerleri siler
      for (const k of Object.keys(db[path])) { if (db[path][k].v === null) delete db[path][k].v; }
      return res.end(JSON.stringify(o));
    }
    res.statusCode = 405; res.end();
  });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = 'http://127.0.0.1:' + server.address().port;
  let clockA = 1000, clockB = 1000;
  const A = S.createStore({ now: () => ++clockA }), B = S.createStore({ now: () => ++clockB });
  const cfg = { url: url + '/', code: 'test-kod-123' };
  const sa = S.createSync(A, () => cfg), sb = S.createSync(B, () => cfg);

  A.set('stock:dana-kiyma', { amount: 5000 }); A.set('menu:2027-01-04', { off: true, note: 'x.y' }); A.set('wk:2027-01-04:x:tuz', 'have');
  let r = await sa.sync(); ok(r.pushed === 3, 'A 3 kayıt gönderdi');
  r = await sb.sync(); ok(r.pulled === 3 && B.get('stock:dana-kiyma').amount === 5000, 'B 3 kaydı aldı');
  ok(B.get('menu:2027-01-04').note === 'x.y', 'B menü kaydı');

  // aynı anda farklı anahtarlar → ikisi de korunur
  A.set('stock:un', { amount: 100 }); B.set('stock:yumurta', { amount: 30 });
  await sa.sync(); await sb.sync(); await sa.sync();
  ok(A.get('stock:yumurta').amount === 30 && B.get('stock:un').amount === 100, 'farklı anahtarlar birleşti');

  // aynı anahtar → en yeni kazanır
  clockA = 5000; clockB = 6000;
  A.set('stock:un', { amount: 111 }); B.set('stock:un', { amount: 222 });
  await sa.sync(); await sb.sync(); await sa.sync();
  ok(A.get('stock:un').amount === 222 && B.get('stock:un').amount === 222, 'çakışmada en yeni kazandı');

  // silme
  B.del('wk:2027-01-04:x:tuz'); clockB += 10;
  await sb.sync(); await sa.sync();
  ok(A.get('wk:2027-01-04:x:tuz') === undefined, 'silme yayıldı');
  ok(!A.keys('wk:').includes('wk:2027-01-04:x:tuz'), 'silinen anahtar listede yok');

  // çevrimdışı: sunucu kapalı → hata yakalanır, veri kaybolmaz, sonra gönderilir
  const bad = S.createSync(A, () => ({ url: 'http://127.0.0.1:1', code: 'k' }));
  A.set('stock:tuz', { amount: 9 });
  r = await bad.sync(); ok(!!r.error && A.dirtyKeys().includes('stock:tuz'), 'çevrimdışıyken kayıt bekletiliyor');
  r = await sa.sync(); ok(r.pushed >= 1, 'bağlantı gelince gönderildi');
  r = await sb.sync(); ok(B.get('stock:tuz').amount === 9, 'B yeni kaydı aldı');

  // anahtar kodlama
  ok(S.encKey('a.b:c') === 'a%2Eb%3Ac' && S.decKey(S.encKey('a.b:c')) === 'a.b:c', 'anahtar kodlama');
  ok(S.normalizeBase('https://x-default-rtdb.firebaseio.com/.json') === 'https://x-default-rtdb.firebaseio.com', 'URL normalize');

  // yerel kalıcılık
  const mem = {}; const st = { getItem: k => mem[k] || null, setItem: (k, v) => mem[k] = v };
  const P = S.createStore({ storage: st }); P.set('a', 1); P.flush();
  const P2 = S.createStore({ storage: st }); ok(P2.get('a') === 1 && P2.dirtyKeys().includes('a'), 'yerel kalıcılık');

  server.close();
  console.log(fail ? 'BAŞARISIZ ' + fail : 'SENKRON TESTLERİ GEÇTİ');
  process.exit(fail ? 1 : 0);
})();
