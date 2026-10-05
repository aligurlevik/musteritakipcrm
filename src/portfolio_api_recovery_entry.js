import worker from './sales_care_bridge_entry.js';
import {restorePortfolioCustomers} from './restore_portfolio_customers.js';

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-cache, no-store, must-revalidate',
    'x-crm-portfolio-recovery':'direct-d1-native-company-link-v1'
  }});
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

    return worker.fetch(request,env,ctx);
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
