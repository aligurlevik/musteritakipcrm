import worker from './portfolio_api_recovery_entry.js';
import {CLEAN_PORTFOLIO_HTML} from './portfolio_clean_page.js';
import {restorePortfolioCustomers} from './restore_portfolio_customers.js';

const enc=new TextEncoder();

async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function sessionRole(request,env){
  const cookie=request.headers.get('Cookie')||'';
  const match=cookie.match(/crm_session=([^;]+)/);
  if(!match)return '';
  const day=new Date().toISOString().slice(0,10);
  for(const role of ['admin','graphic','tracking']){
    const raw=role+'.'+day;
    const token=raw+'.'+await hmac(env.SESSION_SECRET||'change-me',raw);
    if(match[1]===token)return role;
  }
  return '';
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-cache, no-store, must-revalidate',
      'x-crm-portfolio-api':'direct-v1'
    }
  });
}

function cleanResponse(){
  return new Response(CLEAN_PORTFOLIO_HTML,{
    status:200,
    headers:{
      'content-type':'text/html; charset=utf-8',
      'cache-control':'no-cache, no-store, must-revalidate',
      'x-crm-portfolio-screen':'clean-v3-inline'
    }
  });
}

async function directBootstrap(env){
  await restorePortfolioCustomers(env);

  const customersResult=await env.DB.prepare(`
    SELECT *
    FROM customers
    WHERE COALESCE(record_status,'Aktif')<>'Silindi'
    ORDER BY CASE priority
      WHEN 'KRİTİK' THEN 1
      WHEN 'YÜKSEK' THEN 2
      WHEN 'NORMAL' THEN 3
      ELSE 4
    END, company COLLATE NOCASE
  `).all();

  let meetings=[];
  try{
    const meetingResult=await env.DB.prepare(`
      SELECT m.*
      FROM meetings m
      LEFT JOIN customers c ON c.id=m.customer_id
      WHERE COALESCE(c.record_status,'Aktif')<>'Silindi'
      ORDER BY COALESCE(m.meeting_date,m.created_at) DESC
    `).all();
    meetings=meetingResult.results||[];
  }catch(error){
    console.warn('portfolio bootstrap meetings skipped',error?.message||error);
  }

  return {
    customers:customersResult.results||[],
    meetings
  };
}

async function directHistory(customerId,env){
  await restorePortfolioCustomers(env);
  const customer=await env.DB.prepare(
    "SELECT * FROM customers WHERE id=? AND COALESCE(record_status,'Aktif')<>'Silindi'"
  ).bind(customerId).first();
  if(!customer)return null;

  let meetings=[],mails=[],offers=[];
  try{
    const result=await env.DB.prepare(
      'SELECT * FROM meetings WHERE customer_id=? ORDER BY meeting_no ASC,COALESCE(meeting_date,created_at) ASC'
    ).bind(customerId).all();
    meetings=result.results||[];
  }catch(_){}
  try{
    const result=await env.DB.prepare(
      'SELECT * FROM mails WHERE customer_id=? ORDER BY COALESCE(mail_date,created_at) DESC'
    ).bind(customerId).all();
    mails=result.results||[];
  }catch(_){}
  try{
    const result=await env.DB.prepare(
      'SELECT * FROM offers WHERE customer_id=? ORDER BY COALESCE(offer_date,created_at) DESC'
    ).bind(customerId).all();
    offers=result.results||[];
  }catch(_){}

  return {customer,meetings,mails,offers};
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'){
      return cleanResponse();
    }

    if(request.method==='GET'&&url.pathname==='/api/portfolio-bootstrap'){
      const role=await sessionRole(request,env);
      if(role!=='admin')return json({error:'Yetkisiz'},401);
      try{
        return json(await directBootstrap(env));
      }catch(error){
        console.error('portfolio bootstrap failed',error?.stack||error);
        return json({error:'Portföy verisi yüklenemedi: '+String(error?.message||error)},500);
      }
    }

    const historyMatch=request.method==='GET'
      ?url.pathname.match(/^\/api\/customers\/(\d+)\/history$/)
      :null;
    if(historyMatch){
      const role=await sessionRole(request,env);
      if(role!=='admin')return json({error:'Yetkisiz'},401);
      try{
        const data=await directHistory(Number(historyMatch[1]),env);
        return data?json(data):json({error:'Müşteri bulunamadı'},404);
      }catch(error){
        console.error('portfolio history failed',error?.stack||error);
        return json({error:'Müşteri geçmişi yüklenemedi.'},500);
      }
    }

    return worker.fetch(request,env,ctx);
  },

  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function'){
      return worker.scheduled(controller,env,ctx);
    }
  }
};
