# Yemekhane Planlayıcı

Şirket yemekhanesi için aylık menü, haftalık alışveriş listesi, tarifler ve stok takibi. Telefon, tablet ve bilgisayarda tarayıcıdan açılır; ana ekrana eklenebilir (PWA), internet yokken de çalışır.

## Özellikler
- 2026-11 → 2028-12 arası hazır menü (Pzt/Salı/Perş: çorba, ana yemek, pilav/makarna, salata, tatlı; Çarşamba: fast food/geleneksel gün; Cuma: kahvaltı). Tavuk yok, sade kuru baklagil yok, sebze yemekleri hep kıymalı/kuşbaşılı, mevsime uygun, tekrarlar aralıklı.
- Haftalık alışveriş listesi (kişi sayısına göre), "elimizde var / gerek yok" ile listeden çıkarma, stoktan otomatik düşme, WhatsApp'a gönderme.
- 140+ tarif, kişi sayısına göre ölçülü malzeme.
- Ana stok listesi (telefondan girilebilir), asgari stok uyarısı.
- Yıllık liste, Excel/CSV, yazdırma.
- **Günlük aşçı kişi sayısı:** Alışveriş haftalık sayıya (örn. 15) göre hesaplanır; Tarifler > Bu haftanın tarifleri ekranında her gün için aşçı o günkü gerçek kişi sayısını seçer, miktarlar ona göre görünür (alışverişi etkilemez).
- **Hafta kilidi:** Menü onaylanınca "Haftayı onayla ve kilitle"; kilitli haftaya gün/hafta/ay yenileme, yemek değiştirme ve kişi sayısı değişikliği dokunamaz.
- **Yanlışlıkla yenilemeye karşı koruma:** Gün/hafta/ay yeniden oluşturma onay ister (ay için yazılı "ONAYLA"), geçmiş ve kilitli günleri korur, 10 dakika içinde "Geri al" ile geri alınır; Ayarlar'dan isteğe bağlı yönetici şifresi.
- **Hafta seçmeli yazdırma:** İstenen haftanın (1-4 hafta) yemek listesi, market listesi ve tarifleri seçilip yazdırılır / PDF yapılır.
- İsteğe bağlı senkron (Firebase Realtime Database) — Ayarlar ekranında adım adım anlatılır.

## Yayınlama (GitHub Pages)
Depo → Settings → Pages → Source: `main` / `(root)` → Save. Adres: `https://KULLANICI.github.io/DEPO/`

## Test
```
node tests/test-data-menu.js
node tests/test-sync.js
python3 tests/e2e-ozellikler.py   # yeni özellikler (Python Playwright)
NODE_PATH=<playwright> node tests/e2e.js
```
Sunucu gerekmez; dosyalar statiktir.

## Yemek listesi sayfası
Tarifler → **Yemek listesi**: tüm yemekler kategorilere göre toplu görünür, aranabilir. **＋ Yeni yemek ekle** ile kendi yemeğinizi (malzeme, miktar, yapılış, sezon) ekleyebilir; listede olmayan malzemeyi tanımlayabilirsiniz. Menü kuralları (tavuk/balık yok, ana yemek kıymalı/kuşbaşılı) form tarafından denetlenir. Eklenen yemekler düzenlenip silinebilir, her yemek için **Menüde kullanma** seçilebilir. Hazır menüler değişmez; yalnızca yeniden oluşturulan menüler yeni havuzu kullanır. Veriler Firebase ile cihazlar arası eşitlenir.

## Stoğa göre menü önerisi
Stok sekmesi → **Stoğa göre menü önerisi**: elinizdeki stok girildikten sonra, seçilen kişi sayısına göre her kategoride (çorba, ana yemek, pilav, salata, tatlı) stokla en çok karşılanan yemekleri ve eksik malzemeleri gösterir; üstte önerilen tam menü yer alır.
