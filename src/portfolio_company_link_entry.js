import worker from './portfolio_api_recovery_entry.js';

function noCache(response){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  headers.set('x-crm-portfolio-screen','clean-v2');
  return new Response(response.body,{
    status:response.status,
    statusText:response.statusText,
    headers
  });
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    // Müşteri Portföyü artık eski wrapper/tıklama katmanlarından tamamen bağımsız.
    // Bu sayfa doğrudan temiz statik dosyadan servis edilir.
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'){
      return noCache(await env.ASSETS.fetch(request));
    }

    return worker.fetch(request,env,ctx);
  },

  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function'){
      return worker.scheduled(controller,env,ctx);
    }
  }
};
