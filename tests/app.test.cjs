const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function app(records={}, nativePlugin=null, savedCatalog=null) {
 const dom=new JSDOM(fs.readFileSync('www/index.html','utf8'),{url:'https://localhost',runScripts:'outside-only'});
 const w=dom.window;
 w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.confirm=()=>true;w.alert=()=>{};w.requestAnimationFrame=fn=>fn();
 const RealDate=w.Date;w.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,9,10,12]))}static now(){return new RealDate(2026,9,10,12).getTime()}};
 if(nativePlugin)w.Capacitor={isNativePlatform:()=>true,Plugins:{Journal:nativePlugin}};
 w.localStorage.setItem('calendar-notes-v1',JSON.stringify(records));
 if(savedCatalog)w.localStorage.setItem('calendar-catalog-v1',JSON.stringify(savedCatalog));
 w.eval(fs.readFileSync('www/holidays.js','utf8'));
 w.eval(fs.readFileSync('www/app.js','utf8'));
 return {w,d:w.document,close:()=>w.close()};
}
function edit(a){a.d.querySelector('[data-tab="day"]').click();return a.d.querySelector('#note')}
function type(a,value){const t=a.d.querySelector('#note');t.value=value;t.dispatchEvent(new a.w.Event('input'));}
function stored(a){return JSON.parse(a.w.localStorage.getItem('calendar-notes-v1'));}
test('multiline edits autosave, navigation saves, delete only selected day',()=>{
 const a=app();edit(a);type(a,'11:40\n[가게]\n밥\n국\n18:00\n면');
 const first=Object.keys(stored(a))[0];assert.equal(stored(a)[first],'11:40\n[가게]\n밥\n국\n\n18:00\n면');
 a.d.querySelector('#edit-next').click();type(a,'다음날 음식');
 a.d.querySelector('#edit-prev').click();assert.match(a.d.querySelector('#note').value,/국\n\n18:00/);
 a.d.querySelector('#delete').click();assert.equal(Object.keys(stored(a)).length,1);assert.equal(stored(a)[first],undefined);a.close();
});
test('food counts, grades, gray zero, pastel saturation at eight and same dark palette',()=>{
 const a=app();edit(a);const colors=[];
 for(let n=0;n<=9;n++){
 type(a,'11:40\n[가게]\n\n'+Array.from({length:n},(_,i)=>'음식'+i).join('\n'));
 a.d.querySelector('#save').click();const card=a.d.querySelector('.entry');
 assert.equal(card.querySelector('.grade').textContent,n<=2?'Excellent':n<=4?'Good':n<=6?'Hmm...':'Bad');
 colors.push(card.style.background);edit(a);
 }
 assert.equal(colors[0],'rgb(240, 241, 243)');assert.equal(new Set(colors.slice(0,9)).size,9);assert.equal(colors[8],colors[9]);
 a.d.querySelector('#save').click();a.d.querySelector('[data-tab="settings"]').click();
 a.d.querySelector('#theme').value='dark';a.d.querySelector('#theme').dispatchEvent(new a.w.Event('change'));
 edit(a);a.d.querySelector('#close').click();assert.equal(a.d.querySelector('.entry').style.background,colors[9]);a.close();
});
test('week keeps full long note; settings alignment and font persist',()=>{
 const a=app();edit(a);const long=Array.from({length:100},(_,i)=>'음식'+i).join('\n');type(a,long);a.d.querySelector('#close').click();
 a.d.querySelector('[data-tab="week"]').click();assert.ok(a.d.querySelectorAll('.entry').length>28);assert.equal(a.d.querySelector('pre').textContent,long);
 a.d.querySelector('[data-tab="settings"]').click();a.d.querySelector('#align').value='left';a.d.querySelector('#align').dispatchEvent(new a.w.Event('change'));
 const slider=a.d.querySelector('input[type="range"]');slider.value='22';slider.dispatchEvent(new a.w.Event('input'));
 assert.equal(JSON.parse(a.w.localStorage.getItem('calendar-settings-v2')).font,22);assert.equal(a.d.documentElement.style.getPropertyValue('--note-align'),'left');a.close();
});
test('JSON import restores records and rejects invalid format without data loss',async()=>{
 const a=app();a.d.querySelector('[data-tab="settings"]').click();const file=a.d.querySelector('input[type="file"]');
 Object.defineProperty(file,'files',{configurable:true,value:[{text:async()=>JSON.stringify({format:'calendar-notes-v1',records:{'2026-10-10':'[가게]\n밥'}})}]});
 await file.onchange();assert.equal(stored(a)['2026-10-10'],'[가게]\n밥');
 Object.defineProperty(file,'files',{value:[{text:async()=>'{}'}]});await file.onchange();assert.equal(stored(a)['2026-10-10'],'[가게]\n밥');a.close();
});

test('Android injected bridge starts without registerPlugin and native time + backup work',async()=>{
 let exported;
 const a=app({}, {pickTime:async()=>({time:'19:10'}),exportJson:async data=>{exported=data;return {cancelled:false}}});
 assert.ok(a.d.querySelectorAll('.entry').length>28);
 a.d.querySelector('.entry').click();
 assert.equal(a.d.querySelector('#editor').classList.contains('hidden'),false);
 type(a,'11:50\n[코스트코]\n치즈피자 1조각\n밥 150\n참치김치찌개');
 await a.d.querySelector('#insert-time').onclick();
 assert.match(a.d.querySelector('#note').value,/찌개\n\n19:10\n$/);
 type(a,a.d.querySelector('#note').value+'닭가슴살\n사과');
 a.d.querySelector('#save').click();
 assert.equal(a.d.querySelector('.entry .grade').textContent,'Hmm...');
 a.d.querySelector('[data-tab="settings"]').click();
 await [...a.d.querySelectorAll('.settings button')].find(b=>b.textContent.includes('내보내기')).onclick();
 assert.match(Object.values(JSON.parse(exported.data).records)[0],/닭가슴살\n사과/);a.close();
});

test('empty dates have no hint or grade, month uses year first, shop opens reusable list',()=>{
 const a=app();assert.equal(a.d.querySelectorAll('.entry .grade,.entry .hint').length,0);
 assert.match(a.d.querySelector('.month-divider').textContent,/^\d{4}년 \d{1,2}월$/);
 const t=edit(a);a.d.querySelector('#insert-shop').click();assert.equal(t.value,'');assert.equal(a.d.querySelector('#catalog-dialog').classList.contains('hidden'),false);a.d.querySelector('#catalog-close').click();
 type(a,'   \n');a.d.querySelector('#save').click();assert.equal(a.d.querySelectorAll('.grade').length,0);a.close();
});

test('continuous dates, year-first month boundaries, red weekends/holidays and today badge',()=>{
 const a=app(),cards=[...a.d.querySelectorAll('.entry')];
 assert.equal(cards[0].dataset.date,'2026-09-01');assert.equal(cards.at(-1).dataset.date,'2026-11-30');
 for(let i=1;i<cards.length;i++)assert.equal(new Date(cards[i].dataset.date)-new Date(cards[i-1].dataset.date),86400000);
 assert.equal(a.d.querySelector('#prev').hidden,true);assert.equal(a.d.querySelector('#next').hidden,true);
 for(const k of ['2026-10-03','2026-10-04','2026-10-05','2026-10-09','2026-10-10'])assert.ok(a.d.querySelector(`[data-date="${k}"] .rest-day`));
 assert.equal(a.d.querySelector('[data-date="2026-10-08"] .rest-day'),null);
 assert.equal(a.d.querySelectorAll('.today-badge').length,1);assert.equal(a.d.querySelector('.today').dataset.date,'2026-10-10');
 const november=a.d.querySelector('[data-date="2026-11-01"]');assert.equal(november.previousElementSibling.textContent,'2026년 11월');
 a.close();
});
test('scrolling extends both ends without gaps and prepending preserves position',()=>{
 const a=app(),c=a.d.querySelector('#content');
 Object.defineProperty(c,'clientHeight',{value:500});Object.defineProperty(c,'scrollHeight',{get:()=>c.querySelectorAll('.entry').length*50});
 c.scrollTop=c.scrollHeight-500;c.dispatchEvent(new a.w.Event('scroll'));
 assert.equal(c.querySelector('.entry:last-child').dataset.date,'2026-12-31');
 const oldHeight=c.scrollHeight;c.scrollTop=0;c.dispatchEvent(new a.w.Event('scroll'));
 assert.equal(c.querySelector('.entry').dataset.date,'2026-08-01');assert.equal(c.scrollTop,c.scrollHeight-oldHeight);
 assert.equal(new Set([...c.querySelectorAll('.entry')].map(e=>e.dataset.date)).size,c.querySelectorAll('.entry').length);
 a.d.querySelector('#today').click();assert.equal(c.querySelector('.entry').dataset.date,'2026-09-01');a.close();
});
test('offline Korean holiday calendar includes lunar, substitute and revised holidays',()=>{
 const a=app(),h=a.w.KOREAN_HOLIDAYS;
 for(const k of ['2026-02-16','2026-02-17','2026-02-18','2026-03-02','2026-05-01','2026-05-25','2026-06-03','2026-07-17','2026-08-17','2026-09-24','2026-09-25','2026-09-26','2026-10-05'])assert.ok(h[k],k);
 for(const k of ['2026-06-08','2026-09-28','2026-10-08'])assert.equal(h[k],undefined,k);
 assert.equal(h['2025-07-17'],undefined);assert.ok(h['2027-07-19']);a.close();
});

function addName(a,name){a.d.querySelector('#catalog-input').value=name;a.d.querySelector('#catalog-form').dispatchEvent(new a.w.Event('submit',{cancelable:true}));}
function chooseName(a,name){[...a.d.querySelectorAll('.catalog-choose')].find(b=>b.textContent===name).click();}
test('saved shops and menus insert on separate lines, survive restart, and preserve counts',()=>{
 const a=app();const t=edit(a);type(a,'11:40\n');t.setSelectionRange(t.value.length,t.value.length);
 assert.equal(a.d.querySelector('#sort-time'),null);
 a.d.querySelector('#insert-shop').click();addName(a,'[코스트코]');addName(a,'코스트코');
 assert.equal(a.d.querySelectorAll('.catalog-choose').length,1);chooseName(a,'[코스트코]');
 assert.equal(t.value,'11:40\n[코스트코]\n');
 a.d.querySelector('#insert-menu').click();addName(a,'치즈피자');addName(a,'사과');chooseName(a,'치즈피자');chooseName(a,'사과');
 assert.equal(t.value,'11:40\n[코스트코]\n치즈피자\n사과\n');
 a.d.querySelector('#catalog-close').click();a.d.querySelector('#save').click();assert.equal(a.d.querySelector('.grade').textContent,'Excellent');
 const saved=JSON.parse(a.w.localStorage.getItem('calendar-catalog-v1'));a.close();
 const b=app({},null,saved);edit(b);b.d.querySelector('#insert-menu').click();assert.equal(b.d.querySelectorAll('.catalog-choose').length,2);b.close();
});
test('history seeds lists once; editing/deleting saved names never changes prior notes',()=>{
 const records={'2026-10-05':'11:40\n[정군족발]\n보쌈\n\n18:00\n사과'};
 const a=app(records);edit(a);a.d.querySelector('#insert-shop').click();
 assert.equal(a.d.querySelector('.catalog-choose').textContent,'[정군족발]');
 a.d.querySelector('.catalog-edit').click();addName(a,'정군족발 본점');assert.equal(a.d.querySelector('.catalog-choose').textContent,'[정군족발 본점]');
 a.d.querySelector('.catalog-delete').click();assert.equal(a.d.querySelectorAll('.catalog-choose').length,0);
 assert.equal(stored(a)['2026-10-05'],records['2026-10-05']);
 const saved=JSON.parse(a.w.localStorage.getItem('calendar-catalog-v1'));a.close();
 const b=app(records,null,saved);edit(b);b.d.querySelector('#insert-shop').click();assert.equal(b.d.querySelectorAll('.catalog-choose').length,0);b.close();
});
test('catalog backup round-trip, legacy imports and malformed catalogs protect data',async()=>{
 let backup;const a=app({}, {exportJson:async p=>{backup=JSON.parse(p.data);return {cancelled:false}}});
 edit(a);a.d.querySelector('#insert-shop').click();addName(a,'새 가게');a.d.querySelector('#catalog-close').click();a.d.querySelector('#save').click();
 a.d.querySelector('[data-tab=settings]').click();await [...a.d.querySelectorAll('.settings button')].find(b=>b.textContent.includes('내보내기')).onclick();
 assert.deepEqual(backup.catalog,{shops:['새 가게'],menus:[]});
 const file=a.d.querySelector('input[type=file]');
 async function restore(data){Object.defineProperty(file,'files',{configurable:true,value:[{text:async()=>JSON.stringify(data)}]});await file.onchange();}
 await restore({...backup,records:{'2026-10-10':'밥'},catalog:{shops:['복원 가게'],menus:['밥']}});
 assert.equal(JSON.parse(a.w.localStorage.getItem('calendar-catalog-v1')).shops[0],'복원 가게');
 await restore({...backup,records:{},catalog:{shops:'bad',menus:[]}});assert.equal(stored(a)['2026-10-10'],'밥');
 await restore({format:'calendar-notes-v1',records:{'2026-10-05':'[옛 가게]\n국'}});
 assert.equal(JSON.parse(a.w.localStorage.getItem('calendar-catalog-v1')).shops[0],'옛 가게');a.close();
});
