/* Yemekhane – malzeme ve tarif veritabanı
   Tüm miktarlar 10 KİŞİLİK porsiyon içindir (g / ml / adet / demet).
   Kurallar: tavuk YOK, sade kuru baklagil (nohut, kuru fasulye vb.) YOK,
   sebze yemekleri hep kıymalı veya kuşbaşı etli. */
(function (root) {
  'use strict';

  var CATS = {
    ET: 'Et & Şarküteri',
    SEB: 'Sebze & Yeşillik',
    MEY: 'Meyve',
    SUT: 'Süt, Yumurta & Kahvaltılık',
    TAH: 'Bakliyat, Tahıl, Makarna & Hamur',
    FIR: 'Fırın & Unlu Mamul',
    YAG: 'Yağ, Salça & Soslar',
    BAH: 'Baharat & Katkı',
    KUR: 'Kuru Gıda & Tatlı Malzemesi',
    DIG: 'Diğer / Sarf'
  };

  // ad|birim|kategori
  var MASTER = [
    'dana kıyma|g|ET', 'dana kuşbaşı|g|ET', 'sucuk|g|ET',
    'kuru soğan|g|SEB', 'sarımsak|g|SEB', 'domates|g|SEB', 'sivri biber|g|SEB', 'dolmalık biber|g|SEB',
    'patlıcan|g|SEB', 'kabak|g|SEB', 'patates|g|SEB', 'havuç|g|SEB', 'kereviz|g|SEB', 'pırasa|g|SEB',
    'ıspanak|g|SEB', 'karnabahar|g|SEB', 'brokoli|g|SEB', 'beyaz lahana|g|SEB', 'kırmızı lahana|g|SEB',
    'pancar|g|SEB', 'bal kabağı|g|SEB', 'semizotu|g|SEB', 'taze fasulye|g|SEB', 'bamya|g|SEB',
    'mantar|g|SEB', 'salatalık|g|SEB', 'bezelye (dondurulmuş)|g|SEB', 'mısır (konserve)|g|SEB',
    'turşu (salatalık)|g|SEB', 'asma yaprağı|g|SEB', 'marul|adet|SEB', 'roka|demet|SEB',
    'maydanoz|demet|SEB', 'dereotu|demet|SEB', 'taze soğan|demet|SEB', 'limon|adet|SEB',
    'mevsim meyvesi|g|MEY', 'elma|g|MEY', 'ayva|g|MEY', 'muz|g|MEY',
    'süt|ml|SUT', 'yoğurt|g|SUT', 'ayran|ml|SUT', 'tereyağı|g|SUT', 'kaşar peyniri|g|SUT',
    'beyaz peynir|g|SUT', 'krema|ml|SUT', 'yumurta|adet|SUT', 'zeytin|g|SUT', 'bal|g|SUT',
    'reçel|g|SUT', 'çikolatalı krem|g|SUT',
    'pirinç|g|TAH', 'bulgur (pilavlık)|g|TAH', 'bulgur (ince/köftelik)|g|TAH', 'kırmızı mercimek|g|TAH',
    'tel şehriye|g|TAH', 'arpa şehriye|g|TAH', 'makarna (burgu)|g|TAH', 'spagetti|g|TAH', 'erişte|g|TAH',
    'mantı (hazır)|g|TAH', 'yarma|g|TAH', 'irmik|g|TAH', 'un|g|TAH', 'nişasta|g|TAH', 'galeta unu|g|TAH',
    'tarhana|g|TAH', 'yufka|adet|TAH', 'kadayıf (tel)|g|TAH',
    'ekmek|adet|FIR', 'hamburger ekmeği|adet|FIR', 'köfte ekmeği|adet|FIR', 'tost ekmeği|adet|FIR',
    'simit|adet|FIR', 'lahmacun (hazır)|adet|FIR', 'kuru maya|g|FIR',
    'ayçiçek yağı|ml|YAG', 'zeytinyağı|ml|YAG', 'domates salçası|g|YAG', 'biber salçası|g|YAG',
    'nar ekşisi|ml|YAG', 'limon suyu|ml|YAG', 'mayonez|g|YAG', 'ketçap|g|YAG', 'hardal|g|YAG',
    'dana bulyon|adet|YAG',
    'tuz|g|BAH', 'karabiber|g|BAH', 'pul biber|g|BAH', 'kimyon|g|BAH', 'kuru nane|g|BAH', 'kekik|g|BAH',
    'tarçın|g|BAH', 'sumak|g|BAH', 'kabartma tozu|g|BAH', 'vanilin|adet|BAH', 'defne yaprağı|adet|BAH',
    'toz şeker|g|KUR', 'kakao|g|KUR', 'ceviz|g|KUR', 'kuru üzüm|g|KUR', 'kuru kayısı|g|KUR',
    'hindistan cevizi|g|KUR', 'bisküvi|g|KUR', 'çay|g|KUR', 'tahin|g|KUR'
  ];

  // Kategori kodları: C çorba, A ana yemek, P pilav/makarna (2. yemek), S salata, T tatlı,
  //                   F fast food / geleneksel gün parçaları, K kahvaltı parçaları
  // Satır: Ad|Kat|etiketler|sezon(ay-ay)|malzemeler (ad miktar, ...)|adımlar (~ ile ayrılır)
  var RECIPES = [
    // ---------------- ÇORBALAR ----------------
    'Kıymalı Yayla Çorbası|C|yogurt,pirinc|-|yoğurt 700, pirinç 120, dana kıyma 400, yumurta 2, un 40, tereyağı 60, kuru nane 10, tuz 30|Kıymayı tereyağında kavurup 2,5 litre su ekleyin, pirinci katıp haşlayın.~Yoğurt, yumurta ve unu çırpıp sıcak çorbayla açın.~Karışımı çorbaya ekleyip kısık ateşte karıştırarak kaynatın.~Nane ve tereyağıyla servis edin.',
    'Etli Sebze Çorbası|C|havuc,patates|-|dana kuşbaşı 500, patates 500, havuç 300, kuru soğan 200, domates salçası 40, ayçiçek yağı 60, tuz 35, karabiber 3|Kuşbaşı eti yağda suyunu çekene kadar kavurun, soğanı ekleyin.~Salçayı ve doğranmış sebzeleri katıp 3 litre su ilave edin.~Et ve sebzeler yumuşayana kadar 45 dk pişirin, baharatlayıp servis edin.',
    'Kereviz Çorbası|C|kereviz,sut|10-3|kereviz 1500, patates 400, kuru soğan 200, süt 400, tereyağı 60, tuz 30, karabiber 3|Soğan ve doğranmış kerevizi tereyağında 5 dk kavurun.~Patatesi ekleyip 2 litre sıcak suyla yumuşayana dek pişirin.~Blenderdan geçirip sütü ekleyin, 5 dk kaynatıp baharatlayın.',
    'Karnabahar Çorbası|C|karnabahar,sut|10-3|karnabahar 1500, patates 300, kuru soğan 200, süt 400, tereyağı 60, tuz 30, karabiber 3|Soğanı tereyağında kavurun, karnabahar ve patatesi ekleyin.~2 litre su ile yumuşayana kadar pişirin.~Blenderdan geçirip süt ekleyin, 5 dk kaynatın.',
    'Mercimekli Sebze Çorbası|C|mercimek,havuc|-|kırmızı mercimek 500, havuç 300, patates 300, kabak 300, kuru soğan 200, ayçiçek yağı 80, tuz 35, kimyon 4|Soğanı yağda kavurup doğranmış sebzeleri ekleyin.~Mercimeği yıkayıp 3 litre suyla birlikte yumuşayana kadar pişirin.~Kısmen ezip kimyon ve tuzla tatlandırın.',
    'Pancar Çorbası|C|pancar,yogurt|10-4|pancar 1000, patates 300, yoğurt 400, kuru soğan 200, tereyağı 60, tuz 30, dereotu 1|Soğan ve rendelenmiş pancarı tereyağında kavurun.~Patates ve 2,5 litre su ekleyip yumuşayana kadar pişirin.~Blenderdan geçirip ılıtın, yoğurdu ekleyin, dereotuyla servis edin.',
    'Mantı Çorbası|C|hamur,yogurt|-|mantı (hazır) 500, yoğurt 500, domates salçası 50, tereyağı 60, kuru nane 8, pul biber 5, tuz 25|Mantıları kaynar tuzlu suda 8 dk haşlayın.~Yoğurdu bir kepçe sıcak suyla açıp çorbaya ekleyin.~Tereyağında salça, nane ve pul biberi kızdırıp üzerine gezdirin.',
    'Lebeniye Çorbası|C|yogurt,bulgur|-|yoğurt 700, bulgur (pilavlık) 150, un 40, yumurta 2, tereyağı 60, kuru nane 8, tuz 30|Bulguru 2,5 litre suda haşlayın.~Yoğurt, un ve yumurtayı çırpıp sıcak çorbayla açın, çorbaya ekleyin.~Sürekli karıştırarak kaynatın, nane ve tereyağıyla servis edin.',
    'Domatesli Şehriye Çorbası|C|sehriye,domates|-|tel şehriye 200, domates 1000, kuru soğan 150, domates salçası 40, tereyağı 60, tuz 30, karabiber 3|Soğan ve rendelenmiş domatesi salçayla birlikte tereyağında kavurun.~2,5 litre sıcak su ekleyip kaynatın.~Şehriyeyi katıp 8 dk pişirin, baharatlayın.',
    'Süzme Mercimek Çorbası|C|mercimek|-|kırmızı mercimek 800, kuru soğan 250, havuç 200, patates 200, ayçiçek yağı 100, tereyağı 50, tuz 40, kimyon 5, pul biber 5, limon 3|Soğan, havuç ve patatesi küp doğrayıp yağda 5 dk kavurun.~Yıkanmış mercimek ve 3,5 litre sıcak su ekleyip sebzeler yumuşayana kadar (yaklaşık 30 dk) pişirin.~Blenderdan geçirip tuz ve kimyonla tatlandırın, kıvamı sıcak suyla ayarlayın.~Tereyağında pul biberi yakıp üzerine gezdirin, limon dilimiyle servis edin.',
    'Ezogelin Çorbası|C|mercimek,bulgur|-|kırmızı mercimek 500, bulgur (pilavlık) 150, pirinç 100, kuru soğan 200, domates salçası 80, biber salçası 40, ayçiçek yağı 100, tuz 40, kuru nane 10, pul biber 8, limon 2|Soğanı yağda kavurup salçaları ekleyin, kokusu çıkana kadar çevirin.~Yıkanmış mercimek, bulgur ve pirinci ekleyip 3,5 litre sıcak suyla 35-40 dk pişirin.~Tuzunu ekleyin; nane ve pul biberi yağda yakıp çorbaya katın.~Limon dilimiyle sıcak servis edin.',
    'Domates Çorbası|C|domates|-|domates 1500, un 60, tereyağı 60, süt 300, kaşar peyniri 100, tuz 35, toz şeker 10, karabiber 3|Domatesleri rendeleyip tereyağında 10 dk kavurun.~Un ekleyip kokusu çıkana kadar çevirin, 2,5 litre sıcak su ilave edin.~15 dk pişirip blenderdan geçirin; süt, tuz ve şekeri ekleyip bir taşım kaynatın.~Üzerine rendelenmiş kaşar serperek servis edin.',
    'Tarhana Çorbası|C|tarhana|-|tarhana 400, tereyağı 60, domates salçası 50, kuru nane 5, pul biber 5, tuz 15|Tarhanayı 1 litre soğuk suda topaksız açın.~Salçayı tereyağında kavurup tarhana karışımını ve 2 litre sıcak suyu ekleyin.~Sürekli karıştırarak 20 dk pişirin, tuzunu ayarlayın.~Nane ve pul biberi tereyağında yakıp üzerine gezdirin.',
    'Yayla Çorbası|C|yogurt,pirinc|-|yoğurt 800, pirinç 120, yumurta 2, un 40, tereyağı 60, kuru nane 10, tuz 30|Pirinci 2,5 litre suda yumuşayana dek haşlayın.~Yoğurt, yumurta ve unu çırpıp 2 kepçe sıcak çorbayla yavaşça açın.~Karışımı tencereye ekleyip kesilmemesi için sürekli karıştırarak kaynatın.~Tereyağında nane yakıp üzerine gezdirin.',
    'Düğün Çorbası|C|yogurt,yumurta|-|dana kuşbaşı 400, un 100, tereyağı 80, yoğurt 300, yumurta 2, limon suyu 60, tuz 35, pul biber 5|Eti düdüklü tencerede yumuşayana kadar haşlayıp didikleyin; et suyunu ayırın.~Tereyağında unu kavurun, 3 litre et suyu (eksiği su) ekleyip 10 dk kaynatın.~Yoğurt, yumurta ve limon suyunu çırpıp sıcak çorbayla açın, tencereye alın; didiklenmiş eti ekleyin.~Tereyağında pul biberi yakıp üzerine gezdirerek servis edin.',
    'Sebze Çorbası|C|havuc,patates|-|patates 400, havuç 300, kabak 300, kuru soğan 150, domates salçası 40, ayçiçek yağı 80, tuz 35, karabiber 3, maydanoz 1|Sebzeleri küp doğrayıp soğanla birlikte yağda kavurun.~Salça ve 3 litre sıcak su ekleyip sebzeler yumuşayana dek pişirin.~İsterseniz blenderdan geçirin; tuz ve karabiberle tatlandırın.~Doğranmış maydanozla servis edin.',
    'Şehriye Çorbası|C|sehriye|-|tel şehriye 250, domates salçası 60, tereyağı 60, tuz 35, karabiber 3|Tereyağında salçayı kavurun.~Şehriyeyi ekleyip 1-2 dk çevirin, 3 litre sıcak su ilave edin.~12-15 dk pişirip tuz ve karabiberle servis edin.',
    'Kremalı Mantar Çorbası|C|mantar,sut|-|mantar 700, un 70, tereyağı 70, süt 800, krema 200, kuru soğan 100, tuz 30, karabiber 5|Soğan ve doğranmış mantarı tereyağında suyunu çekene kadar kavurun.~Un ekleyip 2 dk çevirin, 2 litre sıcak su ve sütü ilave edin.~15 dk pişirip blenderdan geçirin, kremayı ekleyip bir taşım kaynatın.~Tuz ve karabiberle servis edin.',
    'Brokoli Çorbası|C|brokoli,sut|10-4|brokoli 1000, patates 250, kuru soğan 150, tereyağı 60, süt 500, krema 100, tuz 30, karabiber 3|Soğanı tereyağında kavurun; patates ve brokoliyi ekleyin.~2,5 litre sıcak suyla sebzeler yumuşayana kadar pişirin.~Blenderdan geçirip süt ve kremayı ekleyin, bir taşım kaynatın.~Tuz, karabiberle servis edin.',
    'Kremalı Havuç Çorbası|C|havuc,sut|-|havuç 1000, patates 250, kuru soğan 150, tereyağı 60, süt 400, tuz 30, karabiber 3, kimyon 3|Soğan ve doğranmış havucu tereyağında 5 dk kavurun.~Patatesi ve 2,5 litre sıcak suyu ekleyip yumuşayana dek pişirin.~Blenderdan geçirin, süt, tuz, karabiber ve kimyonu ekleyip kaynatın.',
    'Bal Kabağı Çorbası|C|kabak,sut|10-3|bal kabağı 1500, kuru soğan 150, tereyağı 60, süt 400, tuz 30, karabiber 3, tarçın 2|Soğanı tereyağında kavurup küp doğranmış kabağı ekleyin.~2,5 litre sıcak suyla kabak ezilecek kıvama gelene kadar pişirin.~Blenderdan geçirip süt ve baharatları ekleyin, 5 dk kaynatın.',
    'Ispanak Çorbası|C|ispanak,yogurt|10-4|ıspanak 800, kuru soğan 150, pirinç 80, yoğurt 250, un 40, tereyağı 60, tuz 30, karabiber 3|Soğanı tereyağında kavurup pirinç ve 2,5 litre sıcak suyu ekleyin; 15 dk pişirin.~Doğranmış ıspanağı ekleyip 10 dk daha pişirin.~Yoğurt ve unu çırpıp çorbayla açarak tencereye alın, karıştırarak 5 dk kaynatın.',
    'Toyga Çorbası|C|yogurt,yarma|-|yoğurt 800, yarma 150, yumurta 1, un 40, tereyağı 60, kuru nane 10, tuz 30|Yarmayı 2,5 litre suda yumuşayana kadar haşlayın.~Yoğurt, yumurta ve unu çırpıp sıcak çorbayla açın, tencereye ekleyip karıştırarak kaynatın.~Tereyağında nane yakıp üzerine gezdirin.',
    'Un Çorbası|C|sut,un|-|un 150, tereyağı 100, süt 1000, kaşar peyniri 100, tuz 30, karabiber 3|Tereyağında unu hafif kızarana kadar kavurun.~Sütü ve 2 litre sıcak suyu azar azar ekleyerek topaklanmadan çırpın.~10-12 dk kaynatıp tuz ve karabiberi ekleyin; üzerine rendelenmiş kaşar serpin.',
    'Kıymalı Lahana Çorbası|C|lahana|10-3|beyaz lahana 800, dana kıyma 200, kuru soğan 150, havuç 150, domates salçası 50, ayçiçek yağı 80, tuz 30, karabiber 3|Kıymayı ve soğanı yağda kavurun; salçayı ekleyin.~İnce doğranmış lahana ve havucu ilave edip 3 litre sıcak suyla 30 dk pişirin.~Tuz ve karabiberle servis edin.',
    'Kremalı Patates Çorbası|C|patates|-|patates 1000, kuru soğan 150, tereyağı 60, süt 400, kaşar peyniri 100, tuz 30, karabiber 3|Soğanı tereyağında kavurun, küp patatesleri ekleyin.~2,5 litre sıcak suyla patatesler ezilecek kıvama gelene dek pişirin.~Blenderdan geçirip süt ekleyin, 5 dk kaynatın; rendelenmiş kaşarla servis edin.',
    'Soğan Çorbası|C|sogan|-|kuru soğan 1000, tereyağı 80, un 50, dana bulyon 3, kaşar peyniri 150, ekmek 2, tuz 20, karabiber 3|Yarım ay doğranmış soğanı tereyağında 20 dk karamelize olana dek kavurun.~Un ekleyip 2 dk çevirin; bulyon ve 3 litre sıcak suyu ilave edip 20 dk pişirin.~Kasenin üzerine kaşarlı ekmek dilimi koyup fırında 5 dk gratine edin.',
    'Pırasa Çorbası|C|pirasa|10-3|pırasa 1000, patates 300, kuru soğan 100, tereyağı 60, süt 300, tuz 30, karabiber 3|Soğan ve doğranmış pırasayı tereyağında kavurun.~Patates ve 2,5 litre sıcak su ekleyip yumuşayana kadar pişirin.~Blenderdan geçirip süt ekleyin, bir taşım kaynatıp servis edin.',

    'Sakız Kabak Çorbası|C|kabak,sut|5-10|kabak 1500, patates 250, kuru soğan 150, tereyağı 60, süt 400, tuz 30, karabiber 3, dereotu 1|Soğanı tereyağında kavurup doğranmış kabak ve patatesi ekleyin.~2,5 litre sıcak suyla yumuşayana kadar pişirin.~Blenderdan geçirin, süt ve baharatı ekleyip bir taşım kaynatın; dereotuyla servis edin.',
    'Terbiyeli Pirinç Çorbası|C|pirinc,yumurta|-|pirinç 200, yumurta 2, limon suyu 80, un 40, tereyağı 60, tuz 30, karabiber 3, maydanoz 1|Pirinci 3 litre suda yumuşayana kadar haşlayın.~Yumurta, un ve limon suyunu çırpıp sıcak çorbayla açın, tencereye ekleyin; karıştırarak 5 dk kaynatın.~Tereyağını eritip üzerine gezdirin, maydanozla servis edin.',
    'Bulgur Çorbası|C|bulgur,domates|-|bulgur (ince/köftelik) 250, domates 600, kuru soğan 150, domates salçası 50, ayçiçek yağı 80, tuz 35, pul biber 5, kuru nane 5|Soğanı yağda kavurup salçayı ve rendelenmiş domatesi ekleyin.~Bulguru ekleyip 3 litre sıcak suyla 25 dk pişirin.~Tuz, pul biber ve naneyle servis edin.',

    // ---------------- ANA YEMEKLER (kıymalı / kuşbaşılı) ----------------
    'Fırın Köfte Patates|A|kofte,patates|-|dana kıyma 1500, patates 2000, kuru soğan 300, yumurta 3, galeta unu 150, domates 500, sivri biber 300, ayçiçek yağı 100, tuz 40, karabiber 5, kimyon 5|Kıyma, rendelenmiş soğan, yumurta, galeta unu ve baharatı yoğurup köfte şekli verin.~Patatesleri halka doğrayıp tepsiye dizin, üzerine köfteleri yerleştirin.~Domates ve biberi ekleyip yağ ve 1 su bardağı suyla 190 derecede 50 dk pişirin.',
    'Terbiyeli Köfte|A|kofte,havuc|-|dana kıyma 1500, pirinç 150, kuru soğan 300, havuç 400, patates 500, yumurta 2, yoğurt 300, un 60, tereyağı 60, tuz 40, karabiber 4|Kıyma, soğan, pirinç ve baharattan küçük köfteler yapın.~Kaynayan tuzlu suda havuç ve patatesle birlikte 30 dk pişirin.~Yoğurt, yumurta ve unu çırpıp sıcak sularla açın, yemeğe ekleyip 5 dk kaynatın.~Tereyağında yakılmış pul biberle servis edin.',
    'Kıymalı Patlıcan Oturtma|A|patlican|5-10|patlıcan 2500, dana kıyma 1000, kuru soğan 300, domates 700, sivri biber 300, ayçiçek yağı 400, domates salçası 50, tuz 40, karabiber 4|Patlıcanları alaca soyup kızartın.~Kıymayı soğan, salça ve baharatla kavurun.~Patlıcanları tepsiye dizip içlerine harcı koyun, üzerine domates ve biber yerleştirin.~1 su bardağı su ekleyip 190 derecede 30 dk pişirin.',
    'Soslu Köfte|A|kofte,domates|-|dana kıyma 1500, kuru soğan 300, yumurta 2, galeta unu 150, domates 1000, domates salçası 80, ayçiçek yağı 150, tuz 40, karabiber 5, kimyon 5|Kıymayı soğan, yumurta, galeta unu ve baharatla yoğurup köfteleri şekillendirin, kızartın.~Salçayı yağda kavurup rendelenmiş domates ve 2 bardak su ekleyin, sos kıvam alana dek pişirin.~Köfteleri sosa katıp 10 dk kaynatın.',
    'Pilav Üstü Kuşbaşı Et|A|kebap|-|dana kuşbaşı 1800, kuru soğan 300, tereyağı 80, ayçiçek yağı 60, dana bulyon 2, tuz 35, karabiber 5|Eti yağsız tencerede kendi suyunda 20 dk kapağı kapalı pişirin.~Soğan ve tereyağını ekleyip kavurun, sıcak su ve bulyon katın.~Et yumuşayana kadar 50 dk pişirin; pirinç pilavı üzerinde servis edin.',
    'Kuşbaşılı Kabak Yemeği|A|kabak|6-10|dana kuşbaşı 1000, kabak 2000, kuru soğan 300, domates 600, domates salçası 50, ayçiçek yağı 100, tuz 40, karabiber 4|Eti soğanla yağda mühürleyip salçayı ekleyin, 1 litre su katıp 40 dk pişirin.~Kabakları iri doğrayıp domatesle birlikte ekleyin.~Kabaklar yumuşayana kadar 20 dk pişirin.',
    'Kıymalı Taze Fasulye|A|taze-fasulye|5-10|taze fasulye 2000, dana kıyma 800, kuru soğan 300, domates 800, domates salçası 50, ayçiçek yağı 100, tuz 40, karabiber 4|Kıymayı soğanla kavurun, salçayı ekleyin.~Ayıklanmış fasulye ve domatesi ilave edip 2 bardak su ekleyin.~Kısık ateşte fasulyeler yumuşayana kadar 45 dk pişirin.',
    'Etli Pırasa|A|pirasa|10-3|pırasa 2500, dana kuşbaşı 1000, havuç 400, kuru soğan 250, pirinç 100, ayçiçek yağı 100, limon suyu 60, tuz 40, toz şeker 10|Eti soğanla kavurup 1 litre su ekleyerek 40 dk haşlayın.~Halka doğranmış pırasa, havuç ve pirinci ekleyin.~25 dk daha pişirip limon suyu ve şekerle tatlandırın.',
    'Kıymalı Brokoli Graten|A|brokoli,sut,peynir|10-4|brokoli 2500, dana kıyma 900, kuru soğan 250, süt 700, un 80, tereyağı 80, kaşar peyniri 400, tuz 35, karabiber 4|Brokoliyi 5 dk haşlayıp tepsiye alın.~Kıymayı soğanla kavurup üzerine yayın.~Tereyağı, un ve sütle beşamel yapıp dökün, kaşar serpin.~200 derecede üstü kızarana dek 25 dk fırınlayın.',
    'Alinazik|A|kebap,patlican,yogurt|6-10|patlıcan 2500, dana kuşbaşı 1500, yoğurt 800, sarımsak 40, kuru soğan 250, ayçiçek yağı 100, tereyağı 60, domates salçası 40, tuz 40|Patlıcanları közleyip soyun, ince kıyıp sarımsaklı yoğurtla karıştırın.~Kuşbaşıyı soğan ve salçayla yağda yumuşayana dek pişirin.~Patlıcanlı yoğurtlu karışımı tabağa yayıp üzerine sıcak eti koyun, yakılmış tereyağı gezdirin.',
    'Kuşbaşı Tencere Kebabı|A|kebap,biber|-|dana kuşbaşı 1800, sivri biber 400, domates 800, kuru soğan 300, sarımsak 20, domates salçası 50, ayçiçek yağı 100, tuz 40, karabiber 5, pul biber 4|Eti yağda mühürleyin, soğan ve sarımsağı ekleyip kavurun.~Salça, biber ve domatesi katıp sıcak suyla kapağı kapalı 60 dk pişirin.~Baharatlayıp sıcak servis edin.',
    'Fırın Mantarlı Köfte|A|kofte,mantar|-|dana kıyma 1500, mantar 800, kuru soğan 300, yumurta 2, galeta unu 150, kaşar peyniri 300, ayçiçek yağı 100, tuz 40, karabiber 4|Kıyma, rendelenmiş soğan, yumurta, galeta ve baharattan köfteleri yoğurun, tepsiye dizin.~Dilimlenmiş mantarı aralarına koyup yağ gezdirin.~190 derecede 35 dk pişirin, son 5 dk kaşar serpin.',
    'Çiftlik Kebabı|A|kebap,patates|-|dana kuşbaşı 1800, patates 2000, kuru soğan 300, domates salçası 60, ayçiçek yağı 600, tereyağı 60, tuz 40, karabiber 5, pul biber 5|Kuşbaşıyı soğanla kendi suyunda yumuşayana dek pişirin, salça ekleyip kavurun.~Patatesleri küp doğrayıp kızartın.~Eti ve patatesi tepsiye karıştırın, tereyağlı pul biberle servis edin.',
    'Patates Musakka|A|patates|-|patates 2500, dana kıyma 1000, kuru soğan 300, domates 800, sivri biber 300, ayçiçek yağı 300, domates salçası 50, tuz 40, karabiber 4|Patatesleri dilimleyip kızartın.~Kıymayı soğan, biber, salça ve domatesle kavurun.~Tepsiye patates ve harcı katlayarak dizin, 1 bardak su ekleyip 190 derecede 30 dk pişirin.',
    'Sandık Kebabı|A|kebap,biber,patlican|6-10|dana kuşbaşı 1500, patlıcan 1500, patates 1000, sivri biber 400, domates 800, kuru soğan 300, sarımsak 20, ayçiçek yağı 300, domates salçası 50, tuz 40, karabiber 4|Patlıcan ve patatesi kızartın.~Kuşbaşıyı soğan ve salçayla yarı pişene dek kavurun.~Tüm malzemeyi tepsiye dizip su ekleyin, 190 derecede 40 dk pişirin.',
    'Kıymalı Yufka Sarması (Beyti)|A|kofte,hamur,yogurt|-|yufka 12, dana kıyma 1500, kuru soğan 250, sarımsak 20, domates salçası 60, yoğurt 600, tereyağı 100, tuz 40, karabiber 5, pul biber 5|Kıymayı soğan, sarımsak ve baharatla pişirin.~Yufkaları ikiye kesip harcı yerleştirin, rulo yapıp tepsiye dizin.~190 derecede 25 dk pişirin; yoğurt ve tereyağlı salçalı soslarla servis edin.',
    'İçli Köfte (Fırın)|A|kofte,bulgur|-|bulgur (ince/köftelik) 900, dana kıyma 1000, kuru soğan 300, un 150, ayçiçek yağı 150, domates salçası 40, ceviz 100, tuz 40, karabiber 4, pul biber 5|Bulguru ılık suyla ıslatıp un ve baharatla yoğurun.~Kıymayı soğan ve cevizle kavurup iç harç yapın.~Dış hamurdan avuçta içini doldurarak köfteler yapın, yağlı tepsiye dizin.~200 derecede 25 dk pişirin.',
    'İzmir Köfte|A|kofte,patates,domates|-|dana kıyma 1200, galeta unu 100, yumurta 2, kuru soğan 200, patates 1200, sivri biber 300, domates 800, domates salçası 60, ayçiçek yağı 150, tuz 40, karabiber 5, kimyon 5, maydanoz 1|Kıyma, rendelenmiş soğan, galeta unu, yumurta ve baharatı yoğurup ceviz büyüklüğünde köfteler yapın.~Köfte ve dilimlenmiş patatesleri yağlı tepsiye dizin.~Salçayı 1 litre sıcak suyla açıp domates dilimleri ve biberlerle birlikte üzerine dökün.~190°C fırında 40 dk pişirip maydanozla servis edin.',
    'Izgara Köfte|A|kofte|-|dana kıyma 1400, kuru soğan 250, galeta unu 120, yumurta 2, sivri biber 400, domates 500, ayçiçek yağı 50, tuz 40, karabiber 6, kimyon 6|Kıyma, rendelenmiş soğan, galeta unu, yumurta ve baharatı iyice yoğurup 30 dk dinlendirin.~Köfteleri şekillendirip ızgara veya yağlı tepside 200°C fırında 20 dk pişirin.~Biber ve domatesi közleyip yanında servis edin.',
    'Kadınbudu Köfte|A|kofte,pirinc|-|dana kıyma 1000, pirinç 150, kuru soğan 200, yumurta 5, un 150, ayçiçek yağı 400, tuz 35, karabiber 5, maydanoz 1|Pirinci haşlayıp süzün; kıyma, rendelenmiş soğan, maydanoz, 1 yumurta ve baharatla yoğurun.~Köfteleri şekillendirip önce una sonra çırpılmış yumurtaya bulayın.~Kızgın yağda iki yüzü kızarana kadar kızartın, kâğıt havluda süzdürüp servis edin.',
    'Ekşili Köfte|A|kofte,pirinc|-|dana kıyma 800, pirinç 120, kuru soğan 200, un 60, yumurta 2, limon suyu 100, tereyağı 40, patates 400, havuç 250, tuz 40, kuru nane 5, karabiber 4|Kıyma, pirinç, rendelenmiş soğan ve baharatı yoğurup küçük köfteler yapın, una bulayın.~Tencerede 3 litre suyu kaynatıp küp patates ve havucu ekleyin, köfteleri tek tek bırakın; 30 dk pişirin.~Yumurta, un ve limon suyunu çırpıp çorbayla açarak tencereye ekleyin, 5 dk kaynatın.~Tereyağında nane yakıp üzerine gezdirin.',
    'Sulu Köfte|A|kofte,patates,havuc|-|dana kıyma 1000, kuru soğan 200, pirinç 80, patates 1000, havuç 400, domates salçası 60, tereyağı 60, tuz 40, karabiber 5, kimyon 4, maydanoz 1|Kıyma, soğan, ıslatılmış pirinç ve baharatı yoğurup fındık büyüklüğünde köfteler yapın.~Tereyağında salçayı kavurup 2,5 litre su, küp patates ve havucu ekleyin.~Köfteleri ekleyip kısık ateşte 35 dk pişirin; maydanozla servis edin.',
    'Köfteli Patates Tava|A|kofte,patates|-|dana kıyma 1000, patates 1500, kuru soğan 200, galeta unu 80, yumurta 1, sivri biber 300, domates 500, domates salçası 50, ayçiçek yağı 100, tuz 40, karabiber 5|Kıyma, soğan, galeta unu, yumurta ve baharatla köfte harcını yoğurup yassı köfteler yapın.~Tepsiye yarım ay doğranmış patatesleri, köfteleri, biber ve domatesi dizin.~Salçalı sıcak suyu gezdirip 200°C fırında 45 dk pişirin.',
    'Peynirli Fırın Köfte|A|kofte,peynir|-|dana kıyma 1200, kuru soğan 200, galeta unu 100, yumurta 2, kaşar peyniri 300, domates 400, tuz 40, karabiber 5, kimyon 5, ayçiçek yağı 50|Kıyma, soğan, galeta unu, yumurta ve baharatı yoğurup yassı köfteler yapın, yağlı tepsiye dizin.~200°C fırında 20 dk pişirin.~Üzerlerine domates dilimi ve kaşar koyup 8-10 dk daha pişirerek peyniri eritin.',
    'Tepsi Kebabı|A|kebap,domates,biber|-|dana kıyma 1200, kuru soğan 250, sivri biber 500, domates 800, domates salçası 60, maydanoz 2, ayçiçek yağı 80, tuz 40, karabiber 5, pul biber 5|Kıyma, rendelenmiş soğan, doğranmış maydanoz ve baharatı yoğurup yağlı tepsiye ince yayın.~Üzerini kareler halinde kesin; domates ve biber dilimlerini dizin.~Salçalı suyu gezdirip 200°C fırında 40 dk pişirin.',
    'Patlıcan Kebabı|A|kebap,patlican|5-10|dana kıyma 1000, patlıcan 2000, sivri biber 300, domates 600, kuru soğan 150, domates salçası 50, ayçiçek yağı 300, tuz 40, karabiber 5|Patlıcanları alaca soyup yağda kızartın veya fırınlayın.~Kıyma ve rendelenmiş soğanı yoğurup köfte yapın, tepsiye patlıcanlarla dönüşümlü dizin.~Üzerine biber, domates ve salçalı sıcak suyu ekleyip 190°C fırında 40 dk pişirin.',
    'Karnıyarık|A|patlican|5-10|patlıcan 2200, dana kıyma 700, kuru soğan 300, sivri biber 300, domates 500, domates salçası 60, ayçiçek yağı 400, sarımsak 20, tuz 40, karabiber 5, maydanoz 1|Patlıcanları alaca soyup yağda kızartın, ortalarını yarın.~Kıymayı soğan, sarımsak ve salçayla kavurup iç harcını hazırlayın.~Harcı patlıcanlara doldurup üzerine domates dilimi ve biber koyun.~Sıcak sulu tepsiyle 190°C fırında 30 dk pişirin.',
    'Patlıcan Musakka|A|patlican|5-10|patlıcan 2000, dana kıyma 700, kuru soğan 300, domates 800, sivri biber 200, domates salçası 50, ayçiçek yağı 400, tuz 40, karabiber 5|Patlıcanları dilimleyip yağda kızartın.~Kıymayı soğan ve salçayla kavurun, doğranmış domates ve biberi ekleyip sulanana kadar pişirin.~Tepsiye patlıcan ve kıymalı harcı katlayarak dizin, 180°C fırında 25 dk pişirin.',
    'Kıymalı Patates Oturtma|A|patates|-|patates 1800, dana kıyma 700, kuru soğan 250, domates 500, domates salçası 60, ayçiçek yağı 120, tuz 40, karabiber 5, pul biber 5|Patatesleri yarım ay doğrayıp yağda hafif kızartın.~Kıymayı soğan ve salçayla kavurun, rendelenmiş domatesi ekleyip suyunu çektirin.~Tepsiye patatesleri ve kıymalı harcı katlayıp 1 litre sıcak su ekleyin; 190°C fırında 35 dk pişirin.',
    'Orman Kebabı|A|patates,havuc,bezelye|-|dana kuşbaşı 900, patates 800, havuç 400, bezelye (dondurulmuş) 400, kuru soğan 250, domates salçası 60, ayçiçek yağı 80, tuz 40, karabiber 5|Kuşbaşı eti soğanla yağda suyunu çekene kadar kavurun, salçayı ekleyin.~1,5 litre sıcak su ekleyip eti 40 dk pişirin (düdüklüde 20 dk).~Küp patates, havuç ve bezelyeyi ekleyip sebzeler yumuşayana kadar 25 dk daha pişirin.',
    'Biber Dolması|A|biber,pirinc|5-10|dolmalık biber 1800, dana kıyma 600, pirinç 250, kuru soğan 300, domates 400, domates salçası 80, ayçiçek yağı 100, tuz 45, karabiber 5, kuru nane 5, maydanoz 2|Kıyma, ıslatılmış pirinç, rendelenmiş soğan ve domates, maydanoz ve baharatla iç harcı hazırlayın.~Biberlerin kapaklarını açıp harcı 3/4 oranında doldurun.~Tencereye dizip salçalı 2 su bardağı sıcak suyla 45 dk kısık ateşte pişirin.',
    'Kabak Dolması|A|kabak,pirinc|5-10|kabak 2000, dana kıyma 600, pirinç 250, kuru soğan 300, domates 300, domates salçası 80, ayçiçek yağı 100, tuz 45, karabiber 5, kuru nane 5, dereotu 2|Kabakları oyup iç harcı için kıyma, ıslatılmış pirinç, soğan, domates, dereotu ve baharatı karıştırın.~Kabakları 3/4 doldurup tencereye dizin.~Salçalı sıcak suyla 40 dk kısık ateşte pişirin.',
    'Etli Yaprak Sarma|A|yaprak,pirinc|-|asma yaprağı 500, dana kıyma 700, pirinç 300, kuru soğan 350, domates salçası 80, ayçiçek yağı 120, limon 3, tuz 45, karabiber 5, kuru nane 5, maydanoz 2|Yaprakları ılık suda yıkayıp süzün.~Kıyma, pirinç, soğan, maydanoz ve baharatı yoğurup yapraklara sarın.~Tencereye dizip salçalı sıcak su ve limon suyu ekleyin; üzerine tabak koyup 50 dk kısık ateşte pişirin.',
    'Lahana Sarması|A|lahana,pirinc|10-3|beyaz lahana 2500, dana kıyma 700, pirinç 250, kuru soğan 300, domates salçası 80, ayçiçek yağı 100, tuz 45, karabiber 5, kuru nane 5|Lahanayı haşlayıp yapraklarını ayırın.~Kıyma, pirinç, soğan ve baharattan iç harcı hazırlayıp yapraklara sarın.~Tencereye dizip salçalı sıcak suyla 50 dk kısık ateşte pişirin.',
    'Etli Kereviz|A|kereviz|11-3|kereviz 2000, dana kuşbaşı 700, havuç 300, patates 400, kuru soğan 250, domates salçası 50, ayçiçek yağı 80, limon 2, tuz 40, karabiber 4|Kuşbaşı eti soğanla kavurup salçayı ekleyin; 1 litre sıcak suyla 30 dk pişirin.~Doğranmış kereviz, havuç ve patatesi ekleyin.~Sebzeler yumuşayana dek 25 dk pişirip limon suyuyla servis edin.',
    'Etli Taze Fasulye|A|taze-fasulye,domates|5-10|taze fasulye 1800, dana kuşbaşı 700, kuru soğan 300, domates 700, domates salçası 50, ayçiçek yağı 80, tuz 40, karabiber 4|Kuşbaşı eti soğanla yağda kavurun, salçayı ekleyip 1 litre sıcak suyla 30 dk pişirin.~Ayıklanmış fasulye ve rendelenmiş domatesi ekleyin.~Fasulyeler yumuşayana kadar 35 dk kısık ateşte pişirin.',
    'Etli Bamya|A|bamya|6-9|bamya 1500, dana kuşbaşı 700, kuru soğan 300, domates 600, domates salçası 40, limon suyu 80, ayçiçek yağı 80, tuz 40, karabiber 4|Kuşbaşı eti soğanla yağda kavurup 1 litre sıcak suyla 30 dk pişirin.~Temizlenmiş bamya, domates ve salçayı ekleyin.~Limon suyu ilave edip bamyalar yumuşayana kadar 25 dk pişirin.',
    'Etli Bezelye|A|bezelye|-|bezelye (dondurulmuş) 1500, dana kuşbaşı 700, patates 500, havuç 300, kuru soğan 250, domates salçası 50, ayçiçek yağı 80, dereotu 2, tuz 40, karabiber 4|Kuşbaşı eti soğanla kavurup salça ve 1 litre sıcak suyla 30 dk pişirin.~Küp patates, havuç ve bezelyeyi ekleyin.~Sebzeler pişince dereotu ekleyip servis edin.',
    'Kıymalı Ispanak|A|ispanak|10-4|ıspanak 2500, dana kıyma 600, kuru soğan 350, pirinç 100, domates salçası 50, ayçiçek yağı 100, tuz 40, karabiber 4|Soğanı yağda kavurun, kıymayı ekleyip suyunu çektirin; salçayı katın.~Yıkanıp doğranmış ıspanak ve pirinci ekleyin.~Sıcak su ilave edip kısık ateşte pirinçler pişene kadar 25 dk pişirin.',
    'Kıymalı Pırasa|A|pirasa|10-3|pırasa 2200, dana kıyma 600, havuç 300, kuru soğan 200, pirinç 100, ayçiçek yağı 100, domates salçası 40, limon 1, tuz 40, karabiber 4|Soğan ve kıymayı yağda kavurup salçayı ekleyin.~Halka doğranmış pırasa, havuç ve pirinci ilave edin.~Sıcak su ekleyip 35 dk kısık ateşte pişirin; limon sıkarak servis edin.',
    'Kıymalı Karnabahar|A|karnabahar|10-3|karnabahar 2200, dana kıyma 600, kuru soğan 250, domates 400, domates salçası 50, ayçiçek yağı 100, tuz 40, karabiber 4, maydanoz 1|Kıyma ve soğanı yağda kavurup salçayı ekleyin.~Rendelenmiş domates ve buketlere ayrılmış karnabaharı ilave edin.~Sıcak su ekleyip karnabahar yumuşayana kadar 30 dk pişirin; maydanozla servis edin.',
    'Kıymalı Kabak Musakka|A|kabak|6-10|kabak 2200, dana kıyma 700, kuru soğan 300, domates 600, domates salçası 50, ayçiçek yağı 250, tuz 40, karabiber 4|Kabakları yarım ay doğrayıp yağda hafif kızartın.~Kıymayı soğan ve salçayla kavurup doğranmış domatesi ekleyin.~Tepsiye kabak ve kıymalı harcı katlayın; 180°C fırında 30 dk pişirin.',
    'Etli Yaz Türlüsü|A|patlican,biber,patates|6-10|dana kuşbaşı 800, patlıcan 800, kabak 600, sivri biber 300, patates 500, domates 800, kuru soğan 250, domates salçası 50, ayçiçek yağı 120, tuz 40, karabiber 4|Kuşbaşı eti soğanla yağda kavurup salçayla 1 litre sıcak suda 30 dk pişirin.~Sebzeleri iri doğrayıp eti ekleyin, üzerine domates koyun.~Kısık ateşte sebzeler yumuşayana kadar 35 dk pişirin.',
    'Etli Kış Türlüsü|A|patates,havuc,kereviz|11-3|dana kuşbaşı 800, patates 700, havuç 400, kereviz 500, bezelye (dondurulmuş) 300, kuru soğan 250, domates salçası 50, ayçiçek yağı 80, tuz 40, karabiber 4|Kuşbaşı eti soğanla kavurup salça ve 1 litre sıcak suyla 30 dk pişirin.~Doğranmış kereviz, havuç ve patatesi ekleyin.~Bezelyeyi son 10 dakikada ilave edip sebzeler yumuşayana kadar pişirin.',
    'Tas Kebabı|A|kebap,patates|-|dana kuşbaşı 1100, patates 800, havuç 300, kuru soğan 300, domates salçası 50, biber salçası 30, ayçiçek yağı 80, tereyağı 40, tuz 40, karabiber 5|Eti tereyağı ve yağda suyunu çekip kızarana dek kavurun.~Soğan ve salçaları ekleyip 1,5 litre sıcak suyla eti 40 dk pişirin.~Küp patates ve havucu ilave edip 25 dk daha pişirin.',
    'Hünkar Beğendi|A|patlican,sut|6-10|dana kuşbaşı 900, patlıcan 1500, süt 400, kaşar peyniri 150, un 60, tereyağı 100, kuru soğan 250, domates 400, domates salçası 40, ayçiçek yağı 80, tuz 40, karabiber 4|Eti soğanla kavurup domates ve salçayla 40 dk pişirin (sulu kıvamda).~Patlıcanları közleyip ezin; tereyağı ve unla kavurup sütü ekleyerek koyulaşana dek pişirin, kaşarı katın.~Beğendi üzerine etli sosu koyarak servis edin.',
    'Mantarlı Et Sote|A|mantar,biber|-|dana kuşbaşı 900, mantar 600, sivri biber 400, kuru soğan 250, domates 500, ayçiçek yağı 100, tereyağı 40, tuz 40, karabiber 5, kekik 3|Eti yağda yüksek ateşte mühürleyip 1 litre sıcak suyla yumuşayana dek pişirin.~Soğan, biber ve mantarı ayrı tavada kavurun.~Hepsini domatesle birleştirip 10 dk pişirin; kekik ekleyin.',
    'Kaşarlı Kuşbaşı Güveç|A|peynir,mantar|-|dana kuşbaşı 900, mantar 300, sivri biber 300, domates 500, kuru soğan 250, kaşar peyniri 250, tereyağı 40, tuz 40, karabiber 4|Eti soğanla kavurup 1 litre sıcak suyla yumuşayana dek pişirin.~Mantar, biber ve domatesi ekleyip 10 dk pişirin.~Güveç kaplarına paylaştırın, üzerine kaşar koyup fırında 10 dk gratine edin.',
    'Kağıt Kebabı|A|kebap,patates|-|dana kuşbaşı 900, patates 700, sivri biber 300, domates 500, kuru soğan 250, domates salçası 50, ayçiçek yağı 100, tuz 40, karabiber 5|Eti soğan, salça ve baharatla 15 dk çevirip marine edin.~Tepsiye patatesleri, eti, biber ve domatesi dizin; yağlı kâğıtla kapatıp sıcak su ekleyin.~180°C fırında 60 dk pişirin.',
    'Sebzeli Dana Haşlama|A|patates,havuc|-|dana kuşbaşı 1000, patates 600, havuç 400, kereviz 300, kuru soğan 200, dana bulyon 2, tereyağı 40, tuz 40, karabiber 5, maydanoz 1|Eti 2 litre suda bulyonla düdüklüde 25 dk haşlayın.~Soğan, havuç, kereviz ve patatesi iri doğrayıp ekleyin.~Sebzeler yumuşayana dek pişirip tereyağı ve maydanozla servis edin.',
    'Kuşbaşı Saç Kavurma|A|biber,domates|-|dana kuşbaşı 1000, sivri biber 500, domates 800, kuru soğan 300, sarımsak 30, ayçiçek yağı 100, tereyağı 40, tuz 40, karabiber 5, pul biber 5|Eti kendi suyunu çekene kadar yağda kavurup 1 litre sıcak suyla yumuşatın.~Soğan, sarımsak ve biberi ekleyin, 10 dk çevirin.~Domates ve baharatla suyunu çekene dek pişirin.',
    'Dana Yahni|A|patates|-|dana kuşbaşı 900, patates 900, kuru soğan 350, domates salçası 50, ayçiçek yağı 80, tereyağı 40, tuz 40, karabiber 5, defne yaprağı 3|Eti soğanla kavurup salçayı ekleyin.~Defne ve 1,5 litre sıcak suyla eti 40 dk pişirin.~Patatesleri ekleyip yumuşayana dek 25 dk daha pişirin.',
    'Kıymalı Börek (Tepsi)|A|hamur|-|yufka 8, dana kıyma 700, kuru soğan 300, yumurta 4, süt 500, yoğurt 200, ayçiçek yağı 200, tuz 30, karabiber 5, maydanoz 1|Kıymayı soğanla kavurup tuz ve karabiberle tatlandırın.~Yağlanmış tepsiye yufkaları katlayarak dizin, arasına kıymalı harcı serpin.~Yumurta, süt, yoğurt ve yağı çırpıp üzerine dökün; 180°C fırında 40 dk pişirin.',
    'Kuşbaşı Tava|A|kebap|-|dana kuşbaşı 1100, kuru soğan 500, sivri biber 300, domates 400, ayçiçek yağı 80, tereyağı 40, tuz 40, karabiber 5, pul biber 5, kimyon 3|Eti yüksek ateşte kendi suyunu çekene kadar kavurup 1 litre sıcak suyla yumuşatın.~Yarım ay soğan ve biberi ekleyip 10 dk çevirin.~Domates ve baharatı ilave edip suyu çekilene kadar pişirin.',
    'Kıymalı Semizotu|A|semizotu|6-9|semizotu 2000, dana kıyma 600, kuru soğan 300, pirinç 100, domates 400, domates salçası 40, ayçiçek yağı 100, tuz 40, karabiber 4|Kıyma ve soğanı yağda kavurup salçayı ekleyin.~Doğranmış semizotu, rendelenmiş domates ve pirinci ilave edin.~Sıcak su ekleyip 25 dk kısık ateşte pişirin.',
    'Etli Kapuska|A|lahana|10-3|beyaz lahana 2000, dana kuşbaşı 700, kuru soğan 250, domates salçası 60, biber salçası 30, ayçiçek yağı 80, tuz 40, karabiber 4|Kuşbaşı eti soğanla kavurup salçaları ekleyin; 1 litre sıcak suyla 30 dk pişirin.~İri doğranmış lahanayı ilave edin.~Lahana yumuşayana kadar 35 dk pişirin.',

    // ---------------- PİLAV / MAKARNA (2. yemek) ----------------
    'Bolonez Soslu Makarna|P|makarna,domates|-|makarna (burgu) 1500, dana kıyma 700, domates 1000, kuru soğan 250, domates salçası 60, ayçiçek yağı 100, tuz 40, karabiber 4|Makarnayı tuzlu suda haşlayıp süzün.~Kıymayı soğanla kavurup salça ve rendelenmiş domatesi ekleyin, 15 dk pişirin.~Makarnayı sosla karıştırıp servis edin.',
    'Kremalı Makarna|P|makarna,sut|-|makarna (burgu) 1500, krema 500, süt 300, kaşar peyniri 250, tereyağı 60, tuz 30, karabiber 4|Makarnayı haşlayıp süzün.~Tereyağında krema ve sütü ısıtın, kaşarı eritin.~Makarnayı sosa katıp harmanlayın.',
    'Mantarlı Bulgur Pilavı|P|bulgur,mantar|-|bulgur (pilavlık) 1000, mantar 600, kuru soğan 200, tereyağı 80, ayçiçek yağı 50, tuz 30, karabiber 3|Soğan ve mantarı yağda suyunu çekene kadar kavurun.~Bulguru ekleyip 3 dk kavurun, 2 katı sıcak su ve tuz ilave edin.~Kısık ateşte 15 dk pişirip 10 dk demlendirin.',
    'Sebzeli Pirinç Pilavı|P|pirinc,havuc|-|pirinç 1200, havuç 250, bezelye (dondurulmuş) 250, mısır (konserve) 200, tereyağı 80, ayçiçek yağı 50, tuz 35|Pirinci ılık tuzlu suda 20 dk bekletip yıkayın.~Tereyağında pirinci kavurup sebzeleri ekleyin.~1,5 katı sıcak su ile 15 dk pişirip 10 dk demlendirin.',
    'Peynirli Erişte|P|eriste,peynir,hamur|-|erişte 1200, beyaz peynir 400, tereyağı 100, ceviz 80, tuz 25|Eriştenin tuzlu suda haşlayıp süzün.~Tereyağını eritip erişteyle karıştırın.~Ezilmiş peynir ve cevizle servis edin.',
    'Kıymalı Erişte|P|eriste,hamur|-|erişte 1200, dana kıyma 500, kuru soğan 200, domates salçası 50, ayçiçek yağı 80, tuz 35, karabiber 3|Kıymayı soğan ve salçayla kavurun.~Eriştenin haşlayıp süzün.~Kıymalı harçla karıştırıp servis edin.',
    'İç Pilav|P|pirinc|-|pirinç 1200, kuru soğan 300, tereyağı 100, kuru üzüm 100, ceviz 80, tarçın 3, karabiber 3, tuz 35|Pirinci yıkayıp bekletin; soğanı tereyağında pembeleşene dek kavurun.~Pirinç, ceviz ve üzümü ekleyip kavurun.~1,5 katı sıcak su, tuz, tarçın ve karabiberle 15 dk pişirip demlendirin.',
    'Kremalı Brokolili Makarna|P|makarna,brokoli,sut|10-4|makarna (burgu) 1500, brokoli 800, krema 400, süt 200, kaşar peyniri 200, sarımsak 15, tereyağı 60, tuz 30|Makarnayı haşlayıp süzün, brokoliyi 3 dk haşlayın.~Sarımsağı tereyağında kavurup krema ve sütü ekleyin, kaşarı eritin.~Makarna ve brokoliyi sosla karıştırın.',
    'Yoğurtlu Makarna|P|makarna,yogurt|-|makarna (burgu) 1500, yoğurt 800, sarımsak 20, tereyağı 80, pul biber 5, kuru nane 5, tuz 30|Makarnayı haşlayıp süzün.~Sarımsaklı yoğurdu üzerine dökün.~Tereyağında pul biber ve nane kızdırıp gezdirin.',
    'Salçalı Bulgur Pilavı|P|bulgur|-|bulgur (pilavlık) 1000, kuru soğan 200, biber salçası 40, domates salçası 40, ayçiçek yağı 80, tuz 30|Soğanı yağda kavurup salçaları ekleyin.~Bulguru katıp 3 dk çevirin.~2 katı sıcak suyla 15 dk pişirin, 10 dk demlendirin.',
    'Ispanaklı Tepsi Böreği|P|hamur,ispanak|10-4|yufka 10, ıspanak 1500, kuru soğan 200, beyaz peynir 400, yumurta 4, süt 400, ayçiçek yağı 150, tuz 25|Soğanı yağda kavurup doğranmış ıspanağı ekleyin, suyunu çekene dek pişirin, peynir katın.~Yufkaları yağlı tepsiye aralarına harç koyarak serin.~Yumurta ve sütü karıştırıp üzerine dökün, 190 derecede 35 dk pişirin.',
    'Tereyağlı Şehriyeli Pirinç Pilavı|P|pirinc,sehriye|-|pirinç 700, tel şehriye 100, tereyağı 100, ayçiçek yağı 60, tuz 35|Pirinci ılık tuzlu suda 20 dk bekletip yıkayın.~Yağda şehriyeyi kızarana kadar kavurun, pirinci ekleyip 3 dk çevirin.~1 litre sıcak su ve tuzu ekleyin, kısık ateşte 15 dk pişirin; 10 dk demlendirin.',
    'Domatesli Bulgur Pilavı|P|bulgur,domates|-|bulgur (pilavlık) 700, kuru soğan 200, domates 400, domates salçası 50, ayçiçek yağı 100, tuz 35, karabiber 3|Soğanı yağda kavurup salçayı ve rendelenmiş domatesi ekleyin.~Bulguru ilave edip 2 dk çevirin; 1,4 litre sıcak su ve tuzu ekleyin.~Kısık ateşte 15 dk pişirip 10 dk demlendirin.',
    'Sade Pirinç Pilavı|P|pirinc|-|pirinç 700, tereyağı 100, ayçiçek yağı 50, tuz 30|Pirinci ılık tuzlu suda bekletip yıkayın.~Yağda 3 dk kavurun, 1 litre sıcak su ve tuzu ekleyin.~Kısık ateşte 15 dk pişirip 10 dk demlendirin.',
    'Domatesli Pirinç Pilavı|P|pirinc,domates|-|pirinç 700, domates 400, domates salçası 40, ayçiçek yağı 80, tereyağı 40, tuz 30|Pirinci hazırlayıp yağda kavurun.~Salça ve rendelenmiş domatesi ekleyip 2 dk çevirin.~1 litre sıcak su ve tuzu ilave edip 15 dk pişirin, demlendirin.',
    'Sebzeli Bulgur Pilavı|P|bulgur,havuc|-|bulgur (pilavlık) 700, havuç 200, sivri biber 150, kuru soğan 150, domates 300, domates salçası 40, ayçiçek yağı 100, tuz 35|Soğan, havuç ve biberi yağda kavurun; salçayı ve domatesi ekleyin.~Bulguru ilave edip 2 dk çevirin, 1,4 litre sıcak su ve tuzu ekleyin.~Kısık ateşte 15 dk pişirip demlendirin.',
    'Arpa Şehriye Pilavı|P|sehriye|-|arpa şehriye 600, tereyağı 80, ayçiçek yağı 50, tuz 30|Şehriyeyi yağda kızarana kadar kavurun.~1 litre sıcak su ve tuz ekleyin.~Kısık ateşte 15 dk pişirip demlendirin.',
    'Şehriyeli Bulgur Pilavı|P|bulgur,sehriye|-|bulgur (pilavlık) 700, tel şehriye 80, tereyağı 80, tuz 35|Şehriyeyi tereyağında kızartın, bulguru ekleyip 2 dk kavurun.~1,4 litre sıcak su ve tuz ekleyip kısık ateşte 15 dk pişirin.~10 dk demlendirip servis edin.',
    'Spagetti (Domates Soslu)|P|makarna,domates|-|spagetti 800, domates 1000, domates salçası 50, sarımsak 20, zeytinyağı 100, tuz 40, karabiber 3, kaşar peyniri 100|Spagettiyi bol tuzlu suda al dente haşlayıp süzün.~Zeytinyağında sarımsağı, salçayı ve rendelenmiş domatesi 15 dk pişirerek sos yapın.~Makarnayı sosla harmanlayıp rendelenmiş kaşarla servis edin.',
    'Kıymalı Makarna|P|makarna|-|makarna (burgu) 800, dana kıyma 400, kuru soğan 200, domates salçası 80, domates 400, ayçiçek yağı 80, tuz 40, karabiber 4, kaşar peyniri 100|Makarnayı tuzlu suda haşlayıp süzün.~Soğan ve kıymayı kavurup salça ve domatesle sos yapın.~Makarnayla karıştırıp kaşarla servis edin.',
    'Fırın Makarna|P|makarna,sut,peynir|-|makarna (burgu) 800, dana kıyma 400, kuru soğan 200, süt 800, un 70, tereyağı 70, yumurta 2, kaşar peyniri 250, tuz 40, karabiber 4|Makarnayı yarı pişene kadar haşlayıp süzün; kıymayı soğanla kavurun.~Tereyağında unu kavurup sütle beşamel sos yapın.~Makarna, kıyma ve sosu karıştırıp tepsiye alın; yumurtalı kaşarla kaplayıp 200°C fırında 25 dk pişirin.',
    'Peynirli Makarna|P|makarna,peynir|-|makarna (burgu) 800, tereyağı 100, kaşar peyniri 200, beyaz peynir 150, tuz 30|Makarnayı tuzlu suda haşlayıp süzün.~Tereyağını eritip makarnaya ekleyin.~Rendelenmiş kaşar ve ufalanmış beyaz peynirle karıştırıp servis edin.',
    'Yoğurtlu Erişte|P|eriste,hamur,yogurt|-|erişte 800, tereyağı 100, yoğurt 600, sarımsak 20, tuz 35, pul biber 5|Erişteyi tuzlu suda haşlayıp süzün.~Yoğurdu ezilmiş sarımsak ve tuzla çırpın.~Erişteyi tabağa alıp yoğurt koyun; tereyağında pul biber yakıp gezdirin.',
    'Yoğurtlu Mantı|P|hamur,yogurt|-|mantı (hazır) 1500, yoğurt 800, sarımsak 30, tereyağı 100, pul biber 8, kuru nane 5, tuz 20|Mantıyı tuzlu kaynar suda 8-10 dk haşlayıp süzün.~Yoğurdu ezilmiş sarımsak ve tuzla karıştırın.~Mantı üzerine yoğurdu koyup tereyağında pul biber ve nane yakıp gezdirin.',
    'Sebzeli Makarna|P|makarna|-|makarna (burgu) 800, kabak 300, havuç 200, sivri biber 150, mantar 200, zeytinyağı 100, tuz 35, karabiber 3|Makarnayı haşlayıp süzün.~Doğranmış sebzeleri ve mantarı zeytinyağında kavurun.~Makarnayla karıştırıp 3 dk birlikte çevirin.',
    'Mantarlı Pirinç Pilavı|P|pirinc,mantar|-|pirinç 700, mantar 300, tereyağı 100, tuz 30, karabiber 3|Mantarı tereyağında suyunu çekene kadar kavurun.~Pirinci ekleyip 3 dk çevirin, 1 litre sıcak su ve tuz ilave edin.~15 dk pişirip demlendirin.',
    'Bezelyeli Pirinç Pilavı|P|pirinc,bezelye|-|pirinç 700, bezelye (dondurulmuş) 300, tereyağı 80, tuz 30|Pirinci tereyağında kavurun, bezelyeyi ekleyin.~1 litre sıcak su ve tuzla 15 dk pişirin.~10 dk demlendirip servis edin.',
    'Kremalı Mantarlı Makarna|P|makarna,mantar,sut|-|makarna (burgu) 800, mantar 400, krema 300, tereyağı 60, sarımsak 15, tuz 35, karabiber 3, kaşar peyniri 100|Makarnayı haşlayıp süzün.~Mantarı tereyağı ve sarımsakla kavurup kremayı ekleyin, 5 dk pişirin.~Makarnayla harmanlayıp kaşar serperek servis edin.',
    'Buğday Pilavı (Yarma)|P|yarma|-|yarma 700, kuru soğan 150, tereyağı 80, ayçiçek yağı 50, tuz 35|Yarmayı yıkayıp 1 saat ıslatın.~Soğanı yağda kavurup yarmayı ekleyin.~1,4 litre sıcak su ve tuzla 20 dk pişirip demlendirin.',
    'Peynirli Tepsi Böreği|P|hamur,peynir|-|yufka 10, beyaz peynir 500, maydanoz 2, yumurta 4, süt 500, ayçiçek yağı 150, tereyağı 60, tuz 10|Peyniri maydanozla karıştırın.~Yağlı tepsiye yufkaları dizip arasına iç harcı serpin.~Yumurta, süt ve yağı çırpıp üzerine dökün; 180°C fırında 40 dk pişirin.',

    // ---------------- SALATALAR ----------------
    'Domates Salatası|S||5-10|domates 2500, kuru soğan 200, maydanoz 2, zeytinyağı 100, limon suyu 60, nar ekşisi 40, tuz 20|Domatesleri ve soğanı doğrayın.~Maydanoz, zeytinyağı, limon suyu ve nar ekşisini ekleyip karıştırın.',
    'Zeytinli Salata|S||-|domates 1500, salatalık 1000, zeytin 300, taze soğan 2, zeytinyağı 100, limon suyu 60, kekik 3, tuz 20|Domates ve salatalığı doğrayın.~Zeytin, taze soğan ve sosu ekleyip karıştırın.',
    'Peynirli Marul Salatası|S|peynir|-|marul 6, beyaz peynir 400, domates 800, salatalık 600, zeytinyağı 100, limon suyu 60, tuz 15|Marulu ince doğrayıp diğer sebzelerle karıştırın.~Peyniri küp doğrayıp üzerine serpin, sosla servis edin.',
    'Limonlu Pancar Salatası|S|pancar|-|pancar 1500, sarımsak 15, zeytinyağı 100, limon suyu 80, tuz 15, maydanoz 1|Pancarları haşlayıp soyun, küp ya da ince doğrayın.~Sarımsak, yağ, limon suyu ve tuzla karıştırın.',
    'Kereviz Salatası|S|kereviz|10-3|kereviz 1500, havuç 400, yoğurt 300, mayonez 100, limon suyu 40, tuz 15|Kerevizi ve havucu rendeleyin.~Yoğurt, mayonez, limon suyu ve tuzla harmanlayın.',
    'Mısır Salatası|S||-|mısır (konserve) 1200, havuç 400, marul 3, zeytinyağı 80, limon suyu 60, tuz 15|Mısırı süzüp rendelenmiş havuç ve ince doğranmış marulla karıştırın.~Yağ, limon suyu ve tuzla soslayın.',
    'Muhammara|S|ceviz|-|ceviz 300, biber salçası 150, galeta unu 100, sarımsak 15, zeytinyağı 150, limon suyu 60, pul biber 8, kimyon 4, tuz 15|Cevizi ince öğütün.~Tüm malzemeyi karıştırıp pürüzsüz bir ezme haline getirin.',
    'Közlenmiş Biber Salatası|S|biber|6-10|sivri biber 1500, sarımsak 20, zeytinyağı 100, limon suyu 60, nar ekşisi 40, tuz 15|Biberleri közleyip soyun, şeritler halinde kesin.~Sarımsak, yağ, limon suyu ve nar ekşisiyle karıştırın.',
    'Elma-Havuç Salatası|S|havuc|10-3|havuç 1000, elma 800, yoğurt 300, limon suyu 60, bal 30, ceviz 80, tuz 10|Havuç ve elmayı rendeleyin.~Yoğurt, limon suyu, bal ve tuzla karıştırın, cevizle servis edin.',
    'Girit Ezmesi|S|peynir|-|beyaz peynir 600, ceviz 100, zeytinyağı 100, dereotu 1, sarımsak 10, biber salçası 20|Peyniri ezin, kıyılmış dereotu, ceviz ve sarımsakla karıştırın.~Zeytinyağı ekleyip pürüzsüz hale getirin.',
    'Ispanak Salatası (Yoğurtlu)|S|yogurt,ispanak|10-4|ıspanak 1200, yoğurt 600, sarımsak 20, zeytinyağı 60, tuz 15, pul biber 3|Ispanağı haşlayıp suyunu sıkın, kıyın.~Sarımsaklı yoğurtla karıştırın, yağlı pul biberle servis edin.',
    'Salatalık Salatası|S||5-10|salatalık 2000, yoğurt 300, sarımsak 10, dereotu 1, zeytinyağı 60, limon suyu 40, tuz 15|Salatalıkları ince doğrayın.~Yoğurt, sarımsak, dereotu ve yağla karıştırın.',
    'Çoban Salatası|S||5-10|domates 1000, salatalık 800, sivri biber 300, kuru soğan 150, maydanoz 2, zeytinyağı 80, limon suyu 60, tuz 20, sumak 5|Sebzeleri küçük küpler halinde doğrayın.~Maydanozu ekleyip zeytinyağı, limon suyu, tuz ve sumakla karıştırın.',
    'Mevsim Salata|S||-|marul 3, havuç 300, salatalık 500, kırmızı lahana 200, zeytinyağı 70, limon suyu 60, tuz 20, nar ekşisi 30|Marulu ve sebzeleri ince doğrayın.~Zeytinyağı, limon suyu ve nar ekşisini tuzla çırpıp üzerine dökün.',
    'Gavurdağı Salatası|S|ceviz|-|domates 800, salatalık 300, kuru soğan 150, sivri biber 200, ceviz 100, maydanoz 2, nar ekşisi 60, zeytinyağı 80, biber salçası 20, pul biber 5, sumak 5, tuz 15|Sebzeleri çok küçük küpler halinde doğrayın.~Sos malzemelerini karıştırıp salataya ekleyin; ceviz ve maydanozu en son serpin.',
    'Cacık|S|yogurt|-|yoğurt 1000, salatalık 600, sarımsak 20, kuru nane 5, zeytinyağı 30, tuz 15, dereotu 1|Salatalığı rendeleyin ya da küp doğrayın.~Yoğurt, ezilmiş sarımsak, tuz ve dereotuyla karıştırın; gerekirse biraz su ekleyin.~Zeytinyağı ve nane ile servis edin.',
    'Haydari|S|yogurt|-|yoğurt 1000, beyaz peynir 200, sarımsak 25, dereotu 2, zeytinyağı 40, tuz 10, kuru nane 3|Süzme yoğurda ezilmiş beyaz peyniri ve sarımsağı karıştırın.~Doğranmış dereotu ekleyip zeytinyağı ve nane ile servis edin.',
    'Havuç Tarator|S|yogurt,havuc|-|havuç 800, yoğurt 600, sarımsak 20, ceviz 80, zeytinyağı 40, tuz 15|Havucu rendeleyip zeytinyağında 5 dk soteleyin, soğutun.~Sarımsaklı yoğurtla karıştırın, ezilmiş cevizle servis edin.',
    'Beyaz Lahana Salatası|S|lahana|10-4|beyaz lahana 1200, havuç 200, zeytinyağı 60, limon suyu 60, tuz 20|Lahanayı ince ince doğrayıp tuzla ovalayın.~Rendelenmiş havuç, zeytinyağı ve limon suyuyla karıştırın.',
    'Kırmızı Lahana Salatası|S|lahana|-|kırmızı lahana 1000, havuç 200, mısır (konserve) 150, zeytinyağı 60, limon suyu 60, tuz 20|Lahanayı çok ince doğrayıp tuzla ovalayın.~Havuç, mısır, zeytinyağı ve limon suyuyla harmanlayın.',
    'Rus Salatası|S|patates|-|patates 600, havuç 250, bezelye (dondurulmuş) 200, turşu (salatalık) 150, mayonez 200, yoğurt 150, yumurta 3, tuz 15|Patates, havuç ve yumurtayı haşlayıp küp doğrayın; bezelyeyi haşlayın.~Turşu ve diğer malzemeleri karıştırın.~Mayonez ve yoğurtla harmanlayıp soğutun.',
    'Patates Salatası|S|patates|-|patates 1000, kuru soğan 150, maydanoz 2, yumurta 2, zeytinyağı 70, limon suyu 60, tuz 20, pul biber 3|Patatesleri haşlayıp küp doğrayın.~İnce doğranmış soğan, maydanoz ve haşlanmış yumurtayla karıştırın.~Zeytinyağı, limon suyu ve baharatla harmanlayın.',
    'Kısır|S|bulgur|-|bulgur (ince/köftelik) 500, domates salçası 80, biber salçası 40, taze soğan 4, maydanoz 3, domates 300, marul 2, nar ekşisi 60, zeytinyağı 100, limon suyu 60, tuz 20, pul biber 6|Bulguru sıcak suyla ıslatıp 15 dk şişmesini bekleyin.~Salçaları, zeytinyağı, nar ekşisi ve baharatı ekleyip yoğurun.~İnce doğranmış taze soğan, maydanoz ve domatesi katıp marul yaprağıyla servis edin.',
    'Makarna Salatası|S|makarna|-|makarna (burgu) 500, mısır (konserve) 200, turşu (salatalık) 150, salatalık 200, sivri biber 150, mayonez 150, yoğurt 150, tuz 15|Makarnayı haşlayıp soğutun.~Doğranmış sebzeleri ve mısırı ekleyin.~Mayonez-yoğurt sosuyla karıştırıp soğutarak servis edin.',
    'Közlenmiş Patlıcan Salatası|S|patlican|6-10|patlıcan 1500, sivri biber 200, sarımsak 20, zeytinyağı 80, limon suyu 50, tuz 15, maydanoz 1|Patlıcan ve biberleri közleyip soyun, doğrayın.~Ezilmiş sarımsak, zeytinyağı, limon suyu ve tuzla karıştırın.',
    'Roka Salatası|S||-|roka 6, marul 1, domates 400, kuru soğan 100, nar ekşisi 50, zeytinyağı 70, tuz 15|Rokayı ve marulu yıkayıp doğrayın.~Domates ve ince doğranmış soğanı ekleyin.~Nar ekşisi, zeytinyağı ve tuzla servis edin.',
    'Yoğurtlu Pancar Salatası|S|yogurt,pancar|10-4|pancar 1000, yoğurt 600, sarımsak 20, zeytinyağı 40, ceviz 60, tuz 15|Pancarları haşlayıp rendeleyin.~Sarımsaklı yoğurtla karıştırın, zeytinyağı ve cevizle servis edin.',
    'Karışık Turşu|S||-|turşu (salatalık) 700|Turşuları süzüp doğrayın.~Tabaklara paylaştırın.',
    'Yoğurtlu Semizotu Salatası|S|yogurt|6-9|semizotu 1200, yoğurt 600, sarımsak 20, zeytinyağı 40, tuz 15|Semizotunu yıkayıp doğrayın, kaynar suda 2 dk haşlayıp süzün.~Sarımsaklı yoğurtla karıştırın, zeytinyağı ile servis edin.',
    'Mısırlı Havuç Salatası|S|havuc|-|havuç 700, mısır (konserve) 300, maydanoz 2, zeytinyağı 60, limon suyu 60, tuz 20|Havucu rendeleyin.~Mısır ve ince doğranmış maydanozla karıştırın.~Zeytinyağı, limon suyu ve tuzla harmanlayın.',
    'Akdeniz Salatası|S|peynir|-|marul 3, domates 600, salatalık 400, beyaz peynir 300, zeytin 150, zeytinyağı 70, limon suyu 50, tuz 15, kekik 2|Marul ve sebzeleri doğrayın.~Peynir küpleri ve zeytinle birleştirin.~Zeytinyağı, limon suyu, tuz ve kekikle servis edin.',
    'Acılı Ezme|S|domates|-|domates 800, kuru soğan 200, sivri biber 150, biber salçası 50, maydanoz 2, nar ekşisi 50, zeytinyağı 60, pul biber 6, tuz 15, sumak 5|Sebzeleri çok ince doğrayın.~Salça, nar ekşisi, zeytinyağı ve baharatla karıştırıp dinlendirin.',
    'Yeşil Salata|S||-|marul 3, roka 3, dereotu 2, taze soğan 4, salatalık 400, zeytinyağı 60, limon suyu 60, tuz 15|Yeşillikleri ve salatalığı doğrayın.~Zeytinyağı, limon suyu ve tuzla servis edin.',

    'Tabule|S|bulgur|-|bulgur (ince/köftelik) 200, maydanoz 5, domates 500, taze soğan 4, zeytinyağı 80, limon suyu 80, tuz 15, pul biber 3|Bulguru sıcak suyla ıslatıp şişirin.~Çok ince doğranmış maydanoz, domates ve taze soğanı ekleyin.~Zeytinyağı, limon suyu ve baharatla karıştırın.',
    'Yoğurtlu Patlıcan Salatası|S|yogurt,patlican|6-10|patlıcan 1200, yoğurt 600, sarımsak 20, zeytinyağı 40, tuz 15|Patlıcanları közleyip soyun, ince doğrayın.~Sarımsaklı yoğurtla karıştırın, zeytinyağı ile servis edin.',
    'Brokoli Salatası|S|brokoli|10-4|brokoli 1200, havuç 200, zeytinyağı 70, limon suyu 60, sarımsak 10, tuz 15|Brokoliyi buketlere ayırıp 4 dk haşlayın, soğuk suya alın.~Rendelenmiş havuç ve ezilmiş sarımsakla karıştırın.~Zeytinyağı, limon suyu ve tuzla harmanlayın.',
    'Elmalı Lahana Salatası|S|lahana|10-3|kırmızı lahana 800, elma 400, havuç 150, ceviz 60, yoğurt 150, zeytinyağı 40, limon suyu 50, tuz 15|Lahanayı ince doğrayıp tuzla ovalayın.~Küp elma, rendelenmiş havuç ve cevizi ekleyin.~Yoğurt, zeytinyağı ve limon suyuyla karıştırın.',

    // ---------------- TATLILAR ----------------
    'Fırın Sütlaç|T|sut,pirinc|-|süt 3000, pirinç 200, toz şeker 400, nişasta 40, vanilin 2|Pirinci süt içinde yumuşayana kadar pişirin.~Şeker ve nişastayı ekleyip koyulaşana dek kaynatın.~Kaselere paylaştırıp 220 derecede üstü kızarana kadar fırınlayın.',
    'Keşkül|T|sut|-|süt 2500, toz şeker 350, nişasta 80, un 40, yumurta 4, ceviz 100, hindistan cevizi 50, vanilin 2|Süt, şeker, nişasta, un ve yumurta sarılarını karıştırıp koyulaşana dek pişirin.~Kaselere paylaştırıp soğutun, ceviz ve hindistan cevizi serpin.',
    'Ekmek Kadayıfı|T|serbet|-|ekmek 6, süt 800, toz şeker 700, krema 500, ceviz 150, limon suyu 20|Ekmek dilimlerini tepsiye dizin, şekerli sütle ıslatın.~Kremayı üzerine yayıp cevizle servis edin.',
    'Tulumba Tatlısı|T|serbet,hamur|-|un 600, yumurta 5, tereyağı 150, toz şeker 1200, limon suyu 40, ayçiçek yağı 700, tuz 5|Su, tereyağı ve tuzu kaynatıp unu ekleyin, yumurtalarla yoğurun.~Hamuru sıkma torbasıyla yağda kızartın.~Soğuk şerbete atıp çektirin.',
    'Kakaolu Kek|T|cikolata|-|un 700, toz şeker 600, yumurta 8, süt 400, ayçiçek yağı 300, kakao 100, kabartma tozu 20, vanilin 3|Yumurta ve şekeri köpürtün, süt ve yağı ekleyin.~Un, kakao ve kabartma tozunu karıştırıp harmanlayın.~170 derecede 40 dk pişirin.',
    'Cevizli Kurabiye|T|un|-|un 1000, tereyağı 400, toz şeker 300, yumurta 2, ceviz 200, kabartma tozu 10, vanilin 2|Tereyağı ve şekeri yoğurup yumurta, un ve kabartma tozunu ekleyin.~Ceviz ilave edip bezeler halinde şekillendirin.~170 derecede 20 dk pişirin.',
    'Elmalı Turta|T|un|-|un 800, elma 2000, tereyağı 250, toz şeker 450, yumurta 3, tarçın 10, kabartma tozu 10|Tereyağı, 100 g şeker, yumurta, un ve kabartma tozundan hamuru yoğurun.~Rendelenmiş elmayı şeker ve tarçınla kavurun.~Hamurun yarısını tepsiye serip harcı koyun, kalanıyla kapatıp 180 derecede 40 dk pişirin.',
    'Cevizli Baklava (Yufka)|T|serbet,hamur|-|yufka 12, ceviz 500, tereyağı 300, toz şeker 1000, limon suyu 30|Yufkaları tereyağı sürerek tepsiye katlayın, aralarına ceviz serpin.~Dilimleyip 180 derecede üstü kızarana kadar pişirin.~Soğuk şerbeti sıcak baklavaya dökün.',
    'Sütlü İrmik Tatlısı|T|sut,irmik|-|süt 2500, irmik 350, toz şeker 400, tereyağı 80, vanilin 2, hindistan cevizi 50|İrmiği tereyağında hafif kavurun.~Süt ve şekeri ekleyip koyulaşana dek karıştırın.~Kaselere alıp soğutun, hindistan cevizi serpin.',
    'Muzlu Bisküvi Tatlısı|T|sut,cikolata|-|bisküvi 600, muz 1500, süt 2000, nişasta 120, toz şeker 300, kakao 40|Süt, şeker, nişasta ve kakaoyla puding pişirin.~Kaselere bisküvi, muz ve puding katmanları yapın.~Soğutup servis edin.',
    'Sütlaç|T|sut,pirinc|-|süt 2000, pirinç 150, toz şeker 300, nişasta 40, vanilin 2|Pirinci suda haşlayın, sütü ekleyip yumuşayana dek pişirin.~Şeker ve sütle açılmış nişastayı ilave edip koyulaşana kadar karıştırın.~Kaselere paylaştırıp soğutun (isterseniz fırında üstünü kızartın).',
    'Muhallebi|T|sut|-|süt 2000, toz şeker 250, nişasta 120, vanilin 2, tarçın 3|Nişastayı 1 su bardağı soğuk sütle açın.~Kalan süt ve şekeri kaynatıp nişasta karışımını ince ince ekleyin.~Koyulaşınca vanilini ekleyin, kaselere alıp soğutun; tarçın serpin.',
    'Kazandibi|T|sut|-|süt 2000, krema 200, toz şeker 350, nişasta 100, tereyağı 30, vanilin 2|Sütü, kremayı ve 250 g şekeri kaynatıp nişastayla koyulaştırın.~Tavanın dibine kalan şekeri karamelize edip tepsiye alın, muhallebiyi üzerine dökün.~Soğutup karamelli yüzü altta olacak şekilde dilimleyin.',
    'Supangle|T|sut,cikolata|-|süt 1500, kakao 50, toz şeker 300, nişasta 60, un 40, yumurta 4, tereyağı 50, vanilin 2|Yumurta, şeker, un ve nişastayı çırpın.~Kakaolu sıcak sütü ince ince ekleyip koyulaşana kadar pişirin.~Tereyağı ve vanilini katıp kaselerde soğutun.',
    'Çikolatalı Puding|T|sut,cikolata|-|süt 2000, kakao 70, toz şeker 300, nişasta 100, vanilin 2|Kuru malzemeleri soğuk sütle açın.~Kalan sütle karıştırıp sürekli karıştırarak koyulaşana dek pişirin.~Kaselere alıp soğutun.',
    'Trileçe|T|sut|-|yumurta 6, toz şeker 400, un 250, kabartma tozu 10, süt 1500, krema 400, kakao 30, vanilin 2|Yumurta ve 200 g şekeri çırpın, un ve kabartma tozunu katıp 180°C fırında 25 dk pişirin.~Süt, krema ve kalan şekerden sos hazırlayıp sıcak keke dökün.~Soğutup kakao serperek dilimleyin.',
    'Revani|T|serbet,irmik|-|irmik 500, un 150, yumurta 5, yoğurt 300, toz şeker 700, ayçiçek yağı 150, kabartma tozu 12, limon 1, hindistan cevizi 50|Yumurta ve 200 g şekeri çırpıp yoğurt, yağ, irmik, un ve kabartma tozunu ekleyin.~180°C fırında 35 dk pişirin.~500 g şeker ve limonla yaptığınız soğuk şerbeti sıcak tatlıya dökün; hindistan cevizi serpin.',
    'Şekerpare|T|serbet|-|un 500, irmik 100, tereyağı 150, toz şeker 700, yumurta 2, yoğurt 100, kabartma tozu 8, ceviz 100|Un, irmik, yağ, yumurta, yoğurt ve kabartma tozunu yoğurup ceviz büyüklüğünde toplar yapın.~Üzerine ceviz koyup 180°C fırında 25 dk pişirin.~Soğuk şerbeti sıcak tatlıya dökün.',
    'İrmik Helvası|T|irmik|-|irmik 500, tereyağı 200, toz şeker 400, süt 1000, ceviz 60, tarçın 2|İrmiği tereyağında kokusu çıkana kadar kavurun.~Süt ve şekeri ısıtıp irmiğe ekleyin, karıştırarak suyunu çektirin.~Demlenmeye bırakıp ceviz ve tarçınla servis edin.',
    'Un Helvası|T|un|-|un 400, tereyağı 200, toz şeker 400, süt 1000, ceviz 60|Tereyağında unu kokusu çıkıp renk alana dek kavurun.~Sıcak süt ve şekeri ekleyip koyulaşana kadar karıştırın.~10 dk demlendirip cevizle servis edin.',
    'Cevizli Tel Kadayıf|T|serbet|-|kadayıf (tel) 500, tereyağı 250, toz şeker 700, ceviz 200, krema 200|Kadayıfı ufalayıp erimiş tereyağıyla karıştırın.~Yarısını tepsiye serin, cevizi koyup kalan kadayıfla kapatın.~180°C fırında 35 dk pişirip soğuk şerbeti dökün; kremayla servis edin.',
    'Kabak Tatlısı|T|kabak|10-3|bal kabağı 2500, toz şeker 800, ceviz 200, tahin 100|Kabağı dilimleyip şekerle katlayarak bir gece bekletin.~Kısık ateşte suyunda yumuşayana dek pişirin.~Ceviz ve tahinle servis edin.',
    'Ayva Tatlısı|T|meyve|10-1|ayva 2500, toz şeker 600, krema 300, tarçın 3|Ayvaları dilimleyip şeker ve biraz suyla tencerede kısık ateşte 40 dk pişirin.~Soğutup kremayla servis edin.',
    'Elmalı Tarçınlı Kek|T|un|-|un 400, toz şeker 300, yumurta 4, ayçiçek yağı 200, süt 200, elma 600, tarçın 8, kabartma tozu 15, vanilin 2|Yumurta ve şekeri çırpıp yağ, süt, un, kabartma tozunu ekleyin.~Rendelenmiş elma ve tarçını katın.~170°C fırında 40 dk pişirin.',
    'Havuçlu Kek|T|havuc|-|un 400, havuç 500, toz şeker 300, yumurta 4, ayçiçek yağı 200, ceviz 100, tarçın 8, kabartma tozu 15, vanilin 2|Yumurta ve şekeri çırpıp yağı ekleyin.~Un, kabartma tozu, rendelenmiş havuç, ceviz ve tarçını karıştırın.~170°C fırında 40 dk pişirin.',
    'Islak Kek|T|cikolata|-|un 350, kakao 80, toz şeker 400, yumurta 4, ayçiçek yağı 150, süt 600, kabartma tozu 15, vanilin 2|Yumurta ve 250 g şekeri çırpıp yağ, kakao, un, kabartma tozu ve 200 ml sütü ekleyin; 180°C fırında 35 dk pişirin.~Kalan süt ve şekeri ısıtıp sıcak keke dökün; dinlendirip dilimleyin.',
    'Bisküvili Pasta (Mozaik)|T|cikolata|-|bisküvi 600, süt 600, kakao 80, toz şeker 250, tereyağı 100, ceviz 100|Süt, şeker, kakao ve tereyağını kaynatıp soğutun.~Kırılmış bisküvi ve cevizle karıştırın.~Streç filmle kalıba alıp buzdolabında 4 saat dinlendirin.',
    'Mevsim Meyve Tabağı|T|meyve|-|mevsim meyvesi 2500|Meyveleri yıkayıp dilimleyin.~Tabaklara paylaştırıp servis edin.',
    'Komposto|T|meyve|5-10|mevsim meyvesi 1500, toz şeker 300, tarçın 3|Meyveleri doğrayıp 3 litre suda şekerle 15 dk haşlayın.~Soğutup buzdolabında servis edin.',
    'Hoşaf|T|meyve|11-3|kuru kayısı 400, kuru üzüm 200, elma 300, toz şeker 250, tarçın 3|Kuru meyveleri bir gece suda bekletin.~Elmayı ve şekeri ekleyip 3 litre suda 20 dk pişirin.~Soğutup servis edin.',
    'Lokma Tatlısı|T|serbet,hamur|-|un 500, kuru maya 10, toz şeker 600, ayçiçek yağı 500, tuz 5|Un, maya, tuz ve ılık suyu çırparak sulu hamur yapıp 1 saat mayalandırın.~Kızgın yağa kaşıkla bırakıp altın rengi olana dek kızartın.~Soğuk şerbetten geçirip servis edin.',

    // ---------------- FAST FOOD / GELENEKSEL GÜN PARÇALARI (Çarşamba) ----------------
    'Kaşarlı Tost|F|hamur,peynir|-|tost ekmeği 40, kaşar peyniri 800, tereyağı 100|Ekmek dilimlerine kaşar koyup tost makinesinde ya da tavada kızarana kadar pişirin.',
    'Sucuklu Tost|F|hamur,sucuk|-|tost ekmeği 40, kaşar peyniri 500, sucuk 500, tereyağı 100|Ekmeklerin arasına sucuk ve kaşar yerleştirin.~Altın rengi alana dek pişirin.',
    'Hamburger|F|kofte,hamur|-|dana kıyma 1200, kuru soğan 150, galeta unu 80, yumurta 1, hamburger ekmeği 10, kaşar peyniri 200, marul 2, domates 500, turşu (salatalık) 200, ketçap 100, mayonez 100, hardal 30, tuz 35, karabiber 5, ayçiçek yağı 50|Kıyma, rendelenmiş soğan, galeta unu, yumurta ve baharatı yoğurup 10 adet köfte (120 g) yapın.~Köfteleri tavada veya ızgarada iki yüzü pişirin; son dakikada kaşar koyup eritin.~Ekmekleri ısıtıp köfte, marul, domates, turşu ve soslarla servis edin.',
    'Patates Kızartması|F|patates|-|patates 2000, ayçiçek yağı 800, tuz 20|Patatesleri çubuk doğrayıp soğuk suda bekletin, kurulayın.~Kızgın yağda iki aşamada (önce 5 dk, dinlendirip sonra 3 dk) kızartın.~Tuzlayıp sıcak servis edin.',
    'Ayran|F|yogurt|-|ayran 3000|Soğuk ayranı bardaklara paylaştırın.',
    'Lahana Salatası (Coleslaw)|F||-|beyaz lahana 800, havuç 300, mayonez 150, yoğurt 150, limon suyu 40, tuz 15|Lahana ve havucu ince doğrayın.~Mayonez, yoğurt, limon suyu ve tuzla karıştırıp soğutun.',
    'Köfte Ekmek|F|kofte,hamur|-|dana kıyma 1300, kuru soğan 250, galeta unu 100, yumurta 1, köfte ekmeği 10, sivri biber 400, domates 600, tuz 40, karabiber 5, kimyon 5, ayçiçek yağı 50|Kıyma, rendelenmiş soğan, galeta unu, yumurta ve baharatı yoğurup dinlendirin.~Köfteleri şekillendirip ızgarada veya tavada pişirin.~Közlenmiş biber ve domatesle, ısıtılmış ekmeğe doldurup servis edin.',
    'Sumaklı Soğan Salatası|F||-|kuru soğan 500, maydanoz 3, sumak 20, zeytinyağı 40, tuz 10|Soğanı yarım ay doğrayıp tuzla ovalayıp yıkayın.~Maydanoz, sumak ve zeytinyağıyla karıştırın.',
    'Peynirli Poğaça|F|hamur,peynir|-|un 800, yoğurt 200, ayçiçek yağı 200, süt 200, yumurta 2, kuru maya 10, kabartma tozu 10, beyaz peynir 400, maydanoz 1, tuz 15, toz şeker 10|Un, yoğurt, yağ, süt, 1 yumurta, maya, kabartma tozu, şeker ve tuzla yumuşak hamur yoğurun; 30 dk dinlendirin.~Peynir ve maydanozu karıştırıp iç harcı hazırlayın.~Hamurdan bezeler alıp iç koyarak kapatın; yumurta sürüp 190°C fırında 25 dk pişirin (yaklaşık 25 adet).',
    'Kıymalı Poğaça|F|hamur|-|un 800, yoğurt 200, ayçiçek yağı 200, süt 200, yumurta 2, kuru maya 10, kabartma tozu 10, dana kıyma 400, kuru soğan 200, tuz 20, karabiber 3|Un, yoğurt, yağ, süt, yumurta, maya, kabartma tozu ve tuzla hamuru yoğurup dinlendirin.~Kıymayı soğanla kavurarak iç harcı hazırlayın.~Bezelere iç koyup şekillendirin, yumurta sürüp 190°C fırında 25 dk pişirin (yaklaşık 25 adet).',
    'Çay|F||-|çay 80, toz şeker 200|Demliğe çayı koyup kaynar suyla demleyin.~Bardaklarda şekerle servis edin.',
    'Lahmacun|F|hamur|-|lahmacun (hazır) 20, limon 3, maydanoz 2|Lahmacunları fırında veya sıcak saçta ısıtın.~Üzerine maydanoz ve limonla servis edin.',
    'Lahmacun Yeşilliği|F||-|maydanoz 3, kuru soğan 200, domates 300, limon 3, sumak 5|Maydanoz, soğan ve domatesi ince doğrayın.~Sumak ve limonla karıştırıp lahmacunun yanında servis edin.',
    'Karışık Tost|F|hamur,sucuk|-|tost ekmeği 20, kaşar peyniri 400, sucuk 300, domates 300, tereyağı 60, ketçap 50|Ekmeklerin arasına kaşar, sucuk ve domates koyun.~Tost makinesinde veya tavada tereyağıyla iki yüzü kızarana kadar pişirin.~Ketçapla servis edin.',

    // ---------------- KAHVALTI PARÇALARI (Cuma) ----------------
    'Çılbır|K|yumurta,yogurt|-|yumurta 20, yoğurt 800, sarımsak 20, tereyağı 80, pul biber 6, tuz 15|Sarımsaklı yoğurdu tabaklara yayın.~Yumurtaları kaynar suda poşe edip yoğurdun üzerine yerleştirin.~Tereyağında pul biberi kızdırıp gezdirin.',
    'Yumurtalı Ekmek|K|yumurta,hamur|-|ekmek 20, yumurta 12, süt 400, tereyağı 100, tuz 12, toz şeker 20|Yumurta, süt, şeker ve tuzu çırpın.~Ekmek dilimlerini bandırıp tereyağlı tavada iki yüzünü kızartın.',
    'Sahanda Yumurta|K|yumurta|-|yumurta 20, tereyağı 100, tuz 12, pul biber 3|Tereyağını sahanlarda eritip yumurtaları kırın.~Kapağı kapalı pişirin, pul biberle servis edin.',
    'Kıymalı Gözleme|K|hamur|-|un 900, dana kıyma 700, kuru soğan 250, maydanoz 2, ayçiçek yağı 100, tereyağı 60, tuz 20, karabiber 3|Un, tuz ve ılık sudan hamuru yoğurup dinlendirin.~Kıymayı soğanla kavurun, maydanoz ekleyin.~Hamuru açıp iç koyarak katlayın, sacda ya da tavada pişirin.',
    'Patatesli Gözleme|K|hamur,patates|-|un 900, patates 1500, kuru soğan 200, maydanoz 2, ayçiçek yağı 100, tereyağı 60, tuz 25, pul biber 5|Hamuru yoğurup dinlendirin.~Haşlanmış patatesi ezip soğan, maydanoz ve baharatla karıştırın.~Hamurları açıp iç koyarak katlayın ve pişirin.',
    'Mantarlı Menemen|K|yumurta,mantar|-|yumurta 20, mantar 500, sivri biber 300, domates 800, kuru soğan 200, tereyağı 80, tuz 20, karabiber 3|Soğan, biber ve mantarı tereyağında kavurun.~Rendelenmiş domatesi ekleyip suyunu çektirin.~Yumurtaları kırıp hafifçe karıştırarak pişirin.',
    'Menemen|K|yumurta|-|yumurta 20, sivri biber 400, domates 1000, kuru soğan 250, tereyağı 80, ayçiçek yağı 60, tuz 25, pul biber 5, karabiber 3|Soğan ve biberi yağda kavurun.~Rendelenmiş domatesi ekleyip suyunu çektirin.~Yumurtaları kırıp hafifçe karıştırarak pişirin; tuz ve baharat ekleyin.',
    'Sucuklu Menemen|K|yumurta,sucuk|-|yumurta 20, sivri biber 400, domates 1000, kuru soğan 250, sucuk 400, tereyağı 80, tuz 20, pul biber 5|Sucuğu yağsız tavada kızartın.~Soğan, biber ve domatesle menemen yapıp yumurtaları ekleyin.~Sucukla karıştırıp servis edin.',
    'Kaşarlı Omlet|K|yumurta,peynir|-|yumurta 25, süt 250, kaşar peyniri 300, tereyağı 80, tuz 20, karabiber 3, maydanoz 1|Yumurta, süt, tuz ve karabiberi çırpın.~Tereyağlı tavada pişirip kaşar ve maydanozu koyun, katlayın.',
    'Mantarlı Omlet|K|yumurta,mantar|-|yumurta 25, mantar 500, kaşar peyniri 200, süt 200, tereyağı 80, tuz 20, karabiber 3|Mantarı tereyağında suyunu çekene kadar kavurun.~Çırpılmış yumurta ve sütü ekleyip pişirin; kaşar serpip katlayın.',
    'Sucuklu Yumurta|K|yumurta,sucuk|-|yumurta 20, sucuk 500, tereyağı 60, pul biber 3|Sucuk dilimlerini tavada kızartın.~Yumurtaları üzerine kırıp kapağı kapalı pişirin.',
    'Haşlanmış Yumurta|K|yumurta|-|yumurta 15, tuz 10|Yumurtaları kaynar suda 9 dk haşlayın.~Soğuk suda soğutup soyun, servis edin.',
    'Pişi|K|hamur|-|un 800, kuru maya 10, yoğurt 200, süt 300, toz şeker 20, tuz 15, ayçiçek yağı 700, yumurta 1|Un, maya, yoğurt, süt, şeker, tuz ve yumurtayı yoğurup 1 saat mayalandırın.~Hamurdan parçalar kopartıp açın.~Kızgın yağda iki yüzü altın rengi olana kadar kızartın (yaklaşık 30 adet).',
    'Krep (Çikolata-Muz-Reçel)|K|hamur,sut|-|un 400, yumurta 4, süt 800, ayçiçek yağı 60, tuz 8, çikolatalı krem 300, muz 600, reçel 200|Un, yumurta, süt, yağ ve tuzu çırparak akışkan hamur yapın; 15 dk dinlendirin.~Yağlı tavada ince krepler pişirin.~Çikolatalı krem, muz dilimleri veya reçelle doldurup katlayın.',
    'Peynirli Gözleme|K|hamur,peynir|-|un 900, beyaz peynir 500, maydanoz 2, ayçiçek yağı 100, tereyağı 60, tuz 15|Un, tuz ve ılık sudan hamuru yoğurup bezeler yapın; 20 dk dinlendirin.~Hamuru ince açıp peynir ve maydanozu koyarak katlayın.~Sac veya tavada iki yüzünü pişirip tereyağı sürün.',
    'Sigara Böreği|K|hamur,peynir|-|yufka 8, beyaz peynir 500, maydanoz 2, yumurta 1, ayçiçek yağı 600|Peynir, maydanoz ve yumurtayı karıştırın.~Yufkaları üçgen kesip iç koyarak sigara şeklinde sarın.~Kızgın yağda altın rengi olana dek kızartın (yaklaşık 40 adet).',
    'Kahvaltılık Tabağı|K|peynir|-|beyaz peynir 600, kaşar peyniri 300, zeytin 400, domates 800, salatalık 700, maydanoz 1|Peynirleri dilimleyip tabaklara dizin.~Zeytin, domates ve salatalıkla birlikte servis edin.',
    'Bal-Reçel-Tereyağı Seti|K||-|bal 250, reçel 300, tereyağı 250, çikolatalı krem 200|Bal, reçel, tereyağı ve çikolatalı kremi küçük kaselere paylaştırın.',
    'Simit|K|hamur|-|simit 12|Simitleri ısıtıp servis edin.'
  ];

  // Günün özel menü paketleri (isim ile tarif eşleştirmesi)
  var WED_COMBOS = [
    { name: 'Hamburger Günü', items: ['Hamburger', 'Patates Kızartması', 'Lahana Salatası (Coleslaw)', 'Ayran'] },
    { name: 'Köfte Ekmek Günü', items: ['Köfte Ekmek', 'Sumaklı Soğan Salatası', 'Ayran'] },
    { name: 'Geleneksel Gün (Kısır & Peynirli Poğaça)', items: ['Kısır', 'Peynirli Poğaça', 'Ayran', 'Çay'] },
    { name: 'Lahmacun Günü', items: ['Lahmacun', 'Lahmacun Yeşilliği', 'Ayran'] },
    { name: 'Tost Günü', items: ['Karışık Tost', 'Patates Kızartması', 'Ayran'] },
    { name: 'Geleneksel Gün (Kısır & Kıymalı Poğaça)', items: ['Kısır', 'Kıymalı Poğaça', 'Ayran', 'Çay'] },
    { name: 'Kaşarlı Tost & Çorba Günü', items: ['Kaşarlı Tost', 'Domates Çorbası', 'Patates Kızartması', 'Ayran'] },
    { name: 'Sucuklu Tost Günü', items: ['Sucuklu Tost', 'Patates Kızartması', 'Ayran'] },
    { name: 'Poğaça & Çay Günü', items: ['Kıymalı Poğaça', 'Peynirli Poğaça', 'Kısır', 'Çay'] }
  ];
  var FRI_COMBOS = [
    { name: 'Menemen Kahvaltısı', items: ['Menemen', 'Kahvaltılık Tabağı', 'Bal-Reçel-Tereyağı Seti', 'Simit', 'Çay'] },
    { name: 'Krep & Omlet Kahvaltısı', items: ['Krep (Çikolata-Muz-Reçel)', 'Kaşarlı Omlet', 'Kahvaltılık Tabağı', 'Çay'] },
    { name: 'Pişi Kahvaltısı', items: ['Pişi', 'Sucuklu Yumurta', 'Kahvaltılık Tabağı', 'Bal-Reçel-Tereyağı Seti', 'Çay'] },
    { name: 'Mantarlı Omlet Kahvaltısı', items: ['Mantarlı Omlet', 'Patates Kızartması', 'Kahvaltılık Tabağı', 'Simit', 'Çay'] },
    { name: 'Gözleme Kahvaltısı', items: ['Peynirli Gözleme', 'Haşlanmış Yumurta', 'Kahvaltılık Tabağı', 'Bal-Reçel-Tereyağı Seti', 'Çay'] },
    { name: 'Sigara Böreği Kahvaltısı', items: ['Sigara Böreği', 'Sucuklu Menemen', 'Kahvaltılık Tabağı', 'Çay'] },
    { name: 'Çılbır Kahvaltısı', items: ['Çılbır', 'Simit', 'Kahvaltılık Tabağı', 'Çay'] },
    { name: 'Patatesli Gözleme Kahvaltısı', items: ['Patatesli Gözleme', 'Haşlanmış Yumurta', 'Kahvaltılık Tabağı', 'Çay'] },
    { name: 'Yumurtalı Ekmek Kahvaltısı', items: ['Yumurtalı Ekmek', 'Kahvaltılık Tabağı', 'Bal-Reçel-Tereyağı Seti', 'Çay'] },
    { name: 'Mantarlı Menemen Kahvaltısı', items: ['Mantarlı Menemen', 'Kahvaltılık Tabağı', 'Simit', 'Çay'] },
    { name: 'Kıymalı Gözleme Kahvaltısı', items: ['Kıymalı Gözleme', 'Sahanda Yumurta', 'Kahvaltılık Tabağı', 'Çay'] }
  ];

  // Resmi tatiller (yemek yok). Yıllık sabitler + 2027 dini bayramlar (Diyanet takvimi)
  var HOLIDAYS = {
    '2026-12-31': 'Yılbaşı arifesi (kontrol edin)',
    '2027-01-01': 'Yılbaşı',
    '2027-03-09': 'Ramazan Bayramı 1. gün', '2027-03-10': 'Ramazan Bayramı 2. gün', '2027-03-11': 'Ramazan Bayramı 3. gün',
    '2027-04-23': '23 Nisan', '2027-05-01': '1 Mayıs',
    '2027-05-17': 'Kurban Bayramı 2. gün', '2027-05-18': 'Kurban Bayramı 3. gün', '2027-05-19': 'Kurban Bayramı 4. gün / 19 Mayıs',
    '2027-07-15': '15 Temmuz', '2027-08-30': '30 Ağustos', '2027-10-29': '29 Ekim',
    '2028-01-01': 'Yılbaşı', '2028-04-23': '23 Nisan', '2028-05-01': '1 Mayıs', '2028-05-19': '19 Mayıs',
    '2028-07-15': '15 Temmuz', '2028-08-30': '30 Ağustos', '2028-10-29': '29 Ekim'
  };
  delete HOLIDAYS['2026-12-31'];

  var SLOT_LABEL = { corba: 'Çorba', ana: 'Ana Yemek', ikinci: 'Pilav / Makarna', salata: 'Salata', tatli: 'Tatlı', ozel: 'Özel Menü' };
  var CAT_SLOT = { C: 'corba', A: 'ana', P: 'ikinci', S: 'salata', T: 'tatli', F: 'ozel', K: 'ozel' };
  var CAT_NAME = { C: 'Çorbalar', A: 'Ana Yemekler', P: 'Pilav / Makarna', S: 'Salatalar', T: 'Tatlılar', F: 'Fast Food / Geleneksel Gün', K: 'Kahvaltı (Cuma)' };

  function slug(s) {
    var m = { 'ı': 'i', 'İ': 'i', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u', 'ş': 's', 'Ş': 's', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c' };
    return String(s).replace(/[ıİğĞüÜşŞöÖçÇ]/g, function (c) { return m[c]; })
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // --- parse ---
  var ING = {};       // id -> {id,name,unit,cat}
  var ING_BY_NAME = {};
  MASTER.forEach(function (l) {
    var p = l.split('|');
    var o = { id: slug(p[0]), name: p[0], unit: p[1], cat: p[2] };
    ING[o.id] = o; ING_BY_NAME[o.name] = o;
  });

  var REC = {};       // id -> recipe
  var REC_LIST = [];
  var REC_BY_NAME = {};
  var errors = [];
  RECIPES.forEach(function (line) {
    if (/^\s*\/\//.test(line)) return;
    var p = line.split('|');
    if (p.length !== 6) { errors.push('Satır hatası: ' + line.slice(0, 40)); return; }
    var r = {
      id: slug(p[0]), name: p[0], cat: p[1],
      tags: p[2] ? p[2].split(',') : [],
      season: p[3] === '-' ? null : p[3].split('-').map(Number),
      ing: [], steps: p[5].split('~')
    };
    p[4].split(',').forEach(function (s) {
      s = s.trim();
      var m = s.match(/^(.*\S)\s+(\d+(?:\.\d+)?)$/);
      if (!m) { errors.push(r.name + ': malzeme çözülemedi: ' + s); return; }
      var ing = ING_BY_NAME[m[1]];
      if (!ing) { errors.push(r.name + ': bilinmeyen malzeme: ' + m[1]); return; }
      r.ing.push({ id: ing.id, q: parseFloat(m[2]) });
    });
    r.slot = CAT_SLOT[r.cat];
    if (REC[r.id]) errors.push('Tekrarlı tarif: ' + r.name);
    REC[r.id] = r; REC_LIST.push(r); REC_BY_NAME[r.name] = r;
  });

  function mapCombos(arr) {
    return arr.map(function (c) {
      return {
        name: c.name, items: c.items.map(function (n) {
          var r = REC_BY_NAME[n]; if (!r) { errors.push('Combo tarifi yok: ' + n); return null; } return r.id;
        }).filter(Boolean)
      };
    });
  }
  var WED = mapCombos(WED_COMBOS), FRI = mapCombos(FRI_COMBOS);

  function inSeason(r, month) {
    if (!r.season) return true;
    var a = r.season[0], b = r.season[1];
    return a <= b ? (month >= a && month <= b) : (month >= a || month <= b);
  }

  var api = {
    CATS: CATS, ING: ING, REC: REC, REC_LIST: REC_LIST, REC_BY_NAME: REC_BY_NAME,
    WED: WED, FRI: FRI, HOLIDAYS: HOLIDAYS, SLOT_LABEL: SLOT_LABEL, CAT_SLOT: CAT_SLOT, CAT_NAME: CAT_NAME,
    errors: errors, slug: slug, inSeason: inSeason
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.YDATA = api;
})(typeof window !== 'undefined' ? window : globalThis);
