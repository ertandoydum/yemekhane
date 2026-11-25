// Kullanıcı yemeği ekleme / menüde kullanma kuralları: node tests/test-yemek-ekle.js
const D = require('../js/data.js'), C = require('../js/core.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('HATA:', m); } else console.log('OK  ', m); };
const baseBefore = JSON.stringify(C.generate('2026-11-23', '2027-03-31', 20261124));

D.registerIng({ id: 'taze-mantar', name: 'taze mantar', unit: 'g', cat: 'SEB' });
ok(D.ING['taze-mantar'] && D.ING['taze-mantar'].custom, 'özel malzeme kaydedildi');
D.registerRec({ id: 'o-test-yemegi', name: 'Test Yemeği', cat: 'A', tags: [], season: null, ing: [{ id: 'dana-kiyma', q: 1000 }, { id: 'taze-mantar', q: 500 }], steps: ['Pişirin.'] });
ok(D.REC['o-test-yemegi'] && D.REC_LIST.some(r => r.id === 'o-test-yemegi'), 'özel yemek kaydedildi');

// Hazır menü (opts verilmeden) özel yemekten etkilenmez
ok(JSON.stringify(C.generate('2026-11-23', '2027-03-31', 20261124)) === baseBefore, 'hazır menü özel yemek eklenince değişmedi');
// Yeniden oluşturmada özel yemek havuza girer
let used = 0; for (let s = 1; s <= 40; s++) { const g = C.generate('2026-12-01', '2027-02-26', s, { includeCustom: true }); used += JSON.stringify(g).includes('o-test-yemegi') ? 1 : 0; }
ok(used > 0, 'yeniden oluşturmada özel yemek menüye girebiliyor (' + used + '/40 denemede)');
// Menüde kullanma işareti
let usedEx = 0; for (let s = 1; s <= 40; s++) { const g = C.generate('2026-12-01', '2027-02-26', s, { includeCustom: true, exclude: { 'o-test-yemegi': 1, 'dana-kiyma': 1 } }); usedEx += JSON.stringify(g).includes('o-test-yemegi') ? 1 : 0; }
ok(usedEx === 0, 'menüde kullanma işaretli yemek hiç seçilmedi');
const someId = D.REC_LIST.filter(r => r.cat === 'A' && !r.custom)[0].id;
const gx = JSON.stringify(C.generate('2026-12-01', '2027-02-26', 7, { exclude: { [someId]: 1 } }));
ok(!gx.includes('"id":"' + someId + '"'), 'hazır yemek de menüden çıkarılabiliyor');
D.unregisterRec('o-test-yemegi'); D.unregisterIng('taze-mantar');
ok(!D.REC['o-test-yemegi'] && !D.ING['taze-mantar'], 'silme çalışıyor');
ok(!D.REC_LIST.some(r => r.custom) && D.errors.length === 0, 'veri bütünlüğü korundu');
process.exit(fail ? 1 : 0);
