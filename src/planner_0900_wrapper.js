import worker from './planlama_live_fix_wrapper.js';

function isPlannerPath(path){
  return ['/planlama','/planlama/','/planlama.html'].includes(path);
}

function removeAllDayRow(html){
  const startMarker="html+='<div class=\"allrow\"><div class=\"alllabel\">Gün boyu</div>';";
  const endMarker="html+='</div><div class=\"grid\">';";
  const start=html.indexOf(startMarker);
  if(start<0)return html;
  const end=html.indexOf(endMarker,start);
  if(end<0)return html;
  return html.slice(0,start)+"html+='<div class=\"grid\">';"+html.slice(end+endMarker.length);
}

function placeUntimedAtNine(html){
  const oldText="const arr=state.items.filter(x=>eventDateKey(x,d.getFullYear())===key&&String(x.remind_at||'').includes('T')&&Number(String(x.remind_at).slice(11,13))===h);";
  const newText="const arr=state.items.filter(x=>eventDateKey(x,d.getFullYear())===key&&((String(x.remind_at||'').includes('T')&&Number(String(x.remind_at).slice(11,13))===h)||(!String(x.remind_at||'').includes('T')&&h===9)));";
  return html.replace(oldText,newText);
}

function injectDayClick(html){
  if(html.includes('id="plannerNineClickScript"'))return html;
  const script=`<script id="plannerNineClickScript">
  document.addEventListener('click',function(e){
    if(e.target.closest('.event,.modal,#topQuickMenu,.nav,.legend,.actions'))return;
    const day=e.target.closest('.day');
    if(!day||typeof window.openNew!=='function')return;
    const days=[...document.querySelectorAll('.day')];
    const i=days.indexOf(day);if(i<0)return;
    const row=[...document.querySelectorAll('.hourrow')].find(r=>((r.querySelector('.hourlabel')||{}).textContent||'').trim()==='09:00');
    const cell=row&&row.querySelectorAll('.slot')[i];
    if(!cell||!cell.dataset.date)return;
    window.openNew();
    setTimeout(function(){
      const type=document.getElementById('type'),date=document.getElementById('date'),time=document.getElementById('time'),title=document.getElementById('modalTitle');
      if(type)type.value='Genel Not';
      if(date)date.value=cell.dataset.date;
      if(time)time.value='09:00';
      if(title)title.textContent='Yeni Not / Hatırlatma';
    },0);
  });
  </script>`;
  return html.replace('</body>',script+'</body>');
}

async function patchPlanner(response){
  if(!response||!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  html=removeAllDayRow(html);
  html=placeUntimedAtNine(html);
  html=injectDayClick(html);
  html=html.replaceAll('/planlama.html?v=20260904-5','/planlama.html?v=20260904-6');
  const h=new Headers(response.headers);
  h.set('content-type','text/html; charset=utf-8');
  h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

async function patchLinks(response){
  if(!response||!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  html=html.replaceAll('/planlama.html?v=20260904-5','/planlama.html?v=20260904-6');
  html=html.replaceAll('href="/planlama.html"','href="/planlama.html?v=20260904-6"');
  const h=new Headers(response.headers);
  h.set('content-type','text/html; charset=utf-8');
  h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&isPlannerPath(url.pathname))return patchPlanner(response);
    if(request.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html'||url.pathname.startsWith('/notlar-v2')))return patchLinks(response);
    return response;
  }
};
