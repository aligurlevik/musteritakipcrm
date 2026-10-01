import worker from './main_menu_cleanup_entry.js';
import {restorePortfolioCustomers} from './restore_portfolio_customers.js';

const encoder=new TextEncoder();

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-cache, no-store, must-revalidate','x-crm-portfolio-guard':'direct-d1-v2'}});
}

async function hmacHex(secret,value){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,encoder.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function cookieValue(request,name){
  const cookie=request.headers.get('cookie')||'';
  const match=cookie.match(new RegExp('(?:^|;\\s*)'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'=([^;]+)'));
  return match?match[1]:'';
}

function dayKey(){return new Date().toISOString().slice(0,10)}

async function portfolioRole(request,env){
  const token=cookieValue(request,'crm_session');
  if(!token)return '';
  const day=dayKey();
  for(const role of ['admin','graphic']){
    const value=role+'.'+day;
    const expected=value+'.'+await hmacHex(env.SESSION_SECRET||'change-me',value);
    if(token===expected)return role;
  }
  return '';
}

async function directCustomers(url,env){
  await restorePortfolioCustomers(env);
  const status=url.searchParams.get('status')||'Aktif';
  const q=String(url.searchParams.get('q')||'').trim();
  const category=String(url.searchParams.get('category')||'').trim();
  const result=String(url.searchParams.get('result')||'').trim();
  const where=[],vals=[];

  if(!result&&status!=='Tümü'){where.push('record_status=?');vals.push(status)}
  if(result==='Olumlu')where.push("stage='Kazanıldı'");
  else if(result==='Olumsuz')where.push("stage='Kaybedildi'");
  else if(result==='Beklemede')where.push("stage='Beklemede'");
  else if(result==='Sonuçlanmadı')where.push("COALESCE(stage,'') NOT IN ('Kazanıldı','Kaybedildi')");

  if(category){where.push('(categories LIKE ? OR sector LIKE ?)');vals.push('%'+category+'%','%'+category+'%')}
  if(q){
    where.push('(company LIKE ? OR contact_name LIKE ? OR phone LIKE ? OR email LIKE ? OR sector LIKE ? OR phones_json LIKE ? OR emails_json LIKE ?)');
    const like='%'+q+'%';
    vals.push(like,like,like,like,like,like,like);
  }

  const sql=`SELECT * FROM customers ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY CASE priority WHEN 'KRİTİK' THEN 1 WHEN 'YÜKSEK' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, company COLLATE NOCASE`;
  const rows=(await env.DB.prepare(sql).bind(...vals).all()).results||[];
  return rows.filter(x=>x&&x.record_status!=='Silindi');
}

async function directMeetings(url,env){
  await restorePortfolioCustomers(env);
  const status=url.searchParams.get('status')||'Aktif';
  let where=" WHERE c.record_status<>'Silindi'";
  if(status==='Aktif')where=" WHERE c.record_status='Aktif' AND COALESCE(m.result,'Beklemede') IN ('Olumlu','Tekrar Görüşülecek')";
  else if(status==='Bekleyen')where=" WHERE c.record_status<>'Silindi' AND COALESCE(m.result,'Beklemede')='Beklemede'";
  else if(status==='Pasif')where=" WHERE c.record_status='Pasif' OR COALESCE(m.result,'')='Olumsuz'";
  const rows=await env.DB.prepare(`SELECT m.*,c.company,c.contact_name,c.phone,c.email,c.phones_json,c.emails_json,c.record_status FROM meetings m JOIN customers c ON c.id=m.customer_id ${where} ORDER BY COALESCE(m.meeting_date,m.created_at) DESC`).all();
  return rows.results||[];
}

async function directHistory(customerId,env){
  await restorePortfolioCustomers(env);
  const customer=await env.DB.prepare('SELECT * FROM customers WHERE id=?').bind(customerId).first();
  if(!customer)return null;
  const [meetings,mails,offers]=await Promise.all([
    env.DB.prepare('SELECT * FROM meetings WHERE customer_id=? ORDER BY meeting_no ASC, COALESCE(meeting_date,created_at) ASC').bind(customerId).all(),
    env.DB.prepare('SELECT * FROM mails WHERE customer_id=? ORDER BY COALESCE(mail_date,created_at) DESC').bind(customerId).all(),
    env.DB.prepare('SELECT * FROM offers WHERE customer_id=? ORDER BY COALESCE(offer_date,created_at) DESC').bind(customerId).all()
  ]);
  return {customer,meetings:meetings.results||[],mails:mails.results||[],offers:offers.results||[]};
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname;
    const isCustomerList=request.method==='GET'&&path==='/api/customers';
    const isMeetings=request.method==='GET'&&path==='/api/meetings';
    const historyMatch=request.method==='GET'?path.match(/^\/api\/customers\/(\d+)\/history$/):null;

    // Kalıcı çözüm: portföyün üç temel okuma endpoint'i artık eski wrapper zincirinden
    // cevap almıyor. Yetkili oturum varsa doğrudan D1 okunuyor. Böylece downstream'in
    // yanlışlıkla [] / 403 / eski cache döndürmesi müşteri listesini bir daha sıfırlamaz.
    if(isCustomerList||isMeetings||historyMatch){
      const role=await portfolioRole(request,env);
      if(!role){
        // Gerçek oturum hatasının davranışını ana worker ile aynı tut.
        return worker.fetch(request,env,ctx);
      }
      try{
        if(isCustomerList)return json(await directCustomers(url,env));
        if(isMeetings)return json(await directMeetings(url,env));
        const data=await directHistory(Number(historyMatch[1]),env);
        return data?json(data):json({error:'Müşteri bulunamadı'},404);
      }catch(error){
        console.error('portfolio direct D1 read failed',error?.message||error);
        return json({error:'Müşteri verileri yüklenemedi.'},500);
      }
    }

    return worker.fetch(request,env,ctx);
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
