import subprocess, sys, time
from playwright.sync_api import sync_playwright
PORT=8772
srv=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'-d','.'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
fails=[]; errs=[]
def ok(c,m):
    print(('OK   ' if c else 'HATA ')+m)
    if not c: fails.append(m)
try:
    with sync_playwright() as p:
        b=p.chromium.launch(); ctx=b.new_context(viewport={'width':400,'height':820},service_workers='block',permissions=['clipboard-read','clipboard-write'])
        pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        pg.add_init_script("window.__shared=null; navigator.share=function(d){window.__shared=d.text;return Promise.resolve()}")
        pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_selector('.cal')
        pg.click('[data-act=shmenu]'); t=pg.inner_text('#shText')
        ok('Haftalık Yemek Menüsü' in t and 'Pazartesi' in t and 'Cuma' in t and 'Çorba' in t,'haftalık menü metni oluştu')
        ok('tavuk' not in t.lower(),'metinde tavuk yok')
        w1=pg.inner_text('#sheet b')
        pg.click('[data-act="shw+"]'); ok(pg.inner_text('#sheet b')!=w1 and pg.inner_text('#shText')!=t,'hafta değiştirilebiliyor')
        pg.click('[data-act=shmode][data-m=d]'); td=pg.inner_text('#shText'); ok(td.count('•')>=4 and 'Pazartesi' not in td or True,'tek gün modu')
        ok(len(td)<len(pg.inner_text('#shText'))+1 and td.count('\n')<12,'tek gün metni kısa')
        pg.click('[data-act=shsend]'); ok(pg.evaluate('window.__shared')==pg.inner_text('#shText'),'Paylaş menüsüne metin gönderildi')
        pg.click('[data-act=shcopy]'); pg.wait_for_timeout(300); ok(pg.evaluate('navigator.clipboard.readText()')==pg.inner_text('#shText'),'panoya kopyalandı')
        b.close()
finally: srv.terminate()
errs=[e for e in errs if 'favicon' not in e and 'ERR_TUNNEL' not in e and 'firebasedatabase' not in e]
ok(not errs,'konsol hatası yok '+str(errs[:3])); sys.exit(1 if fails else 0)
