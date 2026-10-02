import stableWorker from './customer_button_modal_fix_entry.js';
import salesCareWorker from './sales_care_entry.js';
import mailTransportWorker from './customer_mail_transport_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

function stripScript(html,dataAttr,srcName=''){
  html=html.replace(new RegExp('<script[^>]*'+dataAttr+'[^>]*>[\\s\\S]*?<\\/script>\\s*','gi'),'');
  if(srcName){
    const escaped=srcName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    html=html.replace(new RegExp('<script\\s+[^>]*src=["\']\\/'+escaped+'(?:\\?[^"\']*)?["\'][^>]*><\\/script>\\s*','gi'),'');
  }
  return html;
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

    if(request.method==='GET'&&['/sales-care-ui.js','/customer-analysis-labels.js','/mail-transport-v2-ui.js','/customer-card-tabs-controller.js','/portfolio-last-action.js'].includes(path)){
      const asset=await env.ASSETS.fetch(request);
      const headers=new Headers(asset.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }

    const response=await stableWorker.fetch(request,env,ctx);
    if(request.method==='GET'&&path==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();

      html=stripScript(html,'data-portfolio-section-layout','portfolio-section-layout.js');
      html=stripScript(html,'data-portfolio-modal-cleanup');
      html=stripScript(html,'data-sales-meetings-merge');
      html=stripScript(html,'data-customer-mail-tab-fix');
      html=stripScript(html,'data-portfolio-tab-hotfix','portfolio-tab-hotfix.js');
      html=stripScript(html,'data-customer-card-tabs-controller','customer-card-tabs-controller.js');

      html=stripScript(html,'data-sales-care-safe-ui','sales-care-ui.js');
      html=stripScript(html,'data-customer-analysis-labels','customer-analysis-labels.js');
      html=stripScript(html,'data-customer-analysis-lite','customer-analysis-lite.js');
      html=stripScript(html,'data-mail-transport-v2-ui','mail-transport-v2-ui.js');
      html=stripScript(html,'data-portfolio-last-action','portfolio-last-action.js');

      html=html.replace(/<\/body>/i,
        '<script data-sales-care-safe-ui="20261001-v1" src="/sales-care-ui.js?v=20261001-1"></script>\n'+
        '<script data-mail-transport-v2-ui="20261001-v3" src="/mail-transport-v2-ui.js?v=20261001-3"></script>\n'+
        '<script data-customer-card-tabs-controller="20261001-root-v1" src="/customer-card-tabs-controller.js?v=20261001-root-1"></script>\n'+
        '<script data-portfolio-last-action="20261001-v3" src="/portfolio-last-action.js?v=20261001-3"></script>\n'+
        '</body>');
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof stableWorker.scheduled==='function')return stableWorker.scheduled(controller,env,ctx);
  }
};
