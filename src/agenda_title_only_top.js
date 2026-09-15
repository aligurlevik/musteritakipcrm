import worker from './agenda_popup_top.js';

const INJECT = String.raw`
<style id="agendaTitleOnlyStyle">
.done-note,.agenda-note,.month-day-note,.agenda-week-note,.note-text{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.note-card .note-main{padding-right:40px}
.mobile-note-view-button{position:absolute;right:8px;top:8px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;margin:0;border:0;border-radius:50%;background:#ffffffd9;color:#1e3a8a;padding:0;font-size:18px;line-height:1;box-shadow:0 1px 5px #0002}
.mobile-note-view-button:active{transform:scale(.94)}
</style>
<script id="agendaTitleOnlyScript">
(function(){
  if(window.__agendaTitleOnlyLoaded)return;
  window.__agendaTitleOnlyLoaded=true;

  function firstLine(value){
    var text=String(value==null?'':value).replace(/\r\n/g,'\n');
    return (text.split('\n')[0]||'').trim();
  }

  function applyDesktop(){
    document.querySelectorAll('.done-note,.agenda-note,.month-day-note,.agenda-week-note').forEach(function(el){
      if(el.closest('.agenda-inline-detail'))return;
      var current=String(el.textContent||'');
      var title=firstLine(current);
      if(title&&current!==title)el.textContent=title;
    });
  }

  function applyMobile(){
    document.querySelectorAll('.note-card').forEach(function(card){
      var text=card.querySelector('.note-text');
      if(text){
        var current=String(text.textContent||'');
        var title=firstLine(current);
        if(title&&current!==title)text.textContent=title;
      }
      if(card.querySelector('.mobile-note-view-button'))return;
      var onclick=card.getAttribute('onclick')||'';
      var match=onclick.match(/openEditNote\((\d+)\)/);
      if(!match)return;
      var id=Number(match[1]);
      var button=document.createElement('button');
      button.type='button';
      button.className='mobile-note-view-button';
      button.textContent='👁️';
      button.setAttribute('aria-label','Notun içini gör');
      button.title='Notun içini gör';
      button.addEventListener('click',function(event){
        event.stopPropagation();
        if(typeof window.openEditNote==='function')window.openEditNote(id);
      });
      card.appendChild(button);
    });
  }

  function apply(){applyDesktop();applyMobile()}

  var scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(function(){scheduled=false;apply()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  document.addEventListener('click',schedule,true);
  setInterval(apply,1000);
})();
</script>`;

function rebuilt(response,html){
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
    const copy=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(html.includes('agendaTitleOnlyScript'))return rebuilt(response,html);
      const next=html.includes('</body>')?html.replace('</body>',INJECT+'\n</body>'):html+INJECT;
      return rebuilt(response,next);
    }catch(error){
      console.error('Agenda title-only injection failed',error);
      return copy;
    }
  }
};
