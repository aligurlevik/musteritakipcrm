import stableWorker from './customer_button_modal_fix_entry.js';
import salesCareWorker from './sales_care_entry.js';
import mailTransportWorker from './customer_mail_transport_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-cache, no-store, must-revalidate'}});
}

async function authOk(request,env,ctx){
  try{
    const u=new URL(request.url);
    u.pathname='/api/customers';
    u.search='';
    const response=await stableWorker.fetch(new Request(u,{method:'GET',headers:request.headers}),env,ctx);
    return response.ok;
  }catch(_){return false}
}

async function ensureSalesCare(request,env,ctx){
  try{
    const u=new URL(request.url);
    u.pathname='/api/sales-care-dashboard';
    u.search='';
    await salesCareWorker.fetch(new Request(u,{method:'GET',headers:request.headers}),env,ctx);
  }catch(_){ }
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

    if(path==='/api/sales-care-contacts'){
      if(request.method!=='GET')return json({error:'Yöntem desteklenmiyor.'},405);
      if(!(await authOk(request,env,ctx)))return json({error:'Oturum gerekli.'},401);
      await ensureSalesCare(request,env,ctx);
      const latest=new Map();
      try{
        const rows=(await env.DB.prepare('SELECT customer_id,last_contact_at FROM sales_care WHERE last_contact_at IS NOT NULL AND last_contact_at<>\'\'').all()).results||[];
        for(const row of rows){
          const id=Number(row.customer_id||0),at=String(row.last_contact_at||'');
          if(id&&at)latest.set(id,at);
        }
      }catch(_){ }
      try{
        const rows=(await env.DB.prepare('SELECT customer_id,MAX(mail_date) AS last_mail_at FROM mails GROUP BY customer_id').all()).results||[];
        for(const row of rows){
          const id=Number(row.customer_id||0),at=String(row.last_mail_at||''),old=latest.get(id)||'';
          if(id&&at&&(!old||at>old))latest.set(id,at);
        }
      }catch(_){ }
      return json({contacts:Array.from(latest,function(entry){return {customer_id:entry[0],last_contact_at:entry[1]}})});
    }

    if(path==='/api/sales-care-touch'){
      if(request.method!=='POST')return json({error:'Yöntem desteklenmiyor.'},405);
      if(!(await authOk(request,env,ctx)))return json({error:'Oturum gerekli.'},401);
      let body={};try{body=await request.json()}catch(_){return json({error:'Geçersiz istek.'},400)}
      const id=Number(body.customer_id||0);if(!id)return json({error:'Müşteri seçilmedi.'},400);
      const parsed=new Date(body.last_contact_at||Date.now());
      const at=Number.isNaN(parsed.getTime())?new Date().toISOString():parsed.toISOString();
      await ensureSalesCare(request,env,ctx);
      try{
        const customer=await env.DB.prepare('SELECT company FROM customers WHERE id=?').bind(id).first();
        if(!customer)return json({error:'Müşteri bulunamadı.'},404);
        const now=new Date().toISOString();
        await env.DB.prepare(`INSERT INTO sales_care(customer_id,customer_name,last_contact_at,created_at,updated_at)
          VALUES(?,?,?,?,?) ON CONFLICT(customer_id) DO UPDATE SET customer_name=excluded.customer_name,
          last_contact_at=CASE WHEN sales_care.last_contact_at='' OR sales_care.last_contact_at<excluded.last_contact_at THEN excluded.last_contact_at ELSE sales_care.last_contact_at END,
          updated_at=excluded.updated_at`).bind(id,String(customer.company||''),at,now,now).run();
        const row=await env.DB.prepare('SELECT last_contact_at FROM sales_care WHERE customer_id=?').bind(id).first();
        return json({ok:true,last_contact_at:String(row?.last_contact_at||at)});
      }catch(e){
        console.error('sales-care-touch',e);
        return json({error:'Son görüşme tarihi güncellenemedi.'},500);
      }
    }

    if(path.startsWith('/api/customer-mail/')){
      return mailTransportWorker.fetch(request,env,ctx);
    }

    if(request.method==='GET'&&['/home-color-theme.css','/portfolio-color-theme.css'].includes(path)){
      const asset=await env.ASSETS.fetch(request);
      const headers=new Headers(asset.headers);
      headers.set('content-type','text/css; charset=utf-8');
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }

    if(request.method==='GET'&&['/sales-care-ui.js','/customer-analysis-labels.js','/customer-analysis-lite.js','/mail-transport-v2-ui.js','/customer-card-tabs-controller.js','/portfolio-last-action.js','/last-contact-auto.js','/portfolio-customer-jump.js'].includes(path)){
      const asset=await env.ASSETS.fetch(request);
      const headers=new Headers(asset.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }

    const response=await stableWorker.fetch(request,env,ctx);

    if(request.method==='GET'&&(path==='/'||path==='/index.html')&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<link[^>]*data-home-color-theme[^>]*>\s*/gi,'');
      html=stripScript(html,'data-customer-deeplink','customer-deeplink.js');
      html=html.replace(/<\/head>/i,'<link data-home-color-theme="20261002-v1" rel="stylesheet" href="/home-color-theme.css?v=20261002-1">\n</head>');
      return rebuild(response,html);
    }

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
      html=stripScript(html,'data-last-contact-auto','last-contact-auto.js');
      html=stripScript(html,'data-portfolio-customer-jump','portfolio-customer-jump.js');
      html=html.replace(/<link[^>]*data-portfolio-color-theme[^>]*>\s*/gi,'');
      html=html.replace(/<\/head>/i,'<link data-portfolio-color-theme="20261002-v2" rel="stylesheet" href="/portfolio-color-theme.css?v=20261002-2">\n</head>');

      html=html.replace(/<\/body>/i,
        '<script data-sales-care-safe-ui="20261001-v1" src="/sales-care-ui.js?v=20261001-1"></script>\n'+
        '<script data-mail-transport-v2-ui="20261002-v4" src="/mail-transport-v2-ui.js?v=20261002-4"></script>\n'+
        '<script data-customer-card-tabs-controller="20261002-root-v2" src="/customer-card-tabs-controller.js?v=20261002-root-2"></script>\n'+
        '<script data-last-contact-auto="20261002-v4" src="/last-contact-auto.js?v=20261002-4"></script>\n'+
        '<script data-portfolio-last-action="20261001-v3" src="/portfolio-last-action.js?v=20261001-3"></script>\n'+
        '<script data-portfolio-customer-jump="20261002-v3" src="/portfolio-customer-jump.js?v=20261002-3"></script>\n'+
        '</body>');
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof stableWorker.scheduled==='function')return stableWorker.scheduled(controller,env,ctx);
  }
};
