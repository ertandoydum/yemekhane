# Yemekhane Planlayıcı

Şirket yemekhanesi için aylık menü, haftalık alışveriş listesi, tarifler ve stok takibi. Telefon, tablet ve bilgisayarda tarayıcıdan açılır; ana ekrana eklenebilir (PWA), internet yokken de çalışır.

## Özellikler
- 2026-11 → 2028-12 arası hazır menü (Pzt/Salı/Perş: çorba, ana yemek, pilav/makarna, salata, tatlı; Çarşamba: fast food/geleneksel gün; Cuma: kahvaltı). Tavuk yok, sade kuru baklagil yok, sebze yemekleri hep kıymalı/kuşbaşılı, mevsime uygun, tekrarlar aralıklı.
- Haftalık alışveriş listesi (kişi sayısına göre), "elimizde var / gerek yok" ile listeden çıkarma, stoktan otomatik düşme, WhatsApp'a gönderme.
- 140+ tarif, kişi sayısına göre ölçülü malzeme.
- Ana stok listesi (telefondan girilebilir), asgari stok uyarısı.
- Yıllık liste, Excel/CSV, yazdırma.
- İsteğe bağlı senkron (Firebase Realtime Database) — Ayarlar ekranında adım adım anlatılır.

## Yayınlama (GitHub Pages)
Depo → Settings → Pages → Source: `main` / `(root)` → Save. Adres: `https://KULLANICI.github.io/DEPO/`

## Test
```
node tests/test-data-menu.js
node tests/test-sync.js
NODE_PATH=<playwright> node tests/e2e.js
```
Sunucu gerekmez; dosyalar statiktir.
