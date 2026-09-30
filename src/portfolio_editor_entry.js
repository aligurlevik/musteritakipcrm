import worker from './phone_reminders_entry.js';

function rebuildHtml(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==='GET'&&['/portfolio-inline-editor.js','/portfolio-views.js'].includes(url.pathname)){
      const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }

    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      if(!html.includes('/portfolio-inline-editor.js'))html=html.replace(/<\/body>/i,'<script src="/portfolio-inline-editor.js?v=20260930-1518"></script>\n</body>');
      if(!html.includes('/portfolio-views.js'))html=html.replace(/<\/body>/i,'<script src="/portfolio-views.js?v=20260930-1530"></script>\n</body>');
      return rebuildHtml(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};