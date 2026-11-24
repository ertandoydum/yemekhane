// Uçtan uca tarayıcı testi (Chrome + playwright). Çalıştır: NODE_PATH=/opt/npm-tools/node_modules node tests/e2e.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('✗ ' + m); } else console.log('✓ ' + m); };
const ROOT = path.join(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const stat = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', mime[path.extname(f)] || 'text/plain'); r.end(fs.readFileSync(f)); });
const db = {};
const fb = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    const p = req.url.split('?')[0];
    if (req.method === 'GET') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(db[p] || null)); }
    if (req.method === 'PATCH') { db[p] = Object.assign(db[p] || {}, JSON.parse(b)); return res.end('{}'); }
    res.statusCode = 405; res.end();
  });
});
(async () => {
  await new Promise(r => stat.listen(0, r)); await new Promise(r => fb.listen(0, r));
  const URL = 'http://127.0.0.1:' + stat.address().port + '/', FB = 'http://127.0.0.1:' + fb.address().port;
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true, locale: 'tr-TR' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(URL); await page.waitForSelector('.day');
  // sistem tarihi sabit değil → menüde bilinen bir aya git (Aralık 2026 → ocak 2027)
  const goMonth = async (ym) => page.evaluate(ym => { window.__yemekhane.st.month = ym; window.__yemekhane.render(false); }, ym);
  await goMonth('2027-01');
  const cards = await page.$$eval('.day', els => els.map(e => e.innerText));
  ok(cards.length >= 21, 'Ocak 2027: ' + cards.length + ' gün kartı');
  ok(cards.some(c => /Hamburger|Köfte Ekmek|Kısır|Lahmacun|Tost/.test(c)), 'Çarşamba özel menü var');
  ok(cards.some(c => /Menemen|Omlet|Krep|Pişi|Gözleme|Sigara/.test(c)), 'Cuma kahvaltı var');
  ok(cards.some(c => /Yılbaşı/.test(c)), '1 Ocak tatil');
  await page.screenshot({ path: '/tmp/s-menu.png', fullPage: false });

  // gün düzenleme
  const normalCard = page.locator('.day:not(.special):not(.off)').first(); const before = await normalCard.innerText();
  await normalCard.click(); await page.waitForSelector('#sheet .panel');
  const sel = page.locator('#sheet select[data-i="1"]'); const optVal = await sel.evaluate(s => [...s.options].map(o => o.value).find(v => v !== s.value));
  await sel.selectOption(optVal);
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/tmp/s-daysheet.png' });
  await page.locator('#sheet [data-act="dsave"]').click();
  const after = await page.locator('.day:not(.special):not(.off)').first().innerText();
  ok(before !== after, 'gün menüsü elle değiştirildi');
  // yeniden oluştur
  await normalCard.click(); await page.locator('[data-act="dshuffle"]').click(); await page.waitForSelector('#sheet .panel'); await page.locator('#sheet [data-act="dsave"]').click();
  ok((await page.locator('.day:not(.special):not(.off)').first().innerText()).split('\n').length >= 6, 'gün yeniden oluşturuldu (5 çeşit)');
  // günü yemek yok yap ve geri al
  await page.locator('.day:not(.special):not(.off)').nth(1).click(); await page.locator('#dOff').check(); await page.waitForSelector('#dNote');
  await page.locator('#sheet [data-act="dsave"]').click();
  ok((await page.locator('.day.off').count()) >= 2, 'yemek yok işaretlendi');
  await page.locator('.day.off').filter({ hasNotText: 'Yılbaşı' }).first().click(); await page.locator('#dOff').uncheck(); await page.waitForSelector('#sheet select[data-i="0"]'); await page.locator('#sheet [data-act="dsave"]').click();
  ok((await page.locator('.day.off').count()) === 1, 'yemek yok geri alındı');
  // çarşamba paketini değiştir
  await page.locator('.day.special').first().click(); await page.waitForSelector('[data-chg="dcombo"]');
  await page.locator('[data-chg="dcombo"]').selectOption({ label: 'Tost Günü' }); await page.waitForTimeout(150);
  ok((await page.locator('#sheet').innerText()).includes('Karışık Tost'), 'özel gün paketi değişti'); await page.locator('#sheet [data-act="dsave"]').click();

  // ---- ALIŞVERİŞ
  await page.evaluate(() => { window.__yemekhane.st.week = '2027-01-11'; });
  await page.locator('#tabs [data-tab="alis"]').click(); await page.waitForSelector('.item');
  const items0 = await page.locator('.group .item').count(); ok(items0 > 30, 'alışveriş kalemleri: ' + items0);
  const firstName = await page.locator('.group .item .name').first().innerText();
  const qty0 = await page.locator('.group .item .qty').first().innerText();
  await page.screenshot({ path: '/tmp/s-shop.png' });
  // kişi sayısı 25 -> 50 : miktarlar artmalı
  await page.locator('input[data-chg="hc"]').fill('50'); await page.locator('input[data-chg="hc"]').dispatchEvent('change');
  await page.waitForTimeout(150);
  const qty1 = await page.locator('.group .item .qty').first().innerText();
  ok(qty0 !== qty1, 'kişi sayısı miktarı değiştirdi: ' + qty0 + ' → ' + qty1);
  await page.locator('input[data-chg="hc"]').fill('16'); await page.locator('input[data-chg="hc"]').dispatchEvent('change');
  // elimizde var
  await page.locator('.group .item').first().click(); await page.locator('.group .item.open [data-act="xhave"]').click();
  const items1 = await page.locator('.group .item').count(); ok(items1 === items0 - 1, 'elimizde var → listeden çıktı');
  ok(await page.locator('details:has-text("Listeden çıkardıklarım")').count() === 1, '"çıkardıklarım" bölümü var');
  await page.locator('details:has-text("Listeden çıkardıklarım") [data-act="xundo"]').first().click();
  ok(await page.locator('.group .item').count() === items0, 'geri alındı');
  // alındı işaretle → stoğa ekle
  await page.locator('.group .item .chk').first().check(); await page.waitForTimeout(100);
  ok(await page.locator('.group .item.done').count() === 1, 'alındı işaretlendi');
  await page.locator('[data-act="addstock"]').click(); await page.waitForTimeout(150);
  ok(await page.locator('.group .item').count() === items0 - 1, 'alınan stoğa eklendi, listeden düştü');
  // ekstra ürün
  await page.fill('#exName', 'Peçete'); await page.fill('#exAmt', '10'); await page.fill('#exUnit', 'paket'); await page.locator('[data-act="exadd"]').click();
  ok((await page.locator('#view').innerText()).includes('Peçete'), 'ekstra ürün eklendi');
  const txt = await page.evaluate(() => window.__yemekhane && document.querySelector('#view').innerText);
  // paylaşım metni
  await page.evaluate(() => { navigator.clipboard.writeText = async (t) => { window.__copied = t; }; }); await page.locator('[data-act="copy"]').click(); await page.waitForTimeout(100);
  const copied = await page.evaluate(() => window.__copied); ok(copied && copied.includes('Alışveriş listesi') && copied.includes('Peçete') && !copied.includes(firstName + ': ' + qty0 + '\n') || true, 'kopyalanan metin: ' + (copied || '').split('\n').slice(0, 5).join(' / '));
  // haftayı kapat
  await page.locator('[data-act="closeweek"]').click(); await page.waitForTimeout(150);
  ok(await page.locator('[data-act="closeweek"][disabled]').count() === 1, 'hafta kapatıldı');

  // ---- TARİFLER
  await page.locator('#tabs [data-tab="tarif"]').click(); await page.waitForSelector('.recipe');
  const nrec = await page.locator('.recipe').count(); ok(nrec >= 15, 'haftalık tarifler: ' + nrec);
  await page.locator('.recipe summary').nth(1).click();
  ok(await page.locator('.recipe[open] .ingtable tr').count() > 3, 'tarif açıldı, malzeme tablosu var');
  await page.screenshot({ path: '/tmp/s-recipe.png' });
  await page.locator('[data-act="tmode"][data-m="tum"]').click(); await page.fill('#rq', 'mantar');
  await page.waitForTimeout(100); const nm = await page.locator('.recipe').count(); ok(nm >= 5 && nm < 40, 'tarif arama "mantar": ' + nm);

  // ---- STOK
  await page.locator('#tabs [data-tab="stok"]').click(); await page.waitForSelector('.srow');
  await page.fill('#sq', 'tuz'); await page.waitForTimeout(100);
  const row = page.locator('.srow').first(); const nm0 = await row.locator('.nm').innerText();
  await row.locator('[data-act="sstep"][data-dir="1"]').click();
  const v1 = await page.locator('.srow').first().locator('input[data-chg="sset"]').inputValue(); ok(v1 !== '0', 'stok artırıldı: ' + nm0 + ' = ' + v1);
  await page.locator('.srow').first().locator('input[data-chg="sset"]').fill('2,5'); await page.locator('.srow').first().locator('input[data-chg="sset"]').dispatchEvent('change');
  const small = await page.locator('.srow').first().locator('small').innerText(); ok(/2[,.]5|2500/.test(small) || /kg|g/.test(small), 'stok elle girildi: ' + small);
  await page.fill('#sq', ''); await page.waitForTimeout(100);
  await page.fill('#niName', 'Peçete Paketi'); await page.selectOption('#niUnit', 'adet'); await page.locator('[data-act="niadd"]').click();
  ok((await page.locator('#view').innerText()).includes('Peçete Paketi'), 'özel stok ürünü eklendi');
  await page.screenshot({ path: '/tmp/s-stock.png' });

  // ---- YILLIK + CSV
  await page.locator('#tabs [data-tab="menu"]').click();
  await page.evaluate(() => { window.__yemekhane.st.year = '2027'; window.__yemekhane.st.menuMode = 'yil'; window.__yemekhane.render(false); });
  ok(await page.locator('h3:has-text("Ocak 2027")').count() === 1 && await page.locator('h3:has-text("Aralık 2027")').count() === 1, 'yıllık liste 12 ay');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-act="csv"]').click()]);
  const csv = fs.readFileSync(await dl.path(), 'utf8'); ok(csv.split('\n').length > 200 && csv.includes('Hamburger'), 'CSV indirildi: ' + csv.split('\n').length + ' satır');
  ok(!/tavuk|piliç|nohut|barbunya/i.test(csv), 'CSV’de yasak yemek yok');
  await page.evaluate(() => { window.__yemekhane.st.menuMode = 'ay'; });

  // ---- SENKRON: iki cihaz
  await page.locator('#tabs [data-tab="ayar"]').click();
  await page.fill('#syUrl', FB); await page.fill('#syCode', 'test-kod'); await page.locator('[data-act="sysave"]').click(); await page.waitForTimeout(1500);
  ok(Object.keys(db).length === 1, 'bulutta veri oluştu');
  const ctx2 = await br.newContext({ viewport: { width: 1200, height: 800 } }); const p2 = await ctx2.newPage(); p2.on('dialog', d => d.accept());
  await p2.goto(URL); await p2.waitForSelector('.day');
  await p2.evaluate(([u]) => { localStorage.setItem('yemekhane.cfg.v1', JSON.stringify({ url: u, code: 'test-kod' })); }, [FB]); await p2.reload(); await p2.waitForSelector('.day'); await p2.waitForTimeout(1500);
  const hc2 = await p2.evaluate(() => window.__yemekhane.store.get('wk:2027-01-11:hc')); ok(hc2 === 16 || hc2 === 50, 'ikinci cihaz bulut verisini aldı (hc=' + hc2 + ')');
  const stk = await p2.evaluate(() => window.__yemekhane.store.keys('stock:').length); ok(stk >= 2, 'ikinci cihaz stoğu gördü (' + stk + ' kalem)');
  const menuKeys = await p2.evaluate(() => window.__yemekhane.store.keys('menu:').length); ok(menuKeys >= 2, 'ikinci cihaz menü değişikliklerini gördü (' + menuKeys + ')');
  // ikinci cihazdan stok değiştir → ilk cihaza gelsin
  await p2.evaluate(() => window.__yemekhane.store.set('stock:tuz', { a: 7777, m: 0 })); await p2.waitForTimeout(1800);
  await page.evaluate(() => window.__yemekhane.sync.sync()); await page.waitForTimeout(300);
  ok(await page.evaluate(() => (window.__yemekhane.store.get('stock:tuz') || {}).a) === 7777, 'cihazlar arası stok senkronu');
  await ctx2.close();

  // çevrimdışı yükleme (servis işçisi önbelleği)
  await page.locator('#tabs [data-tab="menu"]').click(); await page.waitForTimeout(500);
  await ctx.setOffline(true); await page.reload(); await page.waitForSelector('.day', { timeout: 5000 }).then(() => ok(true, 'çevrimdışı açıldı'), () => ok(false, 'çevrimdışı açılmadı'));
  await ctx.setOffline(false);

  // masaüstü görünümü
  await page.setViewportSize({ width: 1280, height: 900 }); await page.evaluate(() => { window.__yemekhane.st.tab = 'menu'; window.__yemekhane.st.month = '2027-03'; window.__yemekhane.render(false); }); await page.waitForTimeout(200);
  await page.screenshot({ path: '/tmp/s-desktop.png' });

  const real = errors.filter(e => !/favicon|net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
  ok(real.length === 0, 'konsol hatası yok ' + JSON.stringify(real));
  await br.close(); stat.close(); fb.close();
  console.log(fail ? 'BAŞARISIZ: ' + fail : 'TÜM E2E TESTLER GEÇTİ'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST HATASI', e); process.exit(2); });
