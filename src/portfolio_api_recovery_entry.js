import worker from './sales_care_bridge_entry.js';

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-cache, no-store, must-revalidate','x-crm-portfolio-recovery':'direct-d1-v11'}});
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

const PORTFOLIO_LINK_CSS=`
<style data-crm-portfolio-detail-link="v3">
#rows .company{cursor:pointer!important;text-decoration:underline!important;text-underline-offset:2px!important;color:#1769f6!important}
#rows tr{cursor:pointer!important}
</style>`;

const PORTFOLIO_NAV_GUARD=`
<script data-crm-portfolio-nav-guard="v1">
(function(){
  if(window.__crmPortfolioDirectNavigationV1)return;
  window.__crmPortfolioDirectNavigationV1=true;
  function detailHref(target){
    var company=target&&target.closest?target.closest('#rows .company'):null;
    if(company){
      var href=company.getAttribute('href')||'';
      if(href.indexOf('/musteri-detay.html?id=')===0)return href;
    }
    var row=target&&target.closest?target.closest('#rows tr'):null;
    if(!row)return '';
    if(target.closest&&target.closest('a.mail,button,input,select,textarea'))return '';
    var link=row.querySelector('.company[href^="/musteri-detay.html?id="]');
    return link?link.getAttribute('href')||'':'';
  }
  document.addEventListener('pointerdown',function(event){
    if(event.button!==undefined&&event.button!==0)return;
    var href=detailHref(event.target);
    if(!href)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(href);
  },true);
})();
</script>`;

function stabilizePortfolioHtml(html){
  // Önceki tam ekran yamalarını temizle. Detay artık ayrı sayfada açılır.
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-detail\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-stable\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-fullscreen-stable[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-name-click[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-crm-portfolio-nav-guard[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<style[^>]*data-crm-portfolio-fullscreen[^>]*>[\s\S]*?<\/style>\s*/gi,'');
  html=html.replace(/<style[^>]*data-crm-portfolio-detail-link[^>]*>[\s\S]*?<\/style>\s*/gi,'');

  // Liste sütunlarını düzenleyen eski katman her tıklamada bütün tabloyu yeniden biçimlendiriyordu.
  // Görünümünü koruyoruz ama global click sonrası tekrar-enforce davranışını devre dışı bırakıyoruz.
  html=html.replace("document.addEventListener('click',function(){setTimeout(enforce,70);setTimeout(enforce,220)},true);",'');

  // Firma adı doğrudan yeni detay sayfasına gider. Aynı tıklamada sağ kartı yeniden çizme yok.
  const linkedCompany='<a class="company" href="/?page=customers&editCustomer=${c.id}" onclick="event.stopPropagation()">${esc(c.company)}</a>';
  const plainCompany='<span class="company">${esc(c.company)}</span>';
  const detailCompany='<a class="company" href="/musteri-detay.html?id=${c.id}" onclick="event.preventDefault();event.stopImmediatePropagation();location.href=this.href;return false">${esc(c.company)}</a>';
  html=html.split(linkedCompany).join(detailCompany);
  html=html.split(plainCompany).join(detailCompany);

  // Satırın tamamı da aynı detay sayfasına gider. selectCustomer tetiklenmez, liste blok halinde oynamaz.
  const oldRow='<tr class="${cls}${sel}" onclick="selectCustomer(${c.id})">';
  const detailRow='<tr class="${cls}${sel}" onclick="location.href=\'/musteri-detay.html?id=${c.id}\'">';
  html=html.split(oldRow).join(detailRow);

  const oldDetailButton='<button class="btn small" onclick="event.stopPropagation();selectCustomer(${c.id})">Detay</button>';
  const newDetailButton='<button class="btn small" onclick="event.stopPropagation();location.href=\'/musteri-detay.html?id=${c.id}\'">Detay</button>';
  html=html.split(oldDetailButton).join(newDetailButton);

  // İlk açılışta sağ kartın mevcut hızlı yüklenmesi korunur.
  const oldSelect="async function selectCustomer(id){selected=customers.find(c=>Number(c.id)===Number(id));if(!selected)return;selectedHistory=await api('/api/customers/'+id+'/history');loadSelected();render()}";
  const stableSelect="async function selectCustomer(id){const activeId=Number(id);selected=customers.find(c=>Number(c.id)===activeId);if(!selected)return;selectedHistory={meetings:[],offers:[]};loadSelected();render();try{const history=await api('/api/customers/'+activeId+'/history');if(!selected||Number(selected.id)!==activeId)return;selectedHistory=history||{meetings:[],offers:[]};renderHistory();renderAnalysis()}catch(e){console.warn('Müşteri geçmişi yüklenemedi; temel bilgiler açık kalacak.',e)}}";
  html=html.split(oldSelect).join(stableSelect);

  html=html.replace(/<\/head>/i,PORTFOLIO_LINK_CSS+'\n'+PORTFOLIO_NAV_GUARD+'\n</head>');
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
