import worker from './sales_care_bridge_entry.js';
import {restorePortfolioCustomers} from './restore_portfolio_customers.js';

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-cache, no-store, must-revalidate',
    'x-crm-portfolio-recovery':'direct-d1-company-detail-v6'
  }});
}

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

const EARLY_COMPANY_CLICK=String.raw`<script data-crm-company-click-v6>
(function(){
  if(window.__crmCompanyClickV6)return;
  window.__crmCompanyClickV6=1;
  window.addEventListener('click',function(event){
    var company=event.target&&event.target.closest?event.target.closest('#rows .company'):null;
    if(!company)return;
    var id=company.getAttribute('data-customer-id')||'';
    if(!id){
      var href=company.getAttribute('href')||'';
      var m=href.match(/[?&](?:id|editCustomer)=(\d+)/);
      if(m)id=m[1];
    }
    if(!id){
      var row=company.closest?company.closest('#rows tr'):null;
      var raw=String(row&&row.getAttribute('onclick')||'');
      var mm=raw.match(/selectCustomer\((\d+)\)/);
      if(mm)id=mm[1];
    }
    if(!id)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign('/musteri-detay.html?id='+encodeURIComponent(id));
  },true);
})();
</script>`;

function patchPortfolioHtml(html){
  html=html.replace(/<script[^>]*data-crm-company-click-v[0-9]+[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-customer-jump\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/\s+onclick=["']selectCustomer\(\$\{c\.id\}\)["']/g,'');
  html=html.replace(/tbody\s+tr\{cursor:pointer\}/g,'tbody tr{cursor:default}');

  const detailLink='<a class="company" data-customer-id="${c.id}" href="/musteri-detay.html?id=${c.id}">${esc(c.company)}</a>';
  html=html.replace(/<span\s+class=["']company["']>\$\{esc\(c\.company\)\}<\/span>/g,detailLink);
  html=html.replace(/<a\s+class=["']company["'][^>]*>\$\{esc\(c\.company\)\}<\/a>/g,detailLink);

  const detailButton='<a class="btn small" href="/musteri-detay.html?id=${c.id}" onclick="event.stopPropagation()">Detay</a>';
  html=html.replace(/<button\s+class=["']btn small["']\s+onclick=["']event\.stopPropagation\(\);selectCustomer\(\$\{c\.id\}\)["']>Detay<\/button>/g,detailButton);

  html=html.replace(/document\.addEventListener\(\s*["']click["']\s*,\s*function\(\)\s*\{\s*setTimeout\(enforce\s*,\s*70\s*\)\s*;\s*setTimeout\(enforce\s*,\s*220\s*\)\s*\}\s*,\s*true\s*\)\s*;?/g,'');
  html=html.replace('/portfolio-fullscreen-detail.js?v=20261005-1','/portfolio-fullscreen-detail.js?v=20261005-2');
  html=html.replace(/<\/head>/i,EARLY_COMPANY_CLICK+'\n</head>');
  return html;
}

async function sessionOk(request,env,ctx){
  try{
    const u=new URL(request.url);
    u.pathname='/api/session';
    u.search='';
    const r=await worker.fetch(new Request(u,{method:'GET',headers:request.headers}),env,ctx);
    return r.ok;
  }catch(_){return false}
}

async function directCustomers(env){
  await restorePortfolioCustomers(env);
  const r=await env.DB.prepare(`SELECT * FROM customers WHERE COALESCE(record_status,'Aktif')<>'Silindi' ORDER BY CASE priority WHEN 'KRİTİK' THEN 1 WHEN 'YÜKSEK' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, company COLLATE NOCASE`).all();
  return r.results||[];
}

async function directMeetings(env){
  await restorePortfolioCustomers(env);
  const r=await env.DB.prepare(`SELECT m.* FROM meetings m LEFT JOIN customers c ON c.id=m.customer_id WHERE COALESCE(c.record_status,'Aktif')<>'Silindi' ORDER BY COALESCE(m.meeting_date,m.created_at) DESC`).all();
  return r.results||[];
}

async function directHistory(customerId,env){
  await restorePortfolioCustomers(env);
  const customer=await env.DB.prepare("SELECT * FROM customers WHERE id=? AND COALESCE(record_status,'Aktif')<>'Silindi'").bind(customerId).first();
  if(!customer)return null;
  const [meetings,mails,offers]=await Promise.all([
    env.DB.prepare('SELECT * FROM meetings WHERE customer_id=? ORDER BY meeting_no ASC,COALESCE(meeting_date,created_at) ASC').bind(customerId).all(),
    env.DB.prepare('SELECT * FROM mails WHERE customer_id=? ORDER BY COALESCE(mail_date,created_at) DESC').bind(customerId).all(),
    env.DB.prepare('SELECT * FROM offers WHERE customer_id=? ORDER BY COALESCE(offer_date,created_at) DESC').bind(customerId).all()
  ]);
  return {customer,meetings:meetings.results||[],mails:mails.results||[],offers:offers.results||[]};
}

async function directSalesCareContacts(env){
  const latest=new Map();
  try{
    const rows=(await env.DB.prepare("SELECT customer_id,last_contact_at FROM sales_care WHERE last_contact_at IS NOT NULL AND last_contact_at<>''").all()).results||[];
    for(const row of rows){
      const id=Number(row.customer_id||0),at=String(row.last_contact_at||'');
      if(id&&at)latest.set(id,at);
    }
  }catch(_){}
  try{
    const rows=(await env.DB.prepare('SELECT customer_id,MAX(mail_date) AS last_mail_at FROM mails GROUP BY customer_id').all()).results||[];
    for(const row of rows){
      const id=Number(row.customer_id||0),at=String(row.last_mail_at||''),old=latest.get(id)||'';
      if(id&&at&&(!old||at>old))latest.set(id,at);
    }
  }catch(_){}
  return {contacts:Array.from(latest,entry=>({customer_id:entry[0],last_contact_at:entry[1]}))};
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;
    const wantsAll=url.searchParams.get('status')==='Tümü';
    const historyMatch=request.method==='GET'?path.match(/^\/api\/customers\/(\d+)\/history$/):null;
    const fastPortfolioRead=request.method==='GET'&&(
      (wantsAll&&(path==='/api/customers'||path==='/api/meetings'))||
      Boolean(historyMatch)||
      path==='/api/sales-care-contacts'
    );

    if(fastPortfolioRead&&await sessionOk(request,env,ctx)){
      try{
        if(path==='/api/customers')return json(await directCustomers(env));
        if(path==='/api/meetings')return json(await directMeetings(env));
        if(path==='/api/sales-care-contacts')return json(await directSalesCareContacts(env));
        if(historyMatch){
          const data=await directHistory(Number(historyMatch[1]),env);
          return data?json(data):json({error:'Müşteri bulunamadı'},404);
        }
      }catch(error){
        console.error('portfolio fast read failed',error?.message||error);
      }
    }

    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&path==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      return rebuild(response,patchPortfolioHtml(await response.text()));
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
