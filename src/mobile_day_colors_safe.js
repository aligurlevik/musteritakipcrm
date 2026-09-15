import worker from './mobile_note_eye_safe.js';

const MOBILE_DAY_COLORS = String.raw`
<style id="mobileDayColorsSafeStyle">
#list .card.mobile-day-colored{border-left-width:6px!important;border-left-style:solid!important;transition:background-color .12s ease,border-color .12s ease}
</style>
<script id="mobileDayColorsSafeScript">
(function(){
  if(window.__mobileDayColorsSafe)return;
  window.__mobileDayColorsSafe=true;

  var palette=[
    {bg:'#e8f3ff',border:'#3b82f6'},
    {bg:'#eafaf1',border:'#22c55e'},
    {bg:'#fff4df',border:'#f59e0b'},
    {bg:'#f3eefe',border:'#8b5cf6'},
    {bg:'#ffecef',border:'#f43f5e'},
    {bg:'#e8fbfb',border:'#14b8a6'},
    {bg:'#f5f0e8',border:'#a16207'}
  ];
  var dateById=new Map();
  var fetching=false;
  var retryTimer=0;

  function localDatePart(value){
    var s=String(value||'').trim();
    if(!s)return '';
    var m=s.match(/^(\d{4}-\d{2}-\d{2})/);
    if(m)return m[1];
    var d=new Date(s);
    if(Number.isNaN(d.getTime()))return '';
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  function colorForDate(date){
    var m=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return palette[0];
    var day=Math.floor(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]))/86400000);
    var idx=((day%palette.length)+palette.length)%palette.length;
    return palette[idx];
  }

  function cardId(card){
    var body=card.querySelector('.body');
    var code=body?String(body.getAttribute('onclick')||''):'';
    var m=code.match(/openEditor\((\d+)/);
    if(m)return Number(m[1]);
    var cb=card.querySelector('input.check');
    code=cb?String(cb.getAttribute('onchange')||''):'';
    m=code.match(/setDone\((\d+)/);
    return m?Number(m[1]):0;
  }

  function paint(){
    var list=document.getElementById('list');
    if(!list)return;
    var unknown=false;
    list.querySelectorAll('.card').forEach(function(card){
      var id=cardId(card);
      if(!id)return;
      var date=dateById.get(id)||'';
      if(!date){unknown=true;return}
      var c=colorForDate(date);
      card.classList.add('mobile-day-colored');
      card.style.backgroundColor=c.bg;
      card.style.borderLeftColor=c.border;
    });
    if(unknown)scheduleRefresh();
  }

  async function refreshDates(){
    if(fetching)return;
    fetching=true;
    try{
      var r=await fetch('/api/notes-v3?scope=all',{headers:{'cache-control':'no-cache'}});
      if(!r.ok)return;
      var items=await r.json();
      if(!Array.isArray(items))return;
      items.forEach(function(x){
        var date=localDatePart(x.created_at||x.entry_date);
        if(date)dateById.set(Number(x.id),date);
      });
      paint();
    }catch(_){}finally{fetching=false}
  }

  function scheduleRefresh(){
    if(retryTimer)return;
    retryTimer=setTimeout(function(){retryTimer=0;refreshDates()},900);
  }

  function start(){
    var list=document.getElementById('list');
    if(!list)return;
    refreshDates();
    var queued=false;
    new MutationObserver(function(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(function(){queued=false;paint()});
    }).observe(list,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;

function rebuild(response,html){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('<title>Notlarım</title>')||!html.includes('id="list"')||html.includes('mobileDayColorsSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',MOBILE_DAY_COLORS+'\n</body>'):html+MOBILE_DAY_COLORS;
      return rebuild(response,next);
    }catch(error){
      console.error('Mobile day colors patch failed',error);
      return backup;
    }
  }
};
