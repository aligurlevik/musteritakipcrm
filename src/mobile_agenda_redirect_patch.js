import worker from './tracking_total_count_patch.js';

function isMobileRequest(request){
  const mobileHint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(mobileHint==='?1')return true;
  const ua=request.headers.get('user-agent')||'';
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua);
}

function assetRequest(request, pathname){
  const url=new URL(request.url);
  url.pathname=pathname;
  url.search='';
  return new Request(url.toString(),{
    method:'GET',
    headers:request.headers,
    redirect:'manual'
  });
}

async function serveMobileNotes(request,env){
  let response=await env.ASSETS.fetch(assetRequest(request,'/notlar-v2.html'));

  // Cloudflare HTML assets sometimes answer with a canonical-path redirect.
  // Follow it inside the Worker so the browser never enters a redirect loop.
  for(let i=0;i<4&&response.status>=300&&response.status<400;i++){
    const location=response.headers.get('location');
    if(!location)break;
    const next=new URL(location,new URL(request.url).origin);
    response=await env.ASSETS.fetch(assetRequest(request,next.pathname));
  }

  // Fallback to the extensionless asset path if needed.
  if(response.status!==200){
    response=await env.ASSETS.fetch(assetRequest(request,'/notlar-v2'));
    for(let i=0;i<4&&response.status>=300&&response.status<400;i++){
      const location=response.headers.get('location');
      if(!location)break;
      const next=new URL(location,new URL(request.url).origin);
      response=await env.ASSETS.fetch(assetRequest(request,next.pathname));
    }
  }

  if(response.status!==200)return response;

  let html=await response.text();
  const rowFontPatch=`<style id="mobileRowFontPatch">
.text{font-size:14px!important}
.meta{font-size:10px!important}
.badge{font-size:inherit!important}
@media(max-width:430px){.text{font-size:13.5px!important}.meta{font-size:10px!important}}
</style>`;
  if(!html.includes('id="mobileRowFontPatch"')){
    html=html.replace('</head>',rowFontPatch+'\n</head>');
  }

  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate');
  headers.delete('location');
  headers.delete('content-length');
  headers.delete('etag');
  return new Response(html,{status:200,headers});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isGet=request.method==='GET';
    const isHome=isGet&&(url.pathname==='/'||url.pathname==='/index.html');
    const isMobilePage=isGet&&(
      url.pathname==='/mobil-ajanda'||
      url.pathname==='/mobil-ajanda.html'||
      url.pathname==='/notlar-v2'||
      url.pathname==='/notlar-v2/'||
      url.pathname==='/notlar-v2.html'
    );
    const forceMobile=url.searchParams.get('mobile')==='1';

    if(isMobilePage){
      return serveMobileNotes(request,env);
    }

    if(isHome&&(forceMobile||isMobileRequest(request))){
      return serveMobileNotes(request,env);
    }

    return worker.fetch(request,env,ctx);
  }
};
