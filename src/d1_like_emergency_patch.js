import worker from './graphic_fast_daily_load_patch.js';

const enc = new TextEncoder();
async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sessionToken(env,role='admin'){
  const day=new Date().toISOString().slice(0,10);
  return role+'.'+day+'.'+await hmac(env.SESSION_SECRET||'change-me',role+'.'+day);
}
async function sessionRole(request,env){
  const cookie=request.headers.get('Cookie')||'';
  const m=cookie.match(/crm_session=([^;]+)/);
  if(!m)return '';
  for(const role of ['admin','graphic','tracking']) if(m[1]===await sessionToken(env,role)) return role;
  return '';
}
function hexBytes(bytes){return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function passwordHash(password,saltHex=''){
  const salt=saltHex?new Uint8Array((saltHex.match(/.{2}/g)||[]).map(x=>parseInt(x,16))):crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',enc.encode(String(password)),{name:'PBKDF2'},false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},key,256);
  return {salt:hexBytes(salt),hash:hexBytes(new Uint8Array(bits))};
}
async function passwordMatches(password,row){
  if(!row)return false;
  const check=await passwordHash(password,row.salt);
  return check.hash===String(row.password_hash||'');
}
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function clean(rows){return (rows||[]).map(x=>({...x,description:String(x.description||'').toLocaleLowerCase('tr-TR').includes('yapıldı')?'':x.description}))}

async function safeLogin(request,env){
  let b={};try{b=await request.json()}catch{}
  const requestedRole=b.user==='Çağatay'?'graphic':b.user==='Recep'?'tracking':'admin';
  let saved=null;
  try{saved=await env.DB.prepare('SELECT salt,password_hash FROM user_passwords WHERE role=?').bind(requestedRole).first()}catch{}
  const fallback=requestedRole==='admin'?env.ADMIN_PASSWORD:requestedRole==='graphic'?(env.CAGATAY_PASSWORD||'4444'):(env.RECEP_PASSWORD||'3333');
  const valid=saved?await passwordMatches(b.password,saved):Boolean(fallback&&b.password===fallback);
  if(!valid)return json({error:'Şifre hatalı'},401);
  const token=await sessionToken(env,requestedRole);
  return json({ok:true,role:requestedRole,user:requestedRole==='admin'?'Ali':requestedRole==='graphic'?'Çağatay':'Recep'},200,{'set-cookie':`crm_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`});
}

async function safeGraphicGet(request,env){
  const role=await sessionRole(request,env);
  if(!role)return json({error:'Yetkisiz'},401);
  if(role==='tracking')return json({error:'Yetkisiz'},403);
  const url=new URL(request.url);
  const visibleDate=url.searchParams.get('visible_date');
  const search=String(url.searchParams.get('search')||'').trim();
  const upcomingFrom=url.searchParams.get('upcoming_from'),upcomingTo=url.searchParams.get('upcoming_to');
  const workFrom=url.searchParams.get('work_from'),workTo=url.searchParams.get('work_to');
  const createdFrom=url.searchParams.get('created_from'),createdTo=url.searchParams.get('created_to');
  const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10);
  let result;
  if(upcomingFrom&&upcomingTo){
    result=await env.DB.prepare("SELECT * FROM graphic_jobs WHERE delivery_date>=? AND delivery_date<=? AND status NOT IN ('Tamamlandı','Bitti','İptal') ORDER BY delivery_date,id").bind(upcomingFrom,upcomingTo).all();
  }else if(workFrom&&workTo){
    result=await env.DB.prepare('SELECT * FROM graphic_jobs WHERE work_date>=? AND work_date<=? ORDER BY work_date,id').bind(workFrom,workTo).all();
  }else if(createdFrom&&createdTo){
    if(role==='graphic')return json([]);
    result=await env.DB.prepare("SELECT *,date(created_at,'+3 hours') created_date FROM graphic_jobs WHERE date(created_at,'+3 hours')>=? AND date(created_at,'+3 hours')<=? ORDER BY created_at,id").bind(createdFrom,createdTo).all();
  }else if(search){
    result=await env.DB.prepare("SELECT * FROM graphic_jobs WHERE instr(lower(job_no),lower(?))>0 OR instr(lower(customer_name),lower(?))>0 OR instr(lower(description),lower(?))>0 ORDER BY work_date DESC,id DESC").bind(search,search,search).all();
  }else if(visibleDate){
    result=await env.DB.prepare("SELECT *,date(created_at,'+3 hours') created_date FROM graphic_jobs WHERE work_date=? OR date(created_at,'+3 hours')=? ORDER BY CASE WHEN work_date=? THEN 0 ELSE 1 END,id DESC").bind(visibleDate,visibleDate,visibleDate).all();
  }else{
    result=await env.DB.prepare('SELECT * FROM graphic_jobs WHERE work_date=? ORDER BY id DESC').bind(date).all();
  }
  return json(clean(result.results));
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==='POST'&&url.pathname==='/api/login') return safeLogin(request,env);
    if(request.method==='GET'&&url.pathname==='/api/graphic-jobs'){
      try{return await safeGraphicGet(request,env)}catch(error){
        return json({error:'Grafik işleri okunamadı: '+String(error?.message||error)},500);
      }
    }
    return worker.fetch(request,env,ctx);
  }
};
