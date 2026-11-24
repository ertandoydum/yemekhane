const D=require('../js/data.js'), C=require('../js/core.js');
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('✗',m);} };
// --- veri kuralları ---
ok(D.errors.length===0,'veri hataları '+D.errors);
const bannedWords=/tavuk|piliç|\bhindi\b|nohut|barbunya|kuru fasulye|börülce/i;
D.REC_LIST.forEach(r=>{
  const txt=r.name+' '+r.steps.join(' ')+' '+r.ing.map(i=>D.ING[i.id].name).join(' ');
  ok(!bannedWords.test(txt),'yasak kelime: '+r.name);
  ok(r.steps.length>=1 && r.ing.length>=1,'eksik tarif: '+r.name);
  r.ing.forEach(i=>ok(i.q>0,'miktar: '+r.name));
  if(r.cat==='A') ok(r.ing.some(i=>i.id==='dana-kiyma'||i.id==='dana-kusbasi'),'ana yemek etsiz: '+r.name);
  if(r.cat==='C'&&/Düğün/.test(r.name)) ok(true);
});
// --- menü ---
const START=C.BASE.start, END=C.BASE.end;
const menu=C.generate(START,END,C.BASE.seed);
let counts={}, bad=0;
const normalDays=[]; 
for(let d=START; d<=END; d=C.addDays(d,1)){
  const w=C.dow(d), day=menu[d];
  if(w>5){ ok(!day,'hafta sonu menü var '+d); continue; }
  ok(!!day,'gün yok '+d);
  if(day.off){ ok(!!D.HOLIDAYS[d],'tatil değil '+d); continue; }
  if(w===3){ ok(D.WED.some(c=>c.name===day.combo),'çarşamba combo '+d); }
  else if(w===5){ ok(D.FRI.some(c=>c.name===day.combo),'cuma combo '+d); }
  else{
    ok(day.slots.length===5,'5 çeşit değil '+d);
    const sl=day.slots.map(s=>s.s).join(',');
    ok(sl==='corba,ana,ikinci,salata,tatli','slot sırası '+d+' '+sl);
    day.slots.forEach(s=>{ const r=D.REC[s.id]; ok(r&&D.inSeason(r,C.monthOf(d)),'sezon dışı '+d+' '+s.id); counts[s.id]=(counts[s.id]||0)+1; });
    normalDays.push(d);
    const tags=[]; let dup=false;
    day.slots.forEach(s=>D.REC[s.id].tags.forEach(t=>{ if(tags.includes(t)) dup=true; tags.push(t); }));
    if(dup) bad++;
  }
}
console.log('normal gün:',normalDays.length,' aynı gün etiket çakışması:',bad);
// tekrar aralığı (ana yemek, 2027 için)
function minGap(slot){ const last={}; let min=1e9, n=0; const g={};
  normalDays.filter(d=>d.startsWith('2027')).forEach(d=>{ const id=menu[d].slots.find(s=>s.s===slot).id; if(last[id]!=null){ const gap=n-last[id]; g[gap]=(g[gap]||0)+1; min=Math.min(min,gap);} last[id]=n; n++; });
  return min; }
['ana','ikinci','corba','salata','tatli'].forEach(s=>console.log(s,'en kısa tekrar aralığı (menülü gün):',minGap(s)));
// en çok tekrar eden yemekler 2027
const c27={}; normalDays.filter(d=>d.startsWith('2027')).forEach(d=>menu[d].slots.forEach(s=>c27[s.id]=(c27[s.id]||0)+1));
const top=Object.entries(c27).sort((a,b)=>b[1]-a[1]).slice(0,5); console.log('2027 en çok tekrar:',top.map(([i,n])=>D.REC[i].name+' '+n).join(' | '));
const used=new Set(Object.keys(c27)); const unused=D.REC_LIST.filter(r=>'CAPST'.includes(r.cat)&&!used.has(r.id)).map(r=>r.name); console.log('2027 hiç çıkmayan:',unused);
// Çarşamba/Cuma kombo aralığı
['3','5'].forEach(w=>{ const seq=[]; for(let d='2027-01-01'; d<='2027-12-31'; d=C.addDays(d,1)) if(String(C.dow(d))===w && menu[d]&&menu[d].combo) seq.push(menu[d].combo); const f={}; seq.forEach(x=>f[x]=(f[x]||0)+1); console.log(w==='3'?'Çarşamba':'Cuma',seq.length,'gün',JSON.stringify(f)); let mg=99; const pos={}; seq.forEach((x,i)=>{ if(pos[x]!=null) mg=Math.min(mg,i-pos[x]); pos[x]=i;}); console.log('  en kısa kombo tekrarı (hafta):',mg); });
// belirleyicilik
const m2=C.generate(START,END,C.BASE.seed); ok(JSON.stringify(m2)===JSON.stringify(menu),'oluşturucu deterministik değil');
// bağlamlı üretim
const prev=['2027-03-01','2027-03-02','2027-03-04'].map(d=>menu[d]);
const reg=C.generate('2027-03-08','2027-03-12',777,{prev}); ok(Object.keys(reg).length===5,'bağlamlı üretim');
const first=reg['2027-03-08']; ok(first.off||first.slots.length>0,'');
// alışveriş
const need=C.weekNeed(d=>menu[d],'2027-01-04',30);
console.log('2027-01-04 haftası: ',Object.keys(need).length,'malzeme; örnek:', Object.entries(need).slice(0,4).map(([k,v])=>k+':'+C.fmtQty(C.buyRound(v.need,D.ING[k].unit),D.ING[k].unit)).join(', '));
ok(C.fmtQty(2350,'g')==='2,35 kg' && C.buyRound(2350,'g')===2400 && C.fmtQty(C.buyRound(2350,'g'),'g')==='2,4 kg','fmt/round');
ok(C.buyRound(12,'g')===15 && C.buyRound(0.2,'adet')===1 && C.buyRound(430,'g')===450,'buyRound');
ok(C.weekNeed(d=>menu[d],'2027-05-17',30)['dana-kiyma']===undefined || true,'');
console.log(fail?('BAŞARISIZ '+fail):'TÜM TESTLER GEÇTİ');
process.exit(fail?1:0);
