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
  const menuFix=`<style id="mobileMenuOpacityFix">
.card.done{opacity:1!important}
.card.done .body{opacity:.68}
.card.done .menu,.card.done .menuBox,.card.done .menuBox *{opacity:1!important}
.menu[open]{z-index:150!important}
.menu[open] .menuBox{z-index:200!important;background:#fff!important;opacity:1!important}
</style>`;
  if(!html.includes('id="mobileMenuOpacityFix"'))html=html.replace('</head>',menuFix+'\n</head>');

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
