(()=>{'use strict';
const native=window.Capacitor?.Plugins?.Journal||null;
const KEY='calendar-notes-v1',SETTINGS='calendar-settings-v2';let records={},settings={theme:'system',align:'center',font:15};try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');if(x&&typeof x==='object'&&!Array.isArray(x))records=x}catch{}try{const s=JSON.parse(localStorage.getItem(SETTINGS)||'{}');if(s&&typeof s==='object')settings={...settings,...s}}catch{}
let tab='week',cursor=new Date(),editKey=null;const $=s=>document.querySelector(s),pad=n=>String(n).padStart(2,'0'),key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,date=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)},add=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n),weekStart=d=>add(d,-d.getDay()),days=['일','월','화','수','목','금','토'];
const lineCount=s=>foodCount(s);
function foodCount(s){return s.split(/\r?\n/).map(v=>v.trim()).filter(v=>v&&!/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)&&!/^\[.*\]$/.test(v)).length}
function formatTimeBlocks(s){const lines=s.replace(/\r\n/g,'\n').split('\n'),out=[];for(const line of lines){if(/^([01]?\d|2[0-3]):[0-5]\d$/.test(line.trim())&&out.some(x=>x.trim())&&out.length&&out[out.length-1].trim()!=='')out.push('');out.push(line)}return out.join('\n')}
function grade(n){return n<=2?'Excellent':n<=4?'Good':n<=6?'Hmm...':'Bad'}
function theme(){return settings.theme==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):settings.theme}
function color(n){if(!n)return '#f0f1f3';const t=Math.min(n,8)/8;return `hsl(${44-40*t} 77% ${96-13*t}%)`}
function applySettings(){document.body.dataset.theme=theme();document.documentElement.style.setProperty('--note-size',settings.font+'px');document.documentElement.style.setProperty('--note-align',settings.align)}
function saveStore(){localStorage.setItem(KEY,JSON.stringify(records))}function saveSettings(){localStorage.setItem(SETTINGS,JSON.stringify(settings));applySettings();render()}
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function entry(d){
 const k=key(d),note=formatTimeBlocks(records[k]||''),count=foodCount(note),el=node('article','entry');
 const holiday=window.KOREAN_HOLIDAYS?.[k]||'',today=k===key(new Date());
 el.dataset.date=k;el.style.background=color(count);el.style.color='#242424';
 el.classList.toggle('today',today);el.setAttribute('role','button');el.tabIndex=0;
 if(today)el.setAttribute('aria-current','date');
 const heading=node('h3'),label=node('span','date-label',`${d.getMonth()+1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`);
 if(d.getDay()===0||d.getDay()===6||holiday)label.classList.add('rest-day');
 if(today)label.append(node('span','today-badge','오늘'));
 heading.append(label);if(note.trim())heading.append(node('span','grade',grade(count)));el.append(heading);
 if(holiday)el.append(node('div','holiday-name',holiday));
 if(note.trim())el.append(node('pre','',note));
 el.addEventListener('click',()=>openEdit(k));
 el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openEdit(k)}});
 return el;
}
// Grow the timeline one month at a time. Keep the same date and pixel offset
// when prepending dates or returning from the editor; never truncate note text.
const monthAt=(d,delta=0)=>new Date(d.getFullYear(),d.getMonth()+delta,1);
let rangeStart=monthAt(cursor,-1),rangeEnd=monthAt(cursor,2),weekAnchor=null,extending=false;
function visibleAnchor(){
 const c=$('#content');if(c.dataset.view!=='week')return null;
 const top=c.getBoundingClientRect().top;
 const row=[...c.querySelectorAll('.entry')].find(e=>e.getBoundingClientRect().bottom>top);
 return row?{date:row.dataset.date,offset:row.getBoundingClientRect().top-top}:null;
}
function restoreAnchor(anchor){
 const c=$('#content'),row=c.querySelector(`[data-date="${anchor.date}"]`);
 if(row)c.scrollTop+=row.getBoundingClientRect().top-c.getBoundingClientRect().top-anchor.offset;
}
function dateRange(start,end){
 const fragment=document.createDocumentFragment();
 for(let d=new Date(start);d<end;d=add(d,1)){
  if(d.getDate()===1)fragment.append(node('div','month-divider',`${d.getFullYear()}년 ${d.getMonth()+1}월`));
  fragment.append(entry(d));
 }
 return fragment;
}
function updatePeriod(){
 if(tab!=='week')return;
 const anchor=visibleAnchor();if(anchor){weekAnchor=anchor;const d=date(anchor.date);$('#period').textContent=`${d.getFullYear()}년 ${d.getMonth()+1}월`}
}
function extendTimeline(){
 const c=$('#content');if(tab!=='week'||extending||!c.clientHeight||!$('#editor').classList.contains('hidden'))return;
 extending=true;
 if(c.scrollTop<250){
  const previous=monthAt(rangeStart,-1),height=c.scrollHeight,top=c.scrollTop;
  c.prepend(dateRange(previous,rangeStart));rangeStart=previous;
  c.scrollTop=top+c.scrollHeight-height;
 }else if(c.scrollTop+c.clientHeight>c.scrollHeight-350){
  const next=monthAt(rangeEnd,1);c.append(dateRange(rangeEnd,next));rangeEnd=next;
 }
 updatePeriod();requestAnimationFrame(()=>{extending=false});
}
$('#content').addEventListener('scroll',()=>{updatePeriod();extendTimeline()},{passive:true});

function persistDraft(){if(!editKey)return;const v=formatTimeBlocks($('#note').value);if(v.trim())records[editKey]=v;else delete records[editKey];saveStore()}
function openEdit(k){cursor=date(k);editKey=k;$('#edit-date').textContent=`${k} ${days[date(k).getDay()]}요일`;$('#note').value=formatTimeBlocks(records[k]||'');$('#editor').classList.remove('hidden')}
function changeEdit(delta){if(!editKey)return;persistDraft();const d=add(date(editKey),delta);cursor=d;openEdit(key(d));render()}
function closeEdit(){$('#editor').classList.add('hidden');editKey=null}
function appendPickedTime(time){const t=$('#note');const v=t.value;const prefix=v.trim()? (v.endsWith('\n\n')?'':v.endsWith('\n')?'\n':'\n\n'):'';t.value=v+prefix+time+'\n';t.focus();t.setSelectionRange(t.value.length,t.value.length);persistDraft()}
function insertText(s){const t=$('#note'),start=t.selectionStart,end=t.selectionEnd;const prefix=start>0&&t.value[start-1]!=='\n'?'\n':'';t.setRangeText(prefix+s,start,end,'end');t.focus();persistDraft()}
function sortBlocks(){const t=$('#note');const blocks=t.value.trim().split(/\n\s*\n/).filter(Boolean);const parse=b=>{const m=b.match(/(?:^|\n)([01]?\d|2[0-3]):([0-5]\d)(?=\n|$)/);return m?Number(m[1])*60+Number(m[2]):99999};if(blocks.length<2){alert('시간별 기록 사이에 빈 줄을 넣으면 시간순으로 정렬할 수 있습니다.');return}t.value=blocks.map((v,i)=>({v,i,t:parse(v)})).sort((a,b)=>a.t-b.t||a.i-b.i).map(x=>x.v).join('\n\n');persistDraft()}
function render(){const previousAnchor=visibleAnchor();if(previousAnchor)weekAnchor=previousAnchor;applySettings();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('#toolbar').style.display=tab==='settings'?'none':'flex';const c=$('#content');c.replaceChildren();c.dataset.view=tab;$('#prev').hidden=tab==='week';$('#next').hidden=tab==='week';let title='';
if(tab==='week'){
 title=`${cursor.getFullYear()}년 ${cursor.getMonth()+1}월`;
 if(cursor<rangeStart||cursor>=rangeEnd){rangeStart=monthAt(cursor,-1);rangeEnd=monthAt(cursor,2);weekAnchor=null}
 c.append(dateRange(rangeStart,rangeEnd));restoreAnchor(weekAnchor||{date:key(cursor),offset:8});
}

if(tab==='day'){title=`${cursor.getFullYear()}년 ${cursor.getMonth()+1}월 ${cursor.getDate()}일`;c.append(entry(cursor))}
if(tab==='month'){title=`${cursor.getFullYear()}년 ${cursor.getMonth()+1}월`;const grid=node('div','month-grid');days.forEach(v=>grid.append(node('div','month-label',v)));const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),start=add(first,-first.getDay()),last=new Date(cursor.getFullYear(),cursor.getMonth()+1,0),cells=Math.ceil((first.getDay()+last.getDate())/7)*7;for(let i=0;i<cells;i++){const d=add(start,i),k=key(d),note=records[k]||'',cell=node('div','month-cell'+(d.getMonth()!==cursor.getMonth()?' other':''));cell.style.background=color(foodCount(note));cell.style.color=theme()==='dark'?'#f4f4f5':'#242424';cell.append(node('b','',String(d.getDate())));if(note)cell.append(node('div','snippet',note));cell.onclick=()=>openEdit(k);grid.append(cell)}c.append(grid)}
if(tab==='settings'){const box=node('div','settings');box.append(node('h2','','화면 설정'));const choices=[['theme','테마',[['system','기기 설정 따르기'],['light','라이트 모드'],['dark','다크 모드']]],['align','기록 정렬',[['center','가운데 정렬'],['left','왼쪽 정렬']]]];for(const [id,label,opts] of choices){const row=node('div','setting'),lab=node('label','',label),sel=node('select');sel.id=id;for(const [v,t] of opts){const o=node('option','',t);o.value=v;sel.append(o)}sel.value=settings[id];sel.onchange=()=>{settings[id]=sel.value;saveSettings()};row.append(lab,sel);box.append(row)}const sizeRow=node('div','setting'),sizeLab=node('label','','기록 글자 크기: '+settings.font+'px'),size=node('input');size.type='range';size.min='10';size.max='26';size.step='1';size.value=settings.font;size.oninput=()=>{settings.font=Number(size.value);sizeLab.textContent='기록 글자 크기: '+settings.font+'px';localStorage.setItem(SETTINGS,JSON.stringify(settings));applySettings()};sizeRow.append(sizeLab,size);box.append(sizeRow);box.append(node('p','','서체: 강원교육모두체 · 강원특별자치도교육청'));box.append(node('p','','한국 공휴일: 2000~2050년 · 이후 지정되는 임시공휴일은 앱 업데이트 시 반영됩니다.'));box.append(node('h2','','백업 및 복원'));box.append(node('p','','기록은 이 기기의 앱 내부에 저장됩니다. 앱 삭제 전 백업하세요.'));const exp=node('button','','JSON 백업 내보내기');exp.onclick=async()=>{if(native){try{const result=await native.exportJson({filename:'달력기록-백업-'+key(new Date())+'.json',data:JSON.stringify({format:'calendar-notes-v1',records},null,2)});if(!result.cancelled)alert('백업 저장 완료')}catch(e){alert('백업 실패: '+e.message)}return}const blob=new Blob([JSON.stringify({format:'calendar-notes-v1',records},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='달력기록-백업-'+key(new Date())+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)};box.append(exp);const imp=node('button','','JSON 백업 가져오기'),file=node('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.onchange=async()=>{try{if(!file.files?.[0])return;const data=JSON.parse(await file.files[0].text());if(data.format!=='calendar-notes-v1'||!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw Error('백업 형식이 올바르지 않습니다');if(!confirm('기존 기록을 백업 파일 내용으로 교체할까요?'))return;const clean={};for(const [k,v] of Object.entries(data.records)){if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&typeof v==='string')clean[k]=v}records=clean;saveStore();alert('복원 완료')}catch(e){alert('복원 실패: '+e.message)}file.value=''};imp.onclick=()=>file.click();box.append(imp,file);box.append(node('p','','음식 항목 0개는 회색, 1~8개는 파스텔 노랑·주황·빨강으로 변하며 8개 이상은 같은 빨강입니다. 시간·[가게]·빈 줄은 배경색과 등급 계산에서 모두 제외됩니다.'));c.append(box)}$('#period').textContent=title;if(tab==='week')updatePeriod();else c.scrollTop=0}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(b.dataset.tab==='day'){tab='day';render();openEdit(key(cursor));return}tab=b.dataset.tab;render()});$('#prev').onclick=()=>{cursor=tab==='month'?new Date(cursor.getFullYear(),cursor.getMonth()-1,1):add(cursor,tab==='week'?-7:-1);render()};$('#next').onclick=()=>{cursor=tab==='month'?new Date(cursor.getFullYear(),cursor.getMonth()+1,1):add(cursor,tab==='week'?7:1);render()};$('#today').onclick=()=>{cursor=new Date();if(tab==='week'){rangeStart=monthAt(cursor,-1);rangeEnd=monthAt(cursor,2);weekAnchor=null;$('#content').dataset.view='';}render()};$('#close').onclick=()=>{persistDraft();closeEdit();render()};$('#save').onclick=()=>{persistDraft();closeEdit();render()};$('#delete').onclick=()=>{if(editKey&&confirm('이 날짜의 기록을 삭제할까요?')){delete records[editKey];saveStore();closeEdit();render()}};$('#edit-prev').onclick=()=>changeEdit(-1);$('#edit-next').onclick=()=>changeEdit(1);$('#insert-time').onclick=async()=>{if(native){try{const result=await native.pickTime();if(result.time){appendPickedTime(result.time);persistDraft()}}catch(e){alert('시간 선택 실패: '+e.message)}return}const t=$('#time-picker');const d=new Date();t.value=`${pad(d.getHours())}:${pad(d.getMinutes())}`;if(t.showPicker){try{t.showPicker()}catch(e){t.click()}}else t.click()};$('#time-picker').onchange=e=>{if(e.target.value)appendPickedTime(e.target.value)};$('#insert-shop').onclick=()=>{insertText('[]\n');const t=$('#note'),pos=t.selectionStart-2;t.setSelectionRange(pos,pos)};$('#sort-time').onclick=sortBlocks;$('#editor').addEventListener('click',e=>{if(e.target.id==='editor'){persistDraft();closeEdit();render()}});
$('#note').addEventListener('input',persistDraft);document.addEventListener('visibilitychange',()=>{if(document.hidden)persistDraft();else refreshToday()});
let displayedToday=key(new Date());function refreshToday(){const now=key(new Date());if(now!==displayedToday){displayedToday=now;render()}}setInterval(refreshToday,60000);
let touch=null;const panel=$('.editor-panel');panel.addEventListener('touchstart',e=>{if(e.touches.length===1)touch={x:e.touches[0].clientX,y:e.touches[0].clientY,origin:e.target}}, {passive:true});panel.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;const onTextarea=touch.origin.closest&&touch.origin.closest('textarea');if(!onTextarea&&Math.abs(dx)>75&&Math.abs(dx)>Math.abs(dy)*1.5)changeEdit(dx<0?1:-1);touch=null},{passive:true});window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(settings.theme==='system')render()});render();
const initialAnchor=weekAnchor||{date:key(cursor),offset:8};document.fonts?.ready.then(()=>{if(tab==='week'&&$('#editor').classList.contains('hidden')){restoreAnchor(initialAnchor);updatePeriod()}});
})();