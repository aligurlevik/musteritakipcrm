import worker from './customer_mail_ui_v2_entry.js';

const NEW_CUSTOMER_VERSION='20261001-1108';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    if(request.method==='GET'&&url.pathname==='/yeni-musteri.html'&&url.searchParams.get('v')!==NEW_CUSTOMER_VERSION){
      url.search='';
      url.searchParams.set('v',NEW_CUSTOMER_VERSION);
      return Response.redirect(url.toString(),302);
    }

    const response=await worker.fetch(request,env,ctx);
    if(request.method!=='GET'||!response.ok)return response;

    const type=response.headers.get('content-type')||'';
    if(url.pathname==='/yeni-musteri.html'){
      const headers=new Headers(response.headers);
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      headers.delete('etag');
      headers.delete('content-length');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }

    if(type.includes('text/html')&&['/','/index.html','/musteri-portfoyu.html'].includes(url.pathname)){
      let html=await response.text();
      html=html.replace(/\/yeni-musteri\.html(?:\?v=[^"'\s<]*)?/g,'/yeni-musteri.html?v='+NEW_CUSTOMER_VERSION);
      return rebuild(response,html);
    }

    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
