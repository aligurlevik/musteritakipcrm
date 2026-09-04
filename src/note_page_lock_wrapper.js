import worker from './long_voice_wrapper.js';

const enc=new TextEncoder();
async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sessionRole(request,env){
  const cookie=request.headers.get('Cookie')||'';
  const m=cookie.match(/crm_session=([^;]+)/);
  if(!m)return'';
  const day=new Date().toISOString().slice(0,10);
  for(const role of ['admin','graphic','tracking']){
    const token=role+'.'+day+'.'+await hmac(env.SESSION_SECRET||'change-me',role+'.'+day);
    if(m[1]===token)return role;
  }
  return'';
}
function json(data,status=200,headers={}){
  const h=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  for(const [k,v] of Object.entries(headers))h.set(k,v);
  return new Response(JSON.stringify(data),{status,headers:h});
}
const notebookNo=v=>Math.max(1,Math.min(3,Number(v)||1));
function cookieValue(request,name){
  const c=request.headers.get('Cookie')||'';
  const m=c.match(new RegExp('(?:^|;\\s*)'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'=([^;]*)'));
  return m?decodeURIComponent(m[1]):'';
}
function randomSalt(){
  const a=new Uint8Array(16);crypto.getRandomValues(a);
  return [...a].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function safeEqual(a,b){
  a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;
  let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;
}
async function passwordHash(env,n,salt,password){return hmac(env.SESSION_SECRET||'change-me','note-page-password:'+n+':'+salt+':'+password)}
async function unlockToken(env,n){
  const day=new Date().toISOString().slice(0,10);
  return hmac(env.SESSION_SECRET||'change-me','note-page-unlock:'+n+':'+day);
}
function unlockCookieName(n){return 'notes_page_unlock_'+n}
async function isUnlocked(request,env,n){
  if(n===1)return true;
  const got=cookieValue(request,unlockCookieName(n));if(!got)return false;
  return safeEqual(got,await unlockToken(env,n));
}
async function ensureLockSchema(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS note_page_locks(
    notebook_no INTEGER PRIMARY KEY,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}
async function lockRow(env,n){await ensureLockSchema(env);return env.DB.prepare('SELECT notebook_no,salt,password_hash FROM note_page_locks WHERE notebook_no=?').bind(n).first()}
async function requirePageAccess(request,env,n){
  if(n===1)return null;
  const row=await lockRow(env,n);
  if(!row)return json({error:'Sayfa '+n+' için ikinci şifre oluşturulmalı.',code:'PAGE_PASSWORD_NOT_SET',notebook:n},423);
  if(!await isUnlocked(request,env,n))return json({error:'Sayfa '+n+' kilitli. İkinci şifreyi girin.',code:'PAGE_LOCKED',notebook:n},423);
  return null;
}
function unlockedResponse(env,n,data,status=200){
  return unlockToken(env,n).then(token=>json(data,status,{'set-cookie':unlockCookieName(n)+'='+encodeURIComponent(token)+'; Path=/; HttpOnly; Secure; SameSite=Lax'}));
}
async function pageLockApi(request,env,url){
  if(await sessionRole(request,env)!=='admin')return json({error:'Yetkisiz'},401);
  await ensureLockSchema(env);
  const p=url.pathname;
  if(p==='/api/notes-v3/page-lock/status'&&request.method==='GET'){
    const n=notebookNo(url.searchParams.get('notebook'));
    if(n===1)return json({notebook:1,configured:false,unlocked:true});
    const row=await lockRow(env,n);
    return json({notebook:n,configured:!!row,unlocked:!!row&&await isUnlocked(request,env,n)});
  }
  if(p==='/api/notes-v3/page-lock/set'&&request.method==='POST'){
    let b={};try{b=await request.json()}catch{return json({error:'Bilgi okunamadı.'},400)}
    const n=notebookNo(b.notebook),password=String(b.password||'');
    if(n===1)return json({error:'Sayfa 1 için ikinci şifre kullanılmıyor.'},400);
    if(password.length<4)return json({error:'Şifre en az 4 karakter olmalı.'},400);
    if(password.length>100)return json({error:'Şifre çok uzun.'},400);
    const existing=await lockRow(env,n);
    if(existing)return json({error:'Bu sayfanın şifresi zaten oluşturulmuş.',code:'PASSWORD_ALREADY_SET'},409);
    const salt=randomSalt(),hash=await passwordHash(env,n,salt,password);
    await env.DB.prepare('INSERT INTO note_page_locks(notebook_no,salt,password_hash,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(n,salt,hash).run();
    return unlockedResponse(env,n,{ok:true,notebook:n,unlocked:true},201);
  }
  if(p==='/api/notes-v3/page-lock/verify'&&request.method==='POST'){
    let b={};try{b=await request.json()}catch{return json({error:'Bilgi okunamadı.'},400)}
    const n=notebookNo(b.notebook),password=String(b.password||'');
    if(n===1)return json({ok:true,notebook:1,unlocked:true});
    const row=await lockRow(env,n);if(!row)return json({error:'Önce bu sayfa için şifre oluşturun.',code:'PAGE_PASSWORD_NOT_SET'},404);
    const hash=await passwordHash(env,n,String(row.salt||''),password);
    if(!safeEqual(hash,row.password_hash))return json({error:'Şifre yanlış.'},403);
    return unlockedResponse(env,n,{ok:true,notebook:n,unlocked:true});
  }
  if(p==='/api/notes-v3/page-lock/lock'&&request.method==='POST'){
    let b={};try{b=await request.json()}catch{}
    const n=notebookNo(b.notebook);
    if(n===1)return json({ok:true});
    return json({ok:true,notebook:n},200,{'set-cookie':unlockCookieName(n)+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'});
  }
  return null;
}
async function guardedNotebook(request,env,url){
  const p=url.pathname;
  if(p==='/api/notes-v3'){
    if(request.method==='GET')return notebookNo(url.searchParams.get('notebook'));
    if(request.method==='POST'){
      try{const b=await request.clone().json();return notebookNo(b.notebook_no)}catch{return 1}
    }
  }
  const item=p.match(/^\/api\/notes-v3\/(\d+)(?:\/.*)?$/);
  if(item){
    const row=await env.DB.prepare("SELECT COALESCE(notebook_no,1) notebook_no FROM agenda_entries WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(Number(item[1])).first();
    return row?notebookNo(row.notebook_no):1;
  }
  const voice=p.match(/^\/api\/mobile-voice\/(\d+)$/);
  if(voice){
    const row=await env.DB.prepare("SELECT COALESCE(notebook_no,1) notebook_no FROM agenda_entries WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(Number(voice[1])).first();
    return row?notebookNo(row.notebook_no):1;
  }
  return 1;
}
async function servePatch(request,env){
  const u=new URL(request.url);u.pathname='/notes-page-lock-patch.js';u.search='';
  const r=await env.ASSETS.fetch(new Request(u,{method:'GET',headers:request.headers}));
  const h=new Headers(r.headers);h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
}
async function patchHtml(response){
  if(!response||response.status!==200)return response;
  const ct=response.headers.get('content-type')||'';if(!ct.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('/notes-page-lock-patch.js'))html=html.replace('</body>','<script src="/notes-page-lock-patch.js?v=20260904-1"></script></body>');
  const h=new Headers(response.headers);h.set('content-type','text/html; charset=utf-8');h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}
export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),p=url.pathname;
    if(request.method==='GET'&&p==='/notes-page-lock-patch.js')return servePatch(request,env);
    if(p.startsWith('/api/notes-v3/page-lock/')){
      const r=await pageLockApi(request,env,url);if(r)return r;
    }
    if(p==='/api/notes-v3'||/^\/api\/notes-v3\/\d+/.test(p)||/^\/api\/mobile-voice\/\d+$/.test(p)){
      if(await sessionRole(request,env)==='admin'){
        const n=await guardedNotebook(request,env,url),blocked=await requirePageAccess(request,env,n);
        if(blocked)return blocked;
      }
    }
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&['/notlar-v2','/notlar-v2/','/notlar-v2.html','/yeni-not','/yeni-not/','/yeni-not.html'].includes(p))return patchHtml(response);
    return response;
  }
};
