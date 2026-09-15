import worker from './projet_xlsx_import_patch.js';

function isMobileRequest(request){
  const hint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(hint==='?1')return true;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(request.headers.get('user-agent')||'');
}

function isHome(url,request){
  return request.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html');
}

function requestForPath(request,pathname){
  const url=new URL(request.url);
  url.pathname=pathname;
  url.search='';
  return new Request(url.toString(),{
    method:'GET',
    headers:request.headers,
    redirect:'manual'
  });
}

function noCache(response,recovered=false){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  if(recovered)headers.set('x-crm-recovered','1');
  return new Response(response.body,{
    status:response.status,
    statusText:response.statusText,
    headers
  });
}

const MOBILE_TITLE_ONLY_PATCH=String.raw`
<style id="mobileTitleOnlyV3Style">
#list .noteText{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important;max-height:none!important}
#list .body.mobile-has-eye{position:relative;padding-right:34px!important}
#list .mobile-note-eye{position:absolute;right:2px;top:1px;width:28px;height:28px;border:0;border-radius:50%;background:#eaf4ff;color:#1769c2;display:grid;place-items:center;padding:0;font-size:15px;line-height:1;z-index:4}
</style>
<script id="mobileTitleOnlyV3Script">
(function(){
  if(window.__mobileTitleOnlyV3)return;
  window.__mobileTitleOnlyV3=true;

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

  function apply(){
    document.querySelectorAll('#list .card').forEach(function(card){
      var text=card.querySelector('.noteText');
      var body=card.querySelector('.body');
      if(!text||!body)return;

      var full=text.dataset.mobileFullNote;
      if(!full){
        full=String(text.textContent||'');
        text.dataset.mobileFullNote=full;
      }
      var parts=splitNote(full);
      if(parts.title)text.textContent=parts.title;

      var hint=card.querySelector('.moreHint');
      if(hint)hint.remove();

      var old=body.querySelector('.mobile-note-eye');
      if(!parts.detail){
        if(old)old.remove();
        body.classList.remove('mobile-has-eye');
        return;
      }

      body.classList.add('mobile-has-eye');
      if(old)return;
      var id=itemId(card);
      if(!id)return;
      var eye=document.createElement('button');
      eye.type='button';
      eye.className='mobile-note-eye';
      eye.textContent='👁️';
      eye.title='Notun içini gör';
      eye.setAttribute('aria-label','Notun içini gör');
      eye.addEventListener('click',function(event){
        event.preventDefault();
        event.stopPropagation();
        if(typeof window.openEditor==='function')window.openEditor(id);
      });
      body.appendChild(eye);
    });
  }

  var scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(function(){scheduled=false;apply()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',schedule,true);
  setInterval(apply,700);
})();
</script>`;

async function patchMobileHome(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const html=await response.text();
  if(html.includes('mobileTitleOnlyV3Script')){
    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
    headers.set('cache-control','no-cache, no-store,must-revalidate');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
  const next=html.includes('</body>')?html.replace('</body>',MOBILE_TITLE_ONLY_PATCH+'\n</body>'):html+MOBILE_TITLE_ONLY_PATCH;
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-cache, no-store,must-revalidate');
  headers.set('pragma','no-cache');headers.set('expires','0');
  return new Response(next,{status:response.status,statusText:response.statusText,headers});
}

async function fallbackPage(request,env,url,mobileHome){
  let pathname=url.pathname;
  if(pathname==='/'||pathname==='/index.html')pathname=mobileHome?'/notlar-v2.html':'/index.html';
  const response=await env.ASSETS.fetch(requestForPath(request,pathname));
  return mobileHome?patchMobileHome(response):noCache(response,true);
}

function safeJsonError(){
  return new Response(JSON.stringify({error:'Geçici sunucu hatası. Lütfen sayfayı yenileyin.'}),{
    status:500,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-crm-recovered':'1'
    }
  });
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const mobileHome=isHome(url,request)&&(isMobileRequest(request)||url.searchParams.get('mobile')==='1');

    try{
      const effectiveRequest=mobileHome?requestForPath(request,'/notlar-v2.html'):request;
      const response=await worker.fetch(effectiveRequest,env,ctx);
      return mobileHome?await patchMobileHome(response):response;
    }catch(error){
      console.error('CRM production guard caught an exception',{
        path:url.pathname,
        method:request.method,
        mobileHome,
        name:error?.name||'Error',
        message:error?.message||String(error)
      });

      if(request.method==='GET'&&!url.pathname.startsWith('/api/')){
        try{return await fallbackPage(request,env,url,mobileHome)}
        catch(fallbackError){
          console.error('CRM fallback page also failed',fallbackError);
        }
      }
      return safeJsonError();
    }
  }
};
