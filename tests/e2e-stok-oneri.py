import subprocess, sys, time
from playwright.sync_api import sync_playwright
PORT=8769
srv=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'-d','.'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
fails=[]; errs=[]
def ok(c,m):
    print(('OK   ' if c else 'HATA ')+m)
    if not c: fails.append(m)
try:
    with sync_playwright() as p:
        b=p.chromium.launch(); pg=b.new_page(viewport={'width':400,'height':820},service_workers='block')
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_selector('.cal')
        pg.click('nav [data-tab=stok]'); pg.click('[data-act=suggest]')
        ok('Önce Stok' in pg.inner_text('#sheet'),'stok boşken uyarı veriyor')
        pg.click('#sheet [data-act=dfcancel]')
        pg.evaluate("""()=>{const s=window.__yemekhane.store;
          s.set('stock:dana-kiyma',{a:5000,m:0});s.set('stock:kuru-sogan',{a:3000,m:0});s.set('stock:domates-salcasi',{a:2000,m:0});}""")
        pg.click('nav [data-tab=menu]'); pg.click('nav [data-tab=stok]'); pg.click('[data-act=suggest]')
        t=pg.inner_text('#sheet')
        ok('Önerilen menü' in t and 'Ana Yemek' in t,'öneri kategorilerle geldi')
        ok('Tamamı stokta' in t or 'malzeme var' in t,'karşılanma durumu görünüyor')
        ok('Eksik:' in t,'eksik malzemeler listeleniyor')
        pg.click('[data-act="sgh+"]'); ok('17' in pg.inner_text('#sheet'),'kişi sayısı artırılabiliyor')
        pg.click('#sheet [data-act=recipe] >> nth=0'); pg.wait_for_timeout(300)
        ok(pg.locator('#sheet .panel').count()==0 or pg.locator('#sheet').is_hidden(),'tarife geçince pencere kapandı')
        b.close()
finally: srv.terminate()
errs=[e for e in errs if 'favicon' not in e and 'ERR_TUNNEL' not in e and 'firebasedatabase' not in e]
ok(not errs,'konsol hatası yok '+str(errs[:3]))
sys.exit(1 if fails else 0)
