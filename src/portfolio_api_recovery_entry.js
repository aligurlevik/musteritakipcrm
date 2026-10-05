import worker from './sales_care_bridge_entry.js';
import {restorePortfolioCustomers} from './restore_portfolio_customers.js';

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-cache, no-store, must-revalidate',
    'x-crm-portfolio-recovery':'direct-d1-company-open-v1'
  }});
}

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
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

const FULLSCREEN_CSS=`
<style data-crm-company-open-v1>
#rows tr{cursor:default!important}
#rows .company-open{appearance:none;border:0;background:transparent;padding:0;margin:0;color:#1769f6;font:inherit;font-weight:900;cursor:pointer;text-decoration:underline;text-underline-offset:2px;text-align:left}
#detail.crm-fullscreen{position:fixed!important;inset:0!important;z-index:2147483000!important;width:100vw!important;height:100vh!important;min-height:0!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;overflow:auto!important;background:#fff!important}
#detail.crm-fullscreen .detail-head{position:sticky;top:0;z-index:5;background:#fff}
#detail.crm-fullscreen .detail-body{max-width:1500px;margin:0 auto;padding:18px 24px 40px}
#detail.crm-fullscreen .tabs{position:sticky;top:55px;z-index:4;background:#fff}
#detail .crm-close-fullscreen{display:none}
#detail.crm-fullscreen .crm-close-fullscreen{display:inline-block}
</style>`;

const FULLSCREEN_SCRIPT=`
<script data-crm-company-open-v1>
function openCustomerFullscreen(id){
  var detail=document.getElementById('detail');
  if(detail)detail.classList.add('crm-fullscreen');
  try{
    var p=selectCustomer(id);
    if(p&&typeof p.catch==='function')p.catch(function(err){console.error('Müşteri açılamadı',err)});
  }catch(err){console.error('Müşteri açılamadı',err)}
}
function closeCustomerFullscreen(){
  var detail=document.getElementById('detail');
  if(detail)detail.classList.remove('crm-fullscreen');
}
</script>`;

function patchPortfolioHtml(html){
  // Eski tam ekran/tıklama deneylerinden kalan katmanları kaldır.
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-detail\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-stable\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-fullscreen-stable[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-name-click[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<style[^>]*data-crm-portfolio-fullscreen[^>]*>[\s\S]*?<\/style>\s*/gi,'');
  html=html.replace(/<style[^>]*data-crm-portfolio-detail-link[^>]*>[\s\S]*?<\/style>\s*/gi,'');
  html=html.replace(/<style[^>]*data-crm-company-open-v1[^>]*>[\s\S]*?<\/style>\s*/gi,'');
  html=html.replace(/<script[^>]*data-crm-company-open-v1[^>]*>[\s\S]*?<\/script>\s*/gi,'');

  // Satır tıklanmaz. Yalnız firma adının kendisi açar.
  const rowClick='<tr class="${cls}${sel}" onclick="selectCustomer(${c.id})">';
  const rowDirect='<tr class="${cls}${sel}" onclick="location.href=\'/musteri-detay.html?id=${c.id}\'">';
  const rowPlain='<tr class="${cls}${sel}">';
  html=html.split(rowClick).join(rowPlain);
  html=html.split(rowDirect).join(rowPlain);

  // Firma adını tek tıklama noktası yap.
  const companySpan='<span class="company">${esc(c.company)}</span>';
  const companyCustomerLink='<a class="company" href="/?page=customers&editCustomer=${c.id}" onclick="event.stopPropagation()">${esc(c.company)}</a>';
  const companyDetailLink='<a class="company" href="/musteri-detay.html?id=${c.id}" onclick="event.stopPropagation()">${esc(c.company)}</a>';
  const companyButton='<button type="button" class="company company-open" onclick="event.stopPropagation();openCustomerFullscreen(${c.id})">${esc(c.company)}</button>';
  html=html.split(companySpan).join(companyButton);
  html=html.split(companyCustomerLink).join(companyButton);
  html=html.split(companyDetailLink).join(companyButton);

  // İlk anda temel bilgiler açılsın; geçmiş verisi gelince tamamlanır.
  const oldSelect="async function selectCustomer(id){selected=customers.find(c=>Number(c.id)===Number(id));if(!selected)return;selectedHistory=await api('/api/customers/'+id+'/history');loadSelected();render()}";
  const stableSelect="async function selectCustomer(id){const activeId=Number(id);selected=customers.find(c=>Number(c.id)===activeId);if(!selected)return;selectedHistory={meetings:[],offers:[]};loadSelected();render();try{const history=await api('/api/customers/'+activeId+'/history');if(!selected||Number(selected.id)!==activeId)return;selectedHistory=history||{meetings:[],offers:[]};renderHistory();renderAnalysis()}catch(e){console.warn('Müşteri geçmişi yüklenemedi; temel bilgiler açık kalacak.',e)}}";
  html=html.split(oldSelect).join(stableSelect);

  // Tam ekranda kapatma butonu.
  const actions='<div class="detail-actions"><button class="btn small" onclick="focusEdit()">✎ Düzenle</button></div>';
  const actionsWithClose='<div class="detail-actions"><button class="btn small" onclick="focusEdit()">✎ Düzenle</button><button type="button" class="btn small crm-close-fullscreen" onclick="closeCustomerFullscreen()">✕ Kapat</button></div>';
  html=html.split(actions).join(actionsWithClose);

  html=html.replace(/<\/head>/i,FULLSCREEN_CSS+'\n</head>');
  html=html.replace(/<\/body>/i,FULLSCREEN_SCRIPT+'\n</body>');
  return html;
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
