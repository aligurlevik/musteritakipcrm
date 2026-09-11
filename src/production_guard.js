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

async function fallbackPage(request,env,url,mobileHome){
  let pathname=url.pathname;
  if(pathname==='/'||pathname==='/index.html')pathname=mobileHome?'/notlar-v2.html':'/index.html';
  const response=await env.ASSETS.fetch(requestForPath(request,pathname));
  return noCache(response,true);
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
      // Mobil ana sayfayı içten /notlar-v2.html olarak çalıştır. Böylece masaüstü
      // CRM yamaları mobil Notlar yanıtını okuyup değiştiremez.
      const effectiveRequest=mobileHome?requestForPath(request,'/notlar-v2.html'):request;
      return await worker.fetch(effectiveRequest,env,ctx);
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
