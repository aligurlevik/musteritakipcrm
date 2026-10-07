import worker from './portfolio_company_link_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  headers.set('x-crm-portfolio-workflow','safe-v1');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

function assetResponse(response,type){
  const headers=new Headers(response.headers);
  headers.set('content-type',type);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/portfolio-workflow-v1.js'){
      return assetResponse(await env.ASSETS.fetch(request),'application/javascript; charset=utf-8');
    }
    if(request.method==='GET'&&url.pathname==='/portfolio-workflow-v1.css'){
      return assetResponse(await env.ASSETS.fetch(request),'text/css; charset=utf-8');
    }

    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<link[^>]*data-workflow-layer[^>]*>\s*/gi,'');
      html=html.replace(/<script[^>]*data-workflow-layer[^>]*><\/script>\s*/gi,'');
      html=html.replace(/<\/head>/i,'<link data-workflow-layer="safe-v1" rel="stylesheet" href="/portfolio-workflow-v1.css?v=20261007-1">\n</head>');
      html=html.replace(/<\/body>/i,'<script data-workflow-layer="safe-v1" src="/portfolio-workflow-v1.js?v=20261007-1"></script>\n</body>');
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};