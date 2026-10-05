import worker from './sales_care_bridge_entry.js';

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-cache, no-store, must-revalidate','x-crm-portfolio-recovery':'direct-d1-v4'}});
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

function stabilizePortfolioHtml(html){
  // Eski tam ekran/click modüllerini tamamen kaldır. Tek tıklama akışı aşağıdaki hafif modül olacak.
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-detail\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-stable\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-fullscreen-stable[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-name-click[^>]*>[\s\S]*?<\/script>\s*/gi,'');

  // Firma adını başka sayfaya giden linke çevirmeyelim. Satırın kendi selectCustomer click'i tek veri seçme kaynağı olsun.
  const linkedCompany='<a class="company" href="/?page=customers&editCustomer=${c.id}" onclick="event.stopPropagation()">${esc(c.company)}</a>';
  const plainCompany='<span class="company">${esc(c.company)}</span>';
  html=html.split(linkedCompany).join(plainCompany);

  // Sağ kart önce anında değişsin; geçmiş verisi arkadan gelsin. Ağ gecikmesi tıklamayı kilitlemesin.
  const oldSelect="async function selectCustomer(id){selected=customers.find(c=>Number(c.id)===Number(id));if(!selected)return;selectedHistory=await api('/api/customers/'+id+'/history');loadSelected();render()}";
  const stableSelect="async function selectCustomer(id){const activeId=Number(id);selected=customers.find(c=>Number(c.id)===activeId);if(!selected)return;selectedHistory={meetings:[],offers:[]};loadSelected();render();try{const history=await api('/api/customers/'+activeId+'/history');if(!selected||Number(selected.id)!==activeId)return;selectedHistory=history||{meetings:[],offers:[]};renderHistory();renderAnalysis()}catch(e){console.warn('Müşteri geçmişi yüklenemedi; temel bilgiler açık kalacak.',e)}}";
  html=html.split(oldSelect).join(stableSelect);

  // Firma adına basınca mevcut müşteri kartı DOM taşımadan position:fixed ile ekranı kaplar.
  // Böylece sağ paneldeki tüm sekmeler/bilgiler aynı eleman üzerinde çalışmaya devam eder.
  html=html.replace(/<\/body>/i,'<script data-portfolio-fullscreen-stable="20261005-v1" src="/portfolio-fullscreen-stable.js?v=20261005-1"></script>\n</body>');

  return html;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;

    if(request.method==='GET'&&path==='/portfolio-fullscreen-stable.js'){
      const asset=await env.ASSETS.fetch(request);
      const headers=new Headers(asset.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }

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
