# Yeni özellikler testi: günlük aşçı kişi sayısı, hafta kilidi, yeniden oluşturma koruması, şifre, hafta seçmeli yazdırma
# Çalıştırma: python3 tests/e2e-ozellikler.py   (Python Playwright gerekir)
import subprocess, sys, time, json
from playwright.sync_api import sync_playwright
PORT = 8767
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', '.'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
fails, errs = [], []
def ok(c, m):
    print(('OK   ' if c else 'HATA ') + m)
    if not c: fails.append(m)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 400, 'height': 820}, service_workers='block')
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('dialog', lambda d: d.accept())
        pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_selector('.cal')
        day = lambda d: json.dumps(pg.evaluate(f"__yemekhane.getDay('{d}')"), sort_keys=True)

        # 1) Aşçı günlük kişi sayısı, alışveriş sayısından bağımsız
        pg.click('nav [data-tab=tarif]'); pg.wait_for_selector('.cookbox')
        before = pg.inner_text('details.recipe >> nth=0') ; pg.locator('details.recipe >> nth=0').evaluate('e=>e.open=true')
        t16 = pg.inner_text('details.recipe >> nth=0')
        for _ in range(4): pg.click('.cookbox >> nth=0 >> [data-act="chc+"]')
        pg.locator('details.recipe >> nth=0').evaluate('e=>e.open=true')
        t20 = pg.inner_text('details.recipe >> nth=0')
        ok('16 kişilik' in t16 and '20 kişilik' in t20 and t16 != t20, 'günlük kişi sayısı 16->20: tarif miktarları değişti')
        ok(pg.evaluate("__yemekhane.shopData(__yemekhane.st.week).hc") == 16, 'alışveriş kişi sayısı 16 olarak kaldı')
        pg.click('.cookbox >> nth=0 >> [data-act="chcreset"]')
        ok('16 kişilik' in pg.inner_text('.dayhead >> nth=0'), 'alışveriş sayısına dön çalışıyor')

        # 2) Kilit: 2026-12-07 haftası
        pg.click('nav [data-tab=menu]'); pg.click('[data-act=mnext]'); pg.click('[data-d="2026-12-07"]')
        pg.click('[data-act=lock]'); ok('Kilitle' in pg.inner_text('#sheet'), 'kilit onay penceresi açıldı')
        pg.click('[data-act=cfok]')
        ok('Hafta onaylı' in pg.inner_text('#daycard'), 'hafta kilitlendi')
        ok(pg.locator('[data-act=wregen]:disabled').count() == 1, 'kilitli haftada "haftayı yenile" kapalı')
        pg.click('[data-act=day]'); ok('değiştirilemez' in pg.inner_text('#sheet'), 'kilitli gün düzenlenemiyor'); pg.click('[data-act=close]')
        locked_before = day('2026-12-07') + day('2026-12-10')
        open_before = day('2026-12-14') + day('2026-12-15')

        # 3) Ay yeniden oluştur: yazılı onay, kilitli korunur, geri al
        pg.click('[data-act=mregen]')
        pg.fill('#cfWord', 'yanlis'); pg.click('[data-act=cfok]')
        ok('yanlış' in pg.inner_text('#cfErr'), 'yazılı onay yanlışsa ay yenilenmiyor')
        pg.fill('#cfWord', 'onayla'); pg.click('[data-act=cfok]')
        ok(day('2026-12-07') + day('2026-12-10') == locked_before, 'kilitli hafta ay yenilemede değişmedi')
        ok(day('2026-12-14') + day('2026-12-15') != open_before, 'kilitsiz hafta yenilendi')
        pg.wait_for_selector('.undobar'); pg.click('[data-act=undo]')
        ok(day('2026-12-14') + day('2026-12-15') == open_before, 'geri al eski menüyü getirdi')

        # 4) Şifre
        pg.click('nav [data-tab=ayar]'); pg.fill('#pinNew', '1234'); pg.click('[data-act=pinset]')
        pg.click('nav [data-tab=menu]'); pg.click('[data-d="2026-12-14"]'); pg.click('[data-act=wregen]')
        pg.fill('#cfPin', '0000'); pg.click('[data-act=cfok]'); ok('Şifre yanlış' in pg.inner_text('#cfErr'), 'yanlış şifre reddedildi')
        pg.fill('#cfPin', '1234'); pg.click('[data-act=cfok]')
        ok(day('2026-12-14') + day('2026-12-15') != open_before, 'doğru şifreyle hafta yenilendi')
        pg.click('[data-act=undo]')

        # 5) Hafta seçmeli yazdırma
        pg.evaluate("window.print = () => { window.__printed = true }")
        pg.click('nav [data-tab=alis]'); pg.click('[data-act=print]')
        pg.select_option('#psStart', '2026-12-07'); pg.select_option('#psCount', '2')
        pg.check('#psMenu'); pg.check('#psMarket')
        pg.click('[data-act=doprint]'); pg.wait_for_timeout(300)
        html = pg.evaluate("document.getElementById('printArea').innerHTML")
        ok(html.count('Haftalık Yemek Listesi') == 2 and html.count('Market Listesi') == 2, 'çıktı: seçilen 2 hafta için menü + market')
        ok('7 Aralık' in html and '14 Aralık' in html, 'çıktı seçilen haftaları içeriyor')
        ok(pg.evaluate("window.__printed") is True and pg.evaluate("document.body.classList.contains('pa')"), 'yazdırma tetiklendi')
        pg.emulate_media(media='print'); pg.screenshot(path='/tmp/print_shot.png', full_page=True); pg.emulate_media(media='screen')
        b.close()
finally:
    srv.terminate()
errs = [e for e in errs if 'favicon' not in e and 'ERR_TUNNEL' not in e and 'firebasedatabase' not in e]
ok(not errs, 'konsol hatası yok ' + str(errs[:3]))
print('\nBAŞARISIZ: %d' % len(fails) if fails else '\nYENİ ÖZELLİK TESTLERİ GEÇTİ')
sys.exit(1 if fails else 0)
