import worker from './agenda_day_colors_safe.js';

const MOBILE_NOTE_EYE = String.raw`
<style id="mobileNoteEyeSafeStyle">
#list .noteText{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important;max-height:none!important}
#list .body.mobile-note-has-detail{position:relative;padding-right:34px!important}
#list .mobile-note-eye-safe{position:absolute;right:2px;top:1px;width:28px;height:28px;border:0;border-radius:50%;background:#eaf4ff;color:#1769c2;display:grid;place-items:center;padding:0;font-size:15px;line-height:1;z-index:6;cursor:pointer}
#list .mobile-note-eye-safe:active{transform:scale(.94)}
#list .card.mobile-day-color{transition:background-color .15s ease,border-color .15s ease}
</style>
<script id="mobileNoteEyeSafeScript">
(function(){
  if(window.__mobileNoteEyeSafe)return;
  window.__mobileNoteEyeSafe=true;

  var dateById=new Map();
  var lastLoad=0;
  var loading=null;
  var palette=[
    {bg:'#e8f3ff',border:'#3b82f6'},
    {bg:'#eafaf1',border:'#22c55e'},
    {bg:'#fff4df',border:'#f59e0b'},
    {bg:'#f3eefe',border:'#8b5cf6'},
    {bg:'#ffecef',border:'#f43f5e'},
    {bg:'#e8fbfb',border:'#14b8a6'},
    {bg:'#f5f0e8',border:'#a16207'}
  ];

  function splitNote(value){
    var raw=String(value==null?'':value).replace(/\r\n/g,'\n').trim();
    if(!raw)return {title:'',detail:''};
    var lines=raw.split('\n');
    var title=(lines.shift()||'').trim();
    var detail=lines.join('\n').trim();
    return {title:title||detail,detail:title?detail:''};
  }

  function itemId(card){
    var body=card.querySelector('.body');
    var code=body?String(body.getAttribute('onclick')||''):'';
    var m=code.match(/openEditor\((\d+)/);
    if(m)return Number(m[1]);
    var cb=card.querySelector('input.check');
    code=cb?String(cb.getAttribute('onchange')||''):'';
    m=code.match(/setDone\((\d+)/);
    return m?Number(m[1]):0;
  }

  function dateKey(value){
    var s=String(value||'').trim();
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m?m[1]+'-'+m[2]+'-'+m[3]:'';
  }

  function colorForDate(value){
    var key=dateKey(value),m=key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    var day=Math.floor(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]))/86400000);
    var idx=((day%palette.length)+palette.length)%palette.length;
    return palette[idx];
  }

  async function loadDates(force){
    if(loading)return loading;
    if(!force&&Date.now()-lastLoad<5000)return;
    loading=(async function(){
      try{
        var r=await fetch('/api/notes-v3?scope=all',{headers:{accept:'application/json'}});
        if(!r.ok)return;
        var items=await r.json();
        if(!Array.isArray(items))return;
        dateById.clear();
        items.forEach(function(x){
          var id=Number(x&&x.id);
          var d=dateKey((x&&x.created_at)||(x&&x.entry_date));
          if(id&&d)dateById.set(id,d);
        });
        lastLoad=Date.now();
      }catch(_){}
      finally{loading=null}
    })();
    return loading;
  }

  function paintCard(card,id){
    if(!id)return;
    var date=card.dataset.noteDay||dateById.get(Number(id));
    var c=window.crmNoteDays?window.crmNoteDays.colorForDate(date):colorForDate(date);
    if(!c)return;
    card.classList.add('mobile-day-color');
    card.style.setProperty('background-color',c.bg,'important');
    card.style.setProperty('border-color',c.border,'important');
  }

  function applyCard(card){
    var text=card.querySelector('.noteText');
    var body=card.querySelector('.body');
    if(!text||!body)return;

    var id=itemId(card);
    paintCard(card,id);

    var full=text.dataset.mobileFullNote;
    if(!full){
      full=String(text.textContent||'');
      text.dataset.mobileFullNote=full;
    }

    var parts=splitNote(full);
    if(parts.title&&text.textContent!==parts.title)text.textContent=parts.title;

    var hint=card.querySelector('.moreHint');
    if(hint)hint.remove();

    var eye=body.querySelector('.mobile-note-eye-safe');
    if(!parts.detail){
      if(eye)eye.remove();
      body.classList.remove('mobile-note-has-detail');
      return;
    }

    body.classList.add('mobile-note-has-detail');
    if(eye)return;
    if(!id)return;

    eye=document.createElement('button');
    eye.type='button';
    eye.className='mobile-note-eye-safe';
    eye.textContent='👁️';
    eye.title='Notun içini gör';
    eye.setAttribute('aria-label','Notun içini gör');
    eye.addEventListener('click',function(event){
      event.preventDefault();
      event.stopPropagation();
      if(typeof window.openEditor==='function')window.openEditor(id);
    });
    body.appendChild(eye);
  }

  function apply(){
    var list=document.getElementById('list');
    if(!list)return;
    var unknown=false;
    list.querySelectorAll('.card').forEach(function(card){
      var id=itemId(card);
      if(id&&!dateById.has(id))unknown=true;
      applyCard(card);
    });
    if(unknown)loadDates(false).then(apply);
  }

  async function start(){
    var list=document.getElementById('list');
    if(!list)return;
    await loadDates(true);
    apply();
    var queued=false;
    new MutationObserver(function(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(function(){queued=false;apply()});
    }).observe(list,{childList:true,subtree:true});
    document.addEventListener('visibilitychange',function(){
      if(!document.hidden)loadDates(true).then(apply);
    });
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
      if(!html.includes('<title>Notlarım</title>')||!html.includes('id="list"')||html.includes('mobileNoteEyeSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',MOBILE_NOTE_EYE+'\n</body>'):html+MOBILE_NOTE_EYE;
      return rebuild(response,next);
    }catch(error){
      console.error('Mobile note eye patch failed',error);
      return backup;
    }
  }
};
