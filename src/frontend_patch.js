import worker from './index.js';

const oldReset = "$('g_no').value='';$('g_description').value='';";
const newReset = "$('g_customer').value='';$('g_no').value='';$('g_description').value='';";

const fieldPatches = [
  ['<input id="g_customer" placeholder="Firma">','<input id="g_customer" placeholder="Firma" autocomplete="off">'],
  ['<input id="g_no" placeholder="İş kodu">','<input id="g_no" placeholder="İş kodu" autocomplete="off">'],
  ['<input id="g_description" placeholder="Kısa not">','<input id="g_description" placeholder="Kısa not" autocomplete="off">']
];

const compactDatePatch = String.raw`
<style>
  #graphicJobs .graphic-day-head{display:none!important}
  #graphicJobs .graphic-calendar-panel{display:none!important}
  #graphicJobs .graphic-agenda-layout{grid-template-columns:minmax(0,1fr)!important}
  .graphic-compact-date{
    margin:12px 0 10px;background:#fff;border:1px solid #bfdbfe;border-radius:13px;
    overflow:hidden;box-shadow:0 2px 8px #0f172a0d
  }
  .graphic-compact-date-top{
    display:grid;grid-template-columns:auto minmax(220px,1fr) auto auto;gap:8px;
    align-items:center;padding:9px 10px;background:#eff6ff;border-bottom:1px solid #dbeafe
  }
  .graphic-compact-date-title{min-width:0;text-align:center}
  .graphic-compact-date-title b{display:block;color:#1e3a8a;font-size:16px}
  .graphic-compact-date-title span{display:block;color:#64748b;font-size:11px;margin-top:1px}
  .graphic-compact-date-top button{height:34px;padding:0 12px;border:0;border-radius:8px;font-weight:900;cursor:pointer}
  .graphic-compact-arrow{width:38px;padding:0!important;background:#fff;color:#1e3a8a;border:1px solid #bfdbfe!important;font-size:17px}
  .graphic-compact-today{background:#2563eb;color:#fff}
  .graphic-compact-picker{width:132px!important;height:34px;padding:5px 8px!important;font-weight:800;background:#fff}
  .graphic-compact-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));background:#fff}
  .graphic-compact-day{
    min-width:0;border:0;border-right:1px solid #e2e8f0;background:#fff;padding:8px 4px;
    cursor:pointer;text-align:center;color:#334155
  }
  .graphic-compact-day:last-child{border-right:0}
  .graphic-compact-day:hover{background:#f8fafc}
  .graphic-compact-day .dow{display:block;font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase}
  .graphic-compact-day .num{display:block;font-size:17px;font-weight:900;line-height:1.1;margin-top:2px}
  .graphic-compact-day .mini{display:block;font-size:9px;color:#94a3b8;margin-top:2px;white-space:nowrap}
  .graphic-compact-day.selected{background:#dbeafe;box-shadow:inset 0 0 0 2px #2563eb;color:#1e3a8a}
  .graphic-compact-day.today .mini{color:#047857;font-weight:900}
  @media(max-width:760px){
    .graphic-compact-date-top{grid-template-columns:auto 1fr auto;gap:5px}
    .graphic-compact-picker{grid-column:1/-1;width:100%!important}
    .graphic-compact-date-title b{font-size:14px}
    .graphic-compact-day{padding:7px 2px}.graphic-compact-day .num{font-size:15px}.graphic-compact-day .mini{display:none}
  }
</style>
<script>
(function(){
  const trDays=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  const trMonths=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const pad=n=>String(n).padStart(2,'0');
  const keyOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const dateOf=key=>{const p=String(key||'').split('-').map(Number);return p.length===3&&p[0]?new Date(p[0],p[1]-1,p[2],12):new Date()};
  const todayKey=()=>keyOf(new Date());
  function selectedInput(){return document.getElementById('g_date')}
  function setGraphicCompactDay(key){
    const input=selectedInput();if(!input)return;
    input.value=key;
    if(typeof loadGraphicJobs==='function')loadGraphicJobs();
    setTimeout(syncGraphicCompactDate,0);
  }
  function shiftGraphicCompactDay(delta){const input=selectedInput();if(!input)return;const d=dateOf(input.value||todayKey());d.setDate(d.getDate()+delta);setGraphicCompactDay(keyOf(d))}
  function syncGraphicCompactDate(){
    const input=selectedInput(),root=document.getElementById('graphicCompactDate');if(!input||!root)return;
    const key=input.value||todayKey(),d=dateOf(key),today=todayKey();
    const title=root.querySelector('.graphic-compact-date-title b');
    const sub=root.querySelector('.graphic-compact-date-title span');
    const picker=root.querySelector('.graphic-compact-picker');
    if(title)title.textContent=d.getDate()+' '+trMonths[d.getMonth()]+' '+d.getFullYear()+' '+trDays[d.getDay()];
    if(sub)sub.textContent='Çalıştığın gün';
    if(picker&&picker.value!==key)picker.value=key;
    const monday=new Date(d);const day=d.getDay();monday.setDate(d.getDate()-(day===0?6:day-1));
    const week=root.querySelector('.graphic-compact-week');if(!week)return;
    let html='';
    for(let i=0;i<7;i++){
      const x=new Date(monday);x.setDate(monday.getDate()+i);const xKey=keyOf(x);
      const classes=['graphic-compact-day'];if(xKey===key)classes.push('selected');if(xKey===today)classes.push('today');
      html+='<button type="button" class="'+classes.join(' ')+'" data-date="'+xKey+'"><span class="dow">'+trDays[x.getDay()]+'</span><span class="num">'+x.getDate()+'</span><span class="mini">'+(xKey===today?'Bugün':trMonths[x.getMonth()])+'</span></button>';
    }
    week.innerHTML=html;
    week.querySelectorAll('[data-date]').forEach(btn=>btn.onclick=()=>setGraphicCompactDay(btn.dataset.date));
  }
  function mountGraphicCompactDate(){
    if(document.getElementById('graphicCompactDate'))return;
    const section=document.getElementById('graphicJobs'),layout=section&&section.querySelector('.graphic-agenda-layout');
    if(!section||!layout||!selectedInput())return;
    const box=document.createElement('div');box.id='graphicCompactDate';box.className='graphic-compact-date';
    box.innerHTML='<div class="graphic-compact-date-top"><button type="button" class="graphic-compact-arrow" data-prev>←</button><div class="graphic-compact-date-title"><b></b><span></span></div><button type="button" class="graphic-compact-arrow" data-next>→</button><button type="button" class="graphic-compact-today" data-today>Bugün</button><input class="graphic-compact-picker" type="date" aria-label="Çalışma günü seç"></div><div class="graphic-compact-week"></div>';
    layout.parentNode.insertBefore(box,layout);
    box.querySelector('[data-prev]').onclick=()=>shiftGraphicCompactDay(-1);
    box.querySelector('[data-next]').onclick=()=>shiftGraphicCompactDay(1);
    box.querySelector('[data-today]').onclick=()=>setGraphicCompactDay(todayKey());
    box.querySelector('.graphic-compact-picker').onchange=e=>setGraphicCompactDay(e.target.value);
    const dayTitle=document.getElementById('graphicWorkingDay');
    if(dayTitle)new MutationObserver(syncGraphicCompactDate).observe(dayTitle,{childList:true,subtree:true,characterData:true});
    selectedInput().addEventListener('change',()=>setTimeout(syncGraphicCompactDate,0));
    syncGraphicCompactDate();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountGraphicCompactDate);else mountGraphicCompactDate();
})();
</script>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';

    if (
      request.method === 'GET' &&
      response.status === 200 &&
      (url.pathname === '/' || url.pathname === '/index.html') &&
      contentType.includes('text/html')
    ) {
      let html = await response.text();
      html = html.split(oldReset).join(newReset);
      for (const [from, to] of fieldPatches) html = html.split(from).join(to);
      if (!html.includes('id="graphicCompactDate"')) html = html.replace('</body>', compactDatePatch + '\n</body>');

      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  }
};
