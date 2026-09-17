import worker from './quick_request_completed_stable_safe.js';

const QUICK_REQUEST_SORT = String.raw`
<script id="quickRequestSortSafeScript">
(function(){
'use strict';
if(window.__quickRequestSortSafe)return;
window.__quickRequestSortSafe=true;

var busy=false,timer=null;
function pad(n){return String(n).padStart(2,'0')}
function today(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function isQuick(x){return /^⚡\s+/.test(String(x&&x.note||''))}
function keyOf(x){
  var date=String(x&&x.entry_date||'9999-12-31');
  var remind=String(x&&x.remind_at||'');
  return remind||date+'T23:59:59';
}
async function sortPending(){
  if(busy)return;
  var list=document.getElementById('quickRequestList');
  if(!list)return;
  var cards=[...list.querySelectorAll('.qr-card')];
  if(cards.length<2)return;
  busy=true;
  try{
    var r=await fetch('/api/agenda/active?from='+encodeURIComponent(today()),{headers:{'cache-control':'no-cache'}});
    if(!r.ok)return;
    var rows=await r.json(),map={};
    (Array.isArray(rows)?rows:[]).filter(function(x){return x.entry_status!=='Yapıldı'&&isQuick(x)}).forEach(function(x){map[Number(x.id)]=x});
    var items=cards.map(function(card,index){
      var b=card.querySelector('[data-qr-done]'),id=Number(b&&b.getAttribute('data-qr-done'))||0,x=map[id];
      return {card:card,id:id,index:index,key:x?keyOf(x):'9999-12-31T23:59:59'};
    });
    items.sort(function(a,b){var c=a.key.localeCompare(b.key);if(c)return c;if(a.id&&b.id&&a.id!==b.id)return a.id-b.id;return a.index-b.index});
    var current=cards.map(function(c){var b=c.querySelector('[data-qr-done]');return Number(b&&b.getAttribute('data-qr-done'))||0}).join(',');
    var wanted=items.map(function(x){return x.id}).join(',');
    if(current===wanted)return;
    var frag=document.createDocumentFragment();items.forEach(function(x){frag.appendChild(x.card)});list.appendChild(frag);
  }catch(_){}finally{busy=false}
}
function queue(){clearTimeout(timer);timer=setTimeout(sortPending,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(sortPending,500)},{once:true});else setTimeout(sortPending,500);
new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true});
setInterval(sortPending,30000);
})();
</script>`;

function rebuild(response,html){
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-cache, no-store, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx),backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestSortSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',QUICK_REQUEST_SORT+'\n</body>'):html+QUICK_REQUEST_SORT;
      return rebuild(response,next);
    }catch(error){console.error('Quick request sort patch failed',error);return backup}
  }
};
