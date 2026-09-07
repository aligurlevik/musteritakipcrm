import worker from './mobile_notes_latest_api.js';

function isMobileRequest(request){
  const hint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(hint==='?1')return true;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(request.headers.get('user-agent')||'');
}

function assetRequest(request,pathname){
  const url=new URL(request.url);
  url.pathname=pathname;
  url.search='';
  return new Request(url.toString(),{method:'GET',headers:request.headers,redirect:'manual'});
}

async function mobileAgenda(request,env){
  let response=await env.ASSETS.fetch(assetRequest(request,'/notlar-v2.html'));
  if(response.status>=300&&response.status<400){
    const location=response.headers.get('location');
    if(location){
      const next=new URL(location,new URL(request.url).origin);
      response=await env.ASSETS.fetch(assetRequest(request,next.pathname));
    }
  }
  if(!response.ok)return response;

  let html=await response.text();
  const mobileFixes=`<style id="mobileMenuOpacityFix">
.card.done{opacity:1!important}
.card.done .body{opacity:.68}
.card.done .menu,.card.done .menuBox,.card.done .menuBox *{opacity:1!important}
.menu[open]{z-index:150!important}
.menu[open] .menuBox{z-index:200!important;background:#fff!important;opacity:1!important}
.mobileTopActions{display:flex;align-items:center;gap:5px;flex:0 0 auto}
.refreshbtn{border:0;border-radius:10px;padding:9px 9px;background:#fff;color:#123f68;font-size:13px;font-weight:950;white-space:nowrap;box-shadow:0 1px 4px #0002}
@media(max-width:430px){.toprow{gap:5px}.title{font-size:21px}.mobileTopActions .newbtn{padding:9px 9px;font-size:13px}.refreshbtn{padding:9px 7px;font-size:12px}}
</style>`;
  if(!html.includes('id="mobileMenuOpacityFix"'))html=html.replace('</head>',mobileFixes+'\n</head>');

  if(!html.includes('class="refreshbtn"')){
    html=html.replace(
      '<div class="title">📝 Notlarım</div><button class="newbtn" onclick="location.href=\'/yeni-not.html\'">＋ Yeni Not</button>',
      '<div class="title">📝 Notlarım</div><div class="mobileTopActions"><button class="refreshbtn" onclick="location.reload()">⟳ Yenile</button><button class="newbtn" onclick="location.href=\'/yeni-not.html\'">＋ Yeni Not</button></div>'
    );
  }

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isGet=request.method==='GET';
    const isHome=isGet&&(url.pathname==='/'||url.pathname==='/index.html');
    const explicitMobile=isGet&&['/mobil-ajanda','/mobil-ajanda.html','/notlar-v2','/notlar-v2/','/notlar-v2.html'].includes(url.pathname);
    const forceMobile=url.searchParams.get('mobile')==='1';

    if(explicitMobile || (isHome&&(forceMobile||isMobileRequest(request)))){
      return mobileAgenda(request,env);
    }

    return worker.fetch(request,env,ctx);
  }
};
