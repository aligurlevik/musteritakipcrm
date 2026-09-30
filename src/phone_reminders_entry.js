import worker from './quick_request_vertical_compact.js';
import {pushApi,pushHealth,deliverDueReminders,sendPush,sendWakePush} from './phone_reminders.js';
import {applyCrmBranding} from './crm_branding.js';
import {nativeAlarmApi} from './native_alarm_api.js';
import {ensureCustomerExtendedFields,persistCustomerExtendedFields} from './customer_extended_fields.js';
import {restorePortfolioCustomers} from './restore_portfolio_customers.js';

let demoCleanupPromise;
const sessionEncoder=new TextEncoder();

async function hmacHex(secret,value){
  const key=await crypto.subtle.importKey('raw',sessionEncoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,sessionEncoder.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function portfolioRequestForGraphic(request,env,ctx,path){
  const portfolioApi=path.startsWith('/api/customers')||path.startsWith('/api/meetings')||path.startsWith('/api/offers');
  if(!portfolioApi)return request;
  try{
    const cookie=request.headers.get('cookie')||'';
    const match=cookie.match(/(?:^|;\s*)crm_session=([^;]+)/);
    if(!match)return request;

    const day=new Date().toISOString().slice(0,10);
    const graphicSignature=await hmacHex(env.SESSION_SECRET||'change-me','graphic.'+day);
    const graphicToken='graphic.'+day+'.'+graphicSignature;
    if(match[1]!==graphicToken)return request;

    const signature=await hmacHex(env.SESSION_SECRET||'change-me','admin.'+day);
    const adminToken='admin.'+day+'.'+signature;
    const headers=new Headers(request.headers);
    const oldCookie=headers.get('cookie')||'';
    const keep=oldCookie.split(';').map(x=>x.trim()).filter(x=>x&&!x.startsWith('crm_session=')).join('; ');
    headers.set('cookie',(keep?keep+'; ':'')+'crm_session='+adminToken);
    return new Request(request,{headers});
  }catch(error){
    console.error('Portfolio access bridge failed',error?.message||error);
    return request;
  }
}

async function sendBackgroundReminder(device,data,vapid){
  try{
    const primary=await sendPush(device,data,vapid);
    if(primary.ok||primary.status===404||primary.status===410)return primary;
    try{
      const fallback=await sendWakePush(device,data,vapid);
      return fallback.ok?fallback:primary;
    }catch(_){return primary}
  }catch(primaryError){
    try{return await sendWakePush(device,data,vapid)}catch(_){throw primaryError}
  }
}

async function cleanupDemoCustomers(env){
  if(demoCleanupPromise)return demoCleanupPromise;
  demoCleanupPromise=(async()=>{
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_meta(key TEXT PRIMARY KEY,value TEXT DEFAULT '')").run();
    const marker=await env.DB.prepare('SELECT value FROM app_meta WHERE key=?').bind('remove_demo_customers_v1').first();
    if(marker)return;

    const demoNames=['Atlas Tekstil','Vera Medikal','Artemis Kozmetik','Mavi Kutu Ambalaj'];
    const found=(await env.DB.prepare('SELECT id FROM customers WHERE company IN (?,?,?,?)').bind(...demoNames).all()).results||[];
    const ids=found.map(row=>Number(row.id)).filter(Boolean);

    if(ids.length){
      const marks=ids.map(()=>'?').join(',');
      const existingTables=(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results||[];
      const tables=new Set(existingTables.map(row=>String(row.name)));
      for(const table of ['mails','meetings','offers','reminders']){
        if(tables.has(table))await env.DB.prepare(`DELETE FROM ${table} WHERE customer_id IN (${marks})`).bind(...ids).run();
      }
      await env.DB.prepare(`DELETE FROM customers WHERE id IN (${marks})`).bind(...ids).run();
    }

    await env.DB.prepare('INSERT OR REPLACE INTO app_meta(key,value) VALUES(?,?)').bind('remove_demo_customers_v1',new Date().toISOString()).run();
  })().catch(error=>{demoCleanupPromise=null;console.error('Demo customer cleanup failed',error);throw error});
  return demoCleanupPromise;
}

function hasExtendedCustomerPayload(payload){
  if(!payload||typeof payload!=='object')return false;
  return ['contacts','district','customer_requests','cargo_enabled','cargo_company','cargo_code','cargo_note','service_requested','service_type','service_description','service_date']
    .some(key=>Object.prototype.hasOwnProperty.call(payload,key));
}

async function persistExtendedCustomerWrite(request,response,env,path){
  if(!response.ok||!['POST','PUT'].includes(request.method))return response;
  const isCreate=path==='/api/customers'&&request.method==='POST';
  const updateMatch=path.match(/^\/api\/customers\/(\d+)$/);
  if(!isCreate&&!updateMatch)return response;
  let payload={};
  try{payload=await request.clone().json()}catch{return response}
  if(!hasExtendedCustomerPayload(payload))return response;
  let customerId=updateMatch?Number(updateMatch[1]):0;
  if(isCreate){
    try{const data=await response.clone().json();customerId=Number(data?.id||0)}catch{}
  }
  if(customerId)await persistCustomerExtendedFields(env,customerId,payload);
  return response;
}

function rebuildHtml(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function servePortfolioDirect(request,env){
  const assetUrl=new URL(request.url);assetUrl.pathname='/musteri-portfoyu.html';assetUrl.search='';
  const response=await env.ASSETS.fetch(new Request(assetUrl.toString(),{method:'GET',headers:request.headers}));
  if(!response.ok)return response;
  let html=await response.text();
  html=html.replace(/href=["']\/\?page=customers["'](?=[^>]*>\s*＋?\s*Yeni Müşteri)/gi,'href="/yeni-musteri.html?v=20260930-3"');
  html=html.replace(/href=["']\/\?page=customers(?:&amp;|&)newCustomer=1["']/gi,'href="/yeni-musteri.html?v=20260930-3"');
  html=html.replace(/location\.href=["']\/\?page=customers(?:&amp;|&)newCustomer=1["'];?/gi,"location.href='/yeni-musteri.html?v=20260930-3';");
  if(!html.includes('/portfolio-contact-enhancement.js'))html=html.replace(/<\/body>/i,'<script src="/portfolio-contact-enhancement.js?v=20260930-3"></script>\n</body>');
  else html=html.replace(/portfolio-contact-enhancement\.js\?v=[^"']+/g,'portfolio-contact-enhancement.js?v=20260930-3');
  return rebuildHtml(response,html);
}

async function simplifyCrmMenu(response,request){
  if(request.method!=='GET'||!response.ok)return response;
  const url=new URL(request.url);
  if(!['/','/index.html'].includes(url.pathname))return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;

  let html=await response.text();
  html=html.replace(/<div class="customer-folder-group">[\s\S]*?<\/div>/,'');
  html=html.replace(/<button data-page="meetings">Görüşmeler<\/button>/,'');
  html=html.replace('<button class="btn primary" onclick="openCustomer()">+ Yeni Müşteri</button>','<button class="btn primary" type="button" onclick="location.href=\'/yeni-musteri.html?v=20260930-3\'">+ Yeni Müşteri</button>');
  if(!html.includes('/customer-card-extended.js'))html=html.replace(/<\/body>/i,'<script src="/customer-card-extended.js?v=20260930-3"></script>\n</body>');
  return rebuildHtml(response,html);
}

export default{
  async fetch(request,env,ctx){
    try{await cleanupDemoCustomers(env)}catch(_){}
    try{await restorePortfolioCustomers(env)}catch(error){console.error('Portfolio restore failed',error?.message||error)}
    const requestUrl=new URL(request.url),path=requestUrl.pathname;

    if(request.method==='GET'&&path==='/musteri-portfoyu.html'){
      return servePortfolioDirect(request,env);
    }

    if(request.method==='GET'&&['/','/index.html'].includes(path)&&requestUrl.searchParams.get('newCustomer')==='1'){
      return Response.redirect(new URL('/yeni-musteri.html?v=20260930-3',request.url).toString(),302);
    }

    if(path.startsWith('/api/customers')){
      try{await ensureCustomerExtendedFields(env)}catch(error){console.error('Extended customer schema failed',error)}
    }
    if(path.startsWith('/api/native-alarm/')){
      try{return await nativeAlarmApi(request,env)}catch(error){console.error('Native alarm API failed',error?.name);return new Response(JSON.stringify({error:'Yerel alarm servisi kullanılamıyor.'}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
    }
    if(path==='/api/push/health'&&request.method==='GET'){
      try{return new Response(JSON.stringify(await pushHealth(env)),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}catch(error){return new Response(JSON.stringify({ok:false,error:String(error?.message||error)}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
    }
    if(path.startsWith('/api/push/')){
      try{return await pushApi(request,env)}catch(error){console.error('Phone reminder API failed',error?.name);return new Response(JSON.stringify({error:'Telefon bildirimi kurulamadı. Tekrar deneyin.'}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
    }
    if(['/agenda-sw.js','/agenda-sw-silent.js','/agenda.webmanifest','/crm.webmanifest','/agenda-icon-192.png','/agenda-icon-512.png','/phone-reminders.js','/phone-notification-controls.js','/agenda-visual-alert.js','/note-color-palette.js','/customer-card-extended.js','/portfolio-contact-enhancement.js','/yeni-musteri.html'].includes(path)){
      const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      if(path==='/agenda-sw.js'||path==='/agenda-sw-silent.js'){headers.set('content-type','application/javascript');headers.set('service-worker-allowed','/')}
      if(path.endsWith('.webmanifest'))headers.set('content-type','application/manifest+json');
      if(path.endsWith('.js'))headers.set('content-type','application/javascript; charset=utf-8');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }

    const downstreamRequest=await portfolioRequestForGraphic(request,env,ctx,path);
    let baseResponse=await worker.fetch(downstreamRequest,env,ctx);
    try{baseResponse=await persistExtendedCustomerWrite(request,baseResponse,env,path)}catch(error){console.error('Extended customer save failed',error)}
    const branded=await applyCrmBranding(baseResponse,request);
    return simplifyCrmMenu(branded,request);
  },
  async scheduled(controller,env){await deliverDueReminders(env,{now:controller.scheduledTime||Date.now(),send:sendBackgroundReminder})}
};