import worker from './phone_reminders_entry_v2.js';

function rebuilt(response, html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request, env, ctx) {
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/portfolio-edit-modal-v2.js'){
      const response=await env.ASSETS.fetch(request);
      const headers=new Headers(response.headers);
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      headers.set('content-type','application/javascript; charset=utf-8');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok){
      const type=response.headers.get('content-type')||'';
      if(type.includes('text/html')){
        let html=await response.text();
        html=html.replace(/<button class="btn small" onclick="focusEdit\(\)">✎ Düzenle<\/button>/,'<button id="portfolioEditButton" class="btn small" type="button">✎ Düzenle</button>');
        if(!html.includes('/portfolio-edit-modal-v2.js'))html=html.replace(/<\/body>/i,'<script src="/portfolio-edit-modal-v2.js?v=20260930-4"></script>\n</body>');
        return rebuilt(response,html);
      }
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(worker.scheduled)return worker.scheduled(controller,env,ctx);
  }
};
