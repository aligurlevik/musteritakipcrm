import stableWorker from './customer_button_modal_fix_entry.js';
import salesCareWorker from './sales_care_entry.js';
import mailTransportWorker from './customer_mail_transport_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;

    if(path==='/api/sales-care'||path==='/api/sales-care-dashboard'){
      return salesCareWorker.fetch(request,env,ctx);
    }

    if(path.startsWith('/api/customer-mail/')){
      return mailTransportWorker.fetch(request,env,ctx);
    }

    if(request.method==='GET'&&(path==='/sales-care-ui.js'||path==='/mail-transport-v2-ui.js'||path==='/portfolio-tab-hotfix.js')){
      const asset=await env.ASSETS.fetch(request);
      const headers=new Headers(asset.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }

    const response=await stableWorker.fetch(request,env,ctx);
    if(request.method==='GET'&&path==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-sales-care-safe-ui[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<script\s+[^>]*src=["']\/sales-care-ui\.js[^>]*><\/script>\s*/gi,'');
      html=html.replace(/<script[^>]*data-mail-transport-v2-ui[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<script\s+[^>]*src=["']\/mail-transport-v2-ui\.js[^>]*><\/script>\s*/gi,'');
      html=html.replace(/<script[^>]*data-portfolio-tab-hotfix[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<script\s+[^>]*src=["']\/portfolio-tab-hotfix\.js[^>]*><\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,'<script data-sales-care-safe-ui="20261001-v1" src="/sales-care-ui.js?v=20261001-1"></script>\n<script data-mail-transport-v2-ui="20261001-v3" src="/mail-transport-v2-ui.js?v=20261001-3"></script>\n<script data-portfolio-tab-hotfix="20261001-v2" src="/portfolio-tab-hotfix.js?v=20261001-2"></script>\n</body>');
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof stableWorker.scheduled==='function')return stableWorker.scheduled(controller,env,ctx);
  }
};
