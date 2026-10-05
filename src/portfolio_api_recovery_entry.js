import worker from './sales_care_bridge_entry.js';

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-cache, no-store, must-revalidate','x-crm-portfolio-recovery':'direct-d1-v7'}});
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
  const r=await env.DB.prepare(`SELECT * FROM customers WHERE COALESCE(record_status,'Aktif')<>'Silindi' ORDER BY CASE priority WHEN 'KRİTİK' THEN 1 WHEN 'YÜKSEK' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, company COLLATE NOCASE`).all();
  return r.results||[];
}

async function directMeetings(env){
  const r=await env.DB.prepare(`SELECT m.* FROM meetings m LEFT JOIN customers c ON c.id=m.customer_id WHERE COALESCE(c.record_status,'Aktif')<>'Silindi' ORDER BY COALESCE(m.meeting_date,m.created_at) DESC`).all();
  return r.results||[];
}

async function directHistory(customerId,env){
  const customer=await env.DB.prepare('SELECT * FROM customers WHERE id=? AND COALESCE(record_status,\'Aktif\')<>\'Silindi\'').bind(customerId).first();
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

const FULLSCREEN_STYLE=String.raw`
<style data-portfolio-fullscreen-inline="20261005-v4">
body.crm-customer-fullscreen{overflow:hidden!important}
body.crm-customer-fullscreen #detail{position:fixed!important;inset:0!important;z-index:2147483000!important;width:100vw!important;height:100vh!important;min-width:100vw!important;max-width:100vw!important;min-height:100vh!important;max-height:100vh!important;margin:0!important;border:0!important;border-radius:0!important;overflow:auto!important;background:#f4f7fb!important;box-shadow:none!important}
body.crm-customer-fullscreen #detail .detail-head{position:sticky!important;top:0!important;z-index:50!important;background:#fff!important;padding:15px 20px!important;box-shadow:0 1px 0 #dce5ef!important}
body.crm-customer-fullscreen #detail .detail-title{font-size:22px!important}
body.crm-customer-fullscreen #detail .tabs{position:sticky!important;top:63px!important;z-index:45!important;background:#fff!important;padding:0 18px!important}
body.crm-customer-fullscreen #detail .tab{font-size:12px!important;padding:13px 8px!important}
body.crm-customer-fullscreen #detail .detail-body{width:min(1500px,calc(100vw - 44px))!important;max-width:1500px!important;margin:0 auto!important;padding:22px 0 40px!important}
body.crm-customer-fullscreen #detail .summary4{gap:12px!important}
body.crm-customer-fullscreen #detail .mini-card{min-height:78px!important;padding:12px!important}
body.crm-customer-fullscreen #detail .mini-card .m-label{font-size:11px!important}
body.crm-customer-fullscreen #detail .mini-card .m-value{font-size:14px!important}
body.crm-customer-fullscreen #detail .panel{padding:16px!important}
body.crm-customer-fullscreen #detail .panel h3{font-size:15px!important}
body.crm-customer-fullscreen #detail .info-row{font-size:13px!important;margin:10px 0!important}
body.crm-customer-fullscreen #detail .info-row input,body.crm-customer-fullscreen #detail .info-row select{height:38px!important;font-size:12px!important}
body.crm-customer-fullscreen #detail .notes-panel{margin-top:14px!important}
body.crm-customer-fullscreen #detail .note-list{max-height:280px!important}
body.crm-customer-fullscreen #detail .history-item{font-size:12px!important;padding:12px 14px!important}
#crmCustomerFullscreenClose{background:#ef4444!important;color:#fff!important;border-color:#ef4444!important;padding:9px 15px!important;font-size:13px!important;font-weight:900!important}
#rows .company{cursor:pointer!important;text-decoration:underline!important;text-underline-offset:2px!important;color:#1769f6!important}
@media(max-width:900px){body.crm-customer-fullscreen #detail .detail-body{width:calc(100vw - 24px)!important}body.crm-customer-fullscreen #detail .two-col{grid-template-columns:1fr!important}body.crm-customer-fullscreen #detail .summary4{grid-template-columns:1fr 1fr!important}}
</style>`;

const FULLSCREEN_SCRIPT=String.raw`
<script data-portfolio-fullscreen-inline-script="20261005-v4">
(function(){
  'use strict';
  window.crmCloseCustomerFullscreen=function(){
    document.body.classList.remove('crm-customer-fullscreen');
    var d=document.getElementById('detail');
    if(d){try{d.scrollTop=0}catch(_){}}
  };
  window.crmOpenCustomerFullscreen=function(){
    var d=document.getElementById('detail');
    if(!d)return;
    var actions=d.querySelector('.detail-actions');
    if(actions&&!document.getElementById('crmCustomerFullscreenClose')){
      var btn=document.createElement('button');
      btn.type='button';
      btn.id='crmCustomerFullscreenClose';
      btn.className='btn small';
      btn.textContent='✕ Kapat';
      btn.onclick=function(event){event.preventDefault();event.stopPropagation();window.crmCloseCustomerFullscreen()};
      actions.appendChild(btn);
    }
    document.body.classList.add('crm-customer-fullscreen');
    try{d.scrollTop=0}catch(_){}
  };
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&document.body.classList.contains('crm-customer-fullscreen'))window.crmCloseCustomerFullscreen()});
})();
</script>`;

function stabilizePortfolioHtml(html){
  // Eski tam ekran katmanlarının tamamını kaldır; bu sürüm dış JS dosyasına bağlı değildir.
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-detail\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-stable\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-fullscreen-stable[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-fullscreen-inline-script[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<style[^>]*data-portfolio-fullscreen-inline[^>]*>[\s\S]*?<\/style>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-name-click[^>]*>[\s\S]*?<\/script>\s*/gi,'');

  // Firma isminin kendisi müşteri seçimini ve tam ekran açılışını doğrudan yapar.
  // Böylece event delegation, asset cache veya başka click katmanlarına bağımlılık kalmaz.
  const linkedCompany='<a class="company" href="/?page=customers&editCustomer=${c.id}" onclick="event.stopPropagation()">${esc(c.company)}</a>';
  const plainCompany='<span class="company">${esc(c.company)}</span>';
  const clickableCompany='<span class="company" onclick="event.stopPropagation();selectCustomer(${c.id});window.crmOpenCustomerFullscreen&&window.crmOpenCustomerFullscreen()">${esc(c.company)}</span>';
  html=html.split(linkedCompany).join(clickableCompany);
  html=html.split(plainCompany).join(clickableCompany);

  // Kart bilgilerini anında değiştir; geçmiş kaydı arkadan gelsin.
  const oldSelect="async function selectCustomer(id){selected=customers.find(c=>Number(c.id)===Number(id));if(!selected)return;selectedHistory=await api('/api/customers/'+id+'/history');loadSelected();render()}";
  const stableSelect="async function selectCustomer(id){const activeId=Number(id);selected=customers.find(c=>Number(c.id)===activeId);if(!selected)return;selectedHistory={meetings:[],offers:[]};loadSelected();render();try{const history=await api('/api/customers/'+activeId+'/history');if(!selected||Number(selected.id)!==activeId)return;selectedHistory=history||{meetings:[],offers:[]};renderHistory();renderAnalysis()}catch(e){console.warn('Müşteri geçmişi yüklenemedi; temel bilgiler açık kalacak.',e)}}";
  html=html.split(oldSelect).join(stableSelect);

  html=html.replace(/<\/head>/i,FULLSCREEN_STYLE+'\n</head>');
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
      const html=stabilizePortfolioHtml(await response.text());
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
