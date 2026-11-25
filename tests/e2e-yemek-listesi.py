# Yemek listesi sayfası testi (Python Playwright): python3 tests/e2e-yemek-listesi.py
import subprocess, sys, time
from playwright.sync_api import sync_playwright
PORT = 8768
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', '.'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
fails, errs = [], []
def ok(c, m):
    print(('OK   ' if c else 'HATA ') + m)
    if not c: fails.append(m)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 400, 'height': 820}, service_workers='block')
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_selector('.cal')
        pg.click('nav [data-tab=tarif]'); pg.click('[data-m=liste]')
        txt = pg.inner_text('#view')
        ok('Yeni yemek ekle' in txt and 'Çorbalar' in txt and 'Ana Yemekler' in txt and 'Tatlılar' in txt, 'yemek listesi kategorilerle açıldı')
        n0 = int(pg.inner_text('.stat .box >> nth=0').split()[-1]); ok(n0 > 60, f'toplam yemek sayısı görünüyor ({n0})')

        pg.click('[data-act=dcat][data-c=T]'); ok(pg.locator('.card.group').count() == 1 and 'Tatlı' in pg.inner_text('.card.group h3'), 'kategori düğmesi yalnızca o kategoriyi gösterir')
        pg.click('[data-act=dcat][data-c=""]'); ok(pg.locator('.card.group').count() == 7, 'Tümü tüm kategorileri gösterir')
        # kural doğrulamaları
        pg.click('[data-act=newdish]'); pg.fill('#df_name', 'Tavuklu Pilav'); pg.click('[data-act=dfsave]')
        ok('tavuk' in pg.inner_text('#dfErr'), 'tavuklu yemek reddedildi')
        pg.fill('#df_name', 'Mantarlı Test Yemeği')
        pg.locator('[data-dfi="0"]').select_option('dana-kuru-sogan' if pg.locator('[data-dfi="0"] option[value="dana-kuru-sogan"]').count() else 'kuru-sogan')
        pg.fill('[data-dfq="0"]', '500'); pg.fill('#df_steps', 'Soğanı kavurun.\nPişirin.'); pg.click('[data-act=dfsave]')
        ok('kıymalı veya kuşbaşı' in pg.inner_text('#dfErr'), 'etsiz ana yemek reddedildi')

        # yeni malzeme tanımla + etli yemek ekle
        pg.click('[data-act=dfnewing]'); pg.fill('#ni_name', 'taze mantar'); pg.click('[data-act=dfsaveing]')
        ok(pg.locator('[data-dfi="1"]').input_value() == 'taze-mantar', 'yeni malzeme tanımlandı ve satıra eklendi')
        pg.fill('[data-dfq="0"]', '1500'); pg.fill('[data-dfq="1"]', '1500')
        pg.click('[data-act=dfaddrow]'); pg.locator('[data-dfi="2"]').select_option('dana-kiyma'); pg.fill('[data-dfq="2"]', '800')
        pg.fill('#df_per', '15'); pg.click('[data-act=dfsave]')
        pg.wait_for_selector('text=Mantarlı Test Yemeği')
        ok(int(pg.inner_text('.stat .box >> nth=0').split()[-1]) == n0 + 1, 'listede yeni yemek görünüyor (toplam +1)')
        ok('Özel' in pg.inner_text('.item:has-text("Mantarlı Test Yemeği")'), 'özel rozeti var')

        # 15 kişilik 1500 g -> 10 kişilik 1000 g olarak saklandı
        q = pg.evaluate("window.__yemekhane.store.get('crec:o-mantarli-test-yemegi').ing.map(x=>x.id+':'+x.q).join()")
        ok(q == 'kuru-sogan:1000,taze-mantar:1000,dana-kiyma:533.33', 'miktarlar 10 kişilik düzene çevrildi: ' + q)

        # günlük menü düzenlemede seçilebiliyor
        pg.click('nav [data-tab=menu]'); pg.click('[data-d="2026-11-24"]'); pg.click('[data-act=day]')
        ok(pg.locator('#sheet option:has-text("Mantarlı Test Yemeği")').count() >= 1, 'günlük menü seçiminde yeni yemek var')
        pg.click('[data-act=close]')

        # menüde kullanma
        pg.click('nav [data-tab=tarif]'); pg.click('[data-m=liste]')
        pg.click('.item:has-text("Mantarlı Test Yemeği") >> .name'); pg.click('.item:has-text("Mantarlı Test Yemeği") >> [data-act=exdish]')
        ok('Menüde yok' in pg.inner_text('.item:has-text("Mantarlı Test Yemeği")'), 'menüde kullanma kapatıldı')
        # düzenle (kart zaten açık)
        pg.click('.item:has-text("Mantarlı Test Yemeği") >> [data-act=editdish]')
        pg.fill('#df_name', 'Mantarlı Test Yemeği 2'); pg.click('[data-act=dfsave]'); pg.wait_for_selector('text=Mantarlı Test Yemeği 2')
        ok(True, 'düzenleme kaydedildi')
        # ara + sil
        pg.fill('#dq', 'mantarlı test'); ok(pg.locator('.item').count() == 1, 'arama çalışıyor')
        if not pg.locator('[data-act=deldish]').is_visible(): pg.click('.item >> .name')
        pg.click('[data-act=deldish]'); pg.click('[data-act=cfok]')
        pg.fill('#dq', ''); ok('Mantarlı Test' not in pg.inner_text('#view'), 'yemek silindi')
        b.close()
finally: srv.terminate()
errs = [e for e in errs if 'favicon' not in e and 'ERR_TUNNEL' not in e and 'firebasedatabase' not in e]
ok(not errs, 'konsol hatası yok ' + str(errs[:3]))
print('\nBAŞARISIZ: %d' % len(fails) if fails else '\nYEMEK LİSTESİ TESTLERİ GEÇTİ'); sys.exit(1 if fails else 0)
