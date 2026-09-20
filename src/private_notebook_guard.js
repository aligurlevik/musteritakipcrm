import worker from './quick_request_page_clean_edit_v2.js';

const encoder=new TextEncoder();
const lockSchemas=new WeakMap();

function json(data,status=200,extraHeaders={}){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extraHeaders}});
}

async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,encoder.encode(value));
  return [...new Uint8Array(signature)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

function safeEqual(left,right){
  left=String(left||'');right=String(right||'');
  let different=left.length^right.length;
  for(let index=0;index<Math.max(left.length,right.length);index++)different|=(left.charCodeAt(index)||0)^(right.charCodeAt(index)||0);
  return different===0;
}

function cookieValue(request,name){
  const match=(request.headers.get('cookie')||'').match(new RegExp('(?:^|;\\s*)'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'=([^;]*)'));
  if(!match)return '';
  try{return decodeURIComponent(match[1])}catch{return ''}
}

async function isAdmin(request,env){
  const day=new Date().toISOString().slice(0,10),value='admin.'+day;
  const expected=value+'.'+await hmac(env.SESSION_SECRET||'change-me',value);
  return safeEqual(cookieValue(request,'crm_session'),expected);
}

function notebookNo(value){return Math.max(1,Math.min(3,Math.trunc(Number(value))||1))}
function unlockCookieName(notebook){return 'notes_page_unlock_'+notebook}
async function sessionHash(request,env,notebook){
  const token=cookieValue(request,unlockCookieName(notebook));
  if(!/^[a-f0-9]{64}$/.test(token))return '';
  return hmac(env.SESSION_SECRET,'private-session:'+notebook+':'+cookieValue(request,'crm_session')+':'+token);
}
async function pageUnlocked(request,env,notebook){
  notebook=notebookNo(notebook);if(notebook===1)return true;
  const hash=await sessionHash(request,env,notebook);if(!hash)return false;
  await ensureLockSchema(env);
  return Boolean(await env.DB.prepare('SELECT token_hash FROM note_page_sessions WHERE token_hash=? AND notebook_no=? AND expires_at>?').bind(hash,notebook,Date.now()).first());
}

function randomSalt(){
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  return [...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function passwordHash(env,notebook,salt,password){
  return hmac(env.SESSION_SECRET||'change-me','note-page-password:'+notebook+':'+salt+':'+password);
}

async function ensureLockSchema(env){
  if(!env.SESSION_SECRET)throw new Error('Session configuration missing');
  if(!lockSchemas.has(env.DB))lockSchemas.set(env.DB,(async()=>{
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS note_page_locks(
      notebook_no INTEGER PRIMARY KEY,salt TEXT NOT NULL,password_hash TEXT NOT NULL,updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS note_page_sessions(token_hash TEXT PRIMARY KEY,notebook_no INTEGER NOT NULL,expires_at INTEGER NOT NULL)').run();
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS note_page_attempts(client_key TEXT PRIMARY KEY,failures INTEGER NOT NULL,reset_at INTEGER NOT NULL)').run();
  })().catch(error=>{lockSchemas.delete(env.DB);throw error}));
  return lockSchemas.get(env.DB);
}

async function lockRow(env,notebook){
  await ensureLockSchema(env);
  return env.DB.prepare('SELECT notebook_no,salt,password_hash FROM note_page_locks WHERE notebook_no=?').bind(notebook).first();
}

function locked(notebook){
  return json({error:'Not '+notebook+' özel alanı kilitli. Özel şifreyi girin.',code:'PAGE_LOCKED',notebook},423);
}

async function requirePageAccess(request,env,notebook){
  notebook=notebookNo(notebook);if(notebook===1)return null;
  const row=await lockRow(env,notebook);
  if(!row)return json({error:'Not '+notebook+' için özel şifre oluşturulmalı.',code:'PAGE_PASSWORD_NOT_SET',notebook},423);
  return await pageUnlocked(request,env,notebook)?null:locked(notebook);
}

async function revokeSession(request,env,notebook){
  const hash=await sessionHash(request,env,notebook);
  if(hash){await ensureLockSchema(env);await env.DB.prepare('DELETE FROM note_page_sessions WHERE token_hash=?').bind(hash).run()}
}

async function unlockedResponse(request,env,notebook,data,status=200){
  await revokeSession(request,env,notebook);
  const token=randomSalt()+randomSalt(),hash=await hmac(env.SESSION_SECRET,'private-session:'+notebook+':'+cookieValue(request,'crm_session')+':'+token);
  await env.DB.prepare('DELETE FROM note_page_sessions WHERE expires_at<=?').bind(Date.now()).run();
  await env.DB.prepare('INSERT INTO note_page_sessions(token_hash,notebook_no,expires_at) VALUES(?,?,?)').bind(hash,notebook,Date.now()+15*60*1000).run();
  return json(data,status,{'set-cookie':unlockCookieName(notebook)+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900'});
}

async function pageLockApi(request,env,url){
  if(!await isAdmin(request,env))return json({error:'Yetkisiz'},401);
  if(request.method!=='GET'&&(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)))return json({error:'Geçersiz istek.'},403);
  await ensureLockSchema(env);
  const path=url.pathname,notebook=notebookNo(url.searchParams.get('notebook'));
  if(path==='/api/notes-v3/page-lock/status'&&request.method==='GET'){
    if(notebook===1)return json({notebook:1,configured:false,unlocked:true});
    const row=await lockRow(env,notebook);
    return json({notebook,configured:Boolean(row),unlocked:Boolean(row)&&await pageUnlocked(request,env,notebook)});
  }
  let body={};if(request.method==='POST')try{body=await request.json()}catch{return json({error:'Bilgi okunamadı.'},400)}
  const selected=notebookNo(body.notebook);
  if(path==='/api/notes-v3/page-lock/set'&&request.method==='POST'){
    const password=String(body.password||'');
    if(selected===1)return json({error:'Not 1 için özel şifre kullanılmıyor.'},400);
    if(password.length<6)return json({error:'Şifre en az 6 karakter olmalı.'},400);
    if(password.length>100)return json({error:'Şifre çok uzun.'},400);
    if(await lockRow(env,selected))return json({error:'Bu özel alanın şifresi zaten oluşturulmuş.',code:'PASSWORD_ALREADY_SET'},409);
    const salt=randomSalt(),hash=await passwordHash(env,selected,salt,password);
    await env.DB.prepare('INSERT INTO note_page_locks(notebook_no,salt,password_hash,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(selected,salt,hash).run();
    return unlockedResponse(request,env,selected,{ok:true,notebook:selected,unlocked:true},201);
  }
  if(path==='/api/notes-v3/page-lock/verify'&&request.method==='POST'){
    if(selected===1)return json({ok:true,notebook:1,unlocked:true});
    const clientKey=await hmac(env.SESSION_SECRET,'private-attempt:'+selected+':'+(request.headers.get('cf-connecting-ip')||cookieValue(request,'crm_session')));
    const now=Date.now(),attempt=await env.DB.prepare('SELECT failures,reset_at FROM note_page_attempts WHERE client_key=?').bind(clientKey).first();
    if(attempt&&attempt.reset_at>now&&attempt.failures>=5)return json({error:'Çok fazla yanlış deneme. Bir dakika sonra tekrar deneyin.'},429,{'retry-after':'60'});
    const row=await lockRow(env,selected);if(!row)return json({error:'Önce bu özel alan için şifre oluşturun.',code:'PAGE_PASSWORD_NOT_SET'},404);
    if(String(body.password||'').length>100)return json({error:'Şifre çok uzun.'},400);
    const hash=await passwordHash(env,selected,String(row.salt||''),String(body.password||''));
    if(!safeEqual(hash,row.password_hash)){
      await env.DB.prepare(`INSERT INTO note_page_attempts(client_key,failures,reset_at) VALUES(?,1,?)
        ON CONFLICT(client_key) DO UPDATE SET failures=CASE WHEN reset_at<=? THEN 1 ELSE failures+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END`).bind(clientKey,now+60000,now,now).run();
      return json({error:'Şifre yanlış.'},403);
    }
    await env.DB.prepare('DELETE FROM note_page_attempts WHERE client_key=?').bind(clientKey).run();
    return unlockedResponse(request,env,selected,{ok:true,notebook:selected,unlocked:true});
  }
  if(path==='/api/notes-v3/page-lock/lock'&&request.method==='POST'){
    if(selected===1)return json({ok:true,notebook:1});
    await revokeSession(request,env,selected);
    return json({ok:true,notebook:selected});
  }
  return json({error:'Bulunamadı'},404);
}

async function noteNotebook(env,id){
  const row=await env.DB.prepare("SELECT COALESCE(notebook_no,1) notebook_no FROM agenda_entries WHERE id=?").bind(id).first();
  return row?notebookNo(row.notebook_no):1;
}

async function guardId(request,env,id){
  const notebook=await noteNotebook(env,id);
  return notebook>1?requirePageAccess(request,env,notebook):null;
}

function rebuildJson(response,data){
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','no-store');
  return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
}

async function visibleNotebooks(request,env){
  const [two,three]=await Promise.all([pageUnlocked(request,env,2),pageUnlocked(request,env,3)]);
  return new Set([1,...(two?[2]:[]),...(three?[3]:[])]);
}

async function filterAgendaResponse(response,request,env){
  if(!response.ok)return response;
  try{
    const rows=await response.json();if(!Array.isArray(rows))return rebuildJson(response,rows);
    const visible=await visibleNotebooks(request,env);
    return rebuildJson(response,rows.filter(row=>visible.has(notebookNo(row.notebook_no))));
  }catch{return json({error:'Özel alan kontrol edilemedi. Tekrar deneyin.'},503)}
}

async function filterFileList(response,request,env){
  if(!response.ok)return response;
  try{
    const rows=await response.json();if(!Array.isArray(rows)||!rows.length)return rebuildJson(response,Array.isArray(rows)?rows:[]);
    const ids=[...new Set(rows.map(row=>Number(row.agenda_id)).filter(id=>Number.isInteger(id)&&id>0))];
    if(!ids.length)return rebuildJson(response,[]);
    const placeholders=ids.map(()=>'?').join(',');
    const notes=(await env.DB.prepare(`SELECT id,COALESCE(notebook_no,1) notebook_no FROM agenda_entries WHERE id IN (${placeholders})`).bind(...ids).all()).results||[];
    const books=new Map(notes.map(note=>[Number(note.id),notebookNo(note.notebook_no)])),visible=await visibleNotebooks(request,env);
    return rebuildJson(response,rows.filter(row=>books.has(Number(row.agenda_id))&&visible.has(books.get(Number(row.agenda_id)))));
  }catch{return json({error:'Özel alan kontrol edilemedi. Tekrar deneyin.'},503)}
}

function clearPrivateCookies(response){
  const headers=new Headers(response.headers);headers.delete('content-length');
  for(const notebook of [2,3])headers.append('set-cookie',unlockCookieName(notebook)+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function serveLockAsset(request,env){
  const url=new URL(request.url);url.pathname='/notes-page-lock-patch.js';url.search='';
  const response=await env.ASSETS.fetch(new Request(url.toString(),{method:'GET',headers:request.headers})),headers=new Headers(response.headers);
  headers.set('content-type','application/javascript; charset=utf-8');headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function injectLockUi(response){
  if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  try{
    let html=await response.text();
    const notes=html.includes('<title>Notlarım</title>')||html.includes('main class="form"');
    html=html.replace(/<script\b[^>]*src=["']\/notes-page-lock-patch\.js[^"']*["'][^>]*><\/script>/g,'');
    if(notes&&!html.includes('/notes-pages-patch.js'))html=html.replace('</head>','<script src="/notes-pages-patch.js?v=20260920-1"></script>\n</head>');
    html=html.replace('</head>','<script src="/notes-page-lock-patch.js?v=20260920-1" data-private-notes="'+notes+'"></script>\n</head>');
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
    headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','no-cache, no-store, must-revalidate');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{return new Response('Sayfa yüklenemedi. Lütfen yenileyin.',{status:503,headers:{'cache-control':'no-store'}})}
}

const agendaLists=new Set(['/api/agenda','/api/agenda/day','/api/agenda/completed','/api/agenda/active','/api/agenda/reminders']);

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname;
    try{
    if(request.method==='GET'&&path==='/notes-page-lock-patch.js')return serveLockAsset(request,env);
    if(path.startsWith('/api/notes-v3/page-lock/'))return pageLockApi(request,env,url);
    if(path==='/api/logout'){
      await Promise.all([2,3].map(book=>revokeSession(request,env,book)));
      return clearPrivateCookies(await worker.fetch(request,env,ctx));
    }

    if(path==='/api/notes-v3'&&await isAdmin(request,env)){
      let notebook=1;
      if(request.method==='GET')notebook=notebookNo(url.searchParams.get('notebook'));
      else if(request.method==='POST')try{notebook=notebookNo((await request.clone().json()).notebook_no)}catch{}
      if(notebook>1){const blocked=await requirePageAccess(request,env,notebook);if(blocked)return blocked}
    }

    if(/^\/api\/(?:agenda|quick-request-file|notes-v3|mobile-voice)\/\d+(?:\/|$)/.test(path)){
      if(!await isAdmin(request,env))return json({error:'Yetkisiz'},401);
      const match=path.match(/^\/api\/(?:agenda|quick-request-file|notes-v3|mobile-voice)\/(\d+)(?:\/|$)/);
      if(match){const blocked=await guardId(request,env,Number(match[1]));if(blocked)return blocked}
    }

    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&agendaLists.has(path))return filterAgendaResponse(response,request,env);
    if(request.method==='GET'&&path==='/api/quick-request-files')return filterFileList(response,request,env);
    if(request.method==='GET'&&!path.startsWith('/api/'))return injectLockUi(response);
    if(path.startsWith('/api/')){
      const headers=new Headers(response.headers);headers.set('cache-control','no-store');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
    }catch(error){console.error('Private notebook guard failed',error?.name);return json({error:'Özel alan kontrol edilemedi. Lütfen tekrar deneyin.'},503)}
  }
};
