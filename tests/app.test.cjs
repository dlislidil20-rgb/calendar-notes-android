const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function app(records={}) {
 const dom=new JSDOM(fs.readFileSync('www/index.html','utf8'),{url:'https://localhost',runScripts:'outside-only'});
 const w=dom.window;
 w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.confirm=()=>true;w.alert=()=>{};
 w.localStorage.setItem('calendar-notes-v1',JSON.stringify(records));
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
 a.d.querySelector('[data-tab="week"]').click();assert.equal(a.d.querySelectorAll('.entry').length,7);assert.equal(a.d.querySelector('pre').textContent,long);
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
