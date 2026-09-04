import worker from './mobile_agenda_redirect_patch.js';

const enc=new TextEncoder();
const NOTE_TYPES=new Set(['Genel Not','Toplantı','Özel Not']);

async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sessionRole(request,env){
  const cookie=request.headers.get('Cookie')||'';
  const m=cookie.match(/crm_session=([^;]+)/);
  if(!m)return '';
  const day=new Date().toISOString().slice(0,10);
  for(const role of ['admin','graphic','tracking']){
    const token=role+'.'+day+'.'+await hmac(env.SESSION_SECRET||'change-me',role+'.'+day);
    if(m[1]===token)return role;
  }
  return '';
}
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
async function requestBody(request){try{return await request.json()}catch{return {}}}
function todayTR(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function cleanType(value){const t=String(value||'Genel Not').trim();return NOTE_TYPES.has(t)?t:'Genel Not'}
function cleanText(value,max=12000){return String(value??'').trim().slice(0,max)}

let notesSchemaPromise;
async function tableColumns(env,table){
  const r=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((r.results||[]).map(x=>x.name));
}
async function ensureColumn(env,table,name,def){const cols=await tableColumns(env,table);if(!cols.has(name))await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`).run()}
async function ensureNotesSchema(env){
  if(notesSchemaPromise)return notesSchemaPromise;
  notesSchemaPromise=(async()=>{
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agenda_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, entry_date TEXT NOT NULL, sort_order INTEGER DEFAULT 1,
      note TEXT NOT NULL, remind_at TEXT DEFAULT '', reminder_status TEXT DEFAULT '',
      entry_status TEXT DEFAULT 'Yapılacak', completed_date TEXT DEFAULT '', image_data TEXT DEFAULT '',
      source_type TEXT DEFAULT 'manual', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await ensureColumn(env,'agenda_entries','source_type',"TEXT DEFAULT 'manual'");
    await ensureColumn(env,'agenda_entries','title',"TEXT DEFAULT ''");
    await ensureColumn(env,'agenda_entries','note_type',"TEXT DEFAULT 'Genel Not'");
    await ensureColumn(env,'agenda_entries','is_important','INTEGER DEFAULT 0');
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agenda_voice_notes (
      agenda_id INTEGER PRIMARY KEY,
      mime_type TEXT NOT NULL DEFAULT 'audio/webm',
      audio_base64 TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();
  })().catch(e=>{notesSchemaPromise=undefined;throw e});
  return notesSchemaPromise;
}

async function getNote(env,id){return env.DB.prepare("SELECT * FROM agenda_entries WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(id).first()}

async function handleNotesApi(request,env,url){
  const role=await sessionRole(request,env);
  if(role!=='admin')return json({error:'Yetkisiz'},401);
  await ensureNotesSchema(env);
  const path=url.pathname;

  if(path==='/api/notes-v3'&&request.method==='GET'){
    const scope=String(url.searchParams.get('scope')||'active');
    let where="COALESCE(a.source_type,'manual')='manual'";
    if(scope==='archive')where+=" AND COALESCE(a.entry_status,'Yapılacak')='Yapıldı'";
    else if(scope!=='all')where+=" AND COALESCE(a.entry_status,'Yapılacak')<>'Yapıldı'";
    const rows=(await env.DB.prepare(`SELECT a.*,CASE WHEN v.agenda_id IS NULL THEN 0 ELSE 1 END AS has_voice
      FROM agenda_entries a LEFT JOIN agenda_voice_notes v ON v.agenda_id=a.id
      WHERE ${where}
      ORDER BY COALESCE(a.is_important,0) DESC, a.id DESC LIMIT 1200`).all()).results||[];
    return json(rows);
  }

  if(path==='/api/notes-v3'&&request.method==='POST'){
    const b=await requestBody(request),note=cleanText(b.note);
    if(!note)return json({error:'Not boş olamaz.'},400);
    const title=cleanText(b.title,160),type=cleanType(b.note_type),entryDate=String(b.entry_date||todayTR()).slice(0,10),remindAt=cleanText(b.remind_at,40),important=b.is_important?1:0;
    const last=await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0) n FROM agenda_entries WHERE COALESCE(source_type,'manual')='manual' AND entry_date=?").bind(entryDate).first();
    const r=await env.DB.prepare(`INSERT INTO agenda_entries(entry_date,sort_order,note,remind_at,reminder_status,entry_status,completed_date,image_data,source_type,title,note_type,is_important)
      VALUES(?,?,?,?,?,'Yapılacak','','','manual',?,?,?)`)
      .bind(entryDate,Number(last?.n||0)+1,note,remindAt,remindAt?'Açık':'',title,type,important).run();
    return json({ok:true,id:r.meta.last_row_id},201);
  }

  const item=path.match(/^\/api\/notes-v3\/(\d+)$/);
  if(item&&request.method==='PUT'){
    const id=Number(item[1]),old=await getNote(env,id);if(!old)return json({error:'Not bulunamadı.'},404);
    const b=await requestBody(request);
    const title=b.title===undefined?String(old.title||''):cleanText(b.title,160);
    const note=b.note===undefined?String(old.note||''):cleanText(b.note);
    if(!note)return json({error:'Not boş olamaz.'},400);
    const type=b.note_type===undefined?cleanType(old.note_type):cleanType(b.note_type);
    const remindAt=b.remind_at===undefined?String(old.remind_at||''):cleanText(b.remind_at,40);
    const entryDate=b.entry_date===undefined?String(old.entry_date||todayTR()).slice(0,10):String(b.entry_date||todayTR()).slice(0,10);
    const important=b.is_important===undefined?Number(old.is_important||0):(b.is_important?1:0);
    let reminderStatus=String(old.reminder_status||'');
    if(b.remind_at!==undefined)reminderStatus=remindAt?'Açık':'';
    await env.DB.prepare('UPDATE agenda_entries SET title=?,note_type=?,note=?,entry_date=?,remind_at=?,reminder_status=?,is_important=? WHERE id=?')
      .bind(title,type,note,entryDate,remindAt,reminderStatus,important,id).run();
    return json({ok:true});
  }
  if(item&&request.method==='DELETE'){
    const id=Number(item[1]);
    await env.DB.prepare('DELETE FROM agenda_voice_notes WHERE agenda_id=?').bind(id).run();
    await env.DB.prepare("DELETE FROM agenda_entries WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(id).run();
    return json({ok:true});
  }

  const done=path.match(/^\/api\/notes-v3\/(\d+)\/done$/);
  if(done&&request.method==='POST'){
    await env.DB.prepare("UPDATE agenda_entries SET entry_status='Yapıldı',completed_date=?,reminder_status=CASE WHEN COALESCE(remind_at,'')<>'' THEN 'Tamamlandı' ELSE reminder_status END WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(todayTR(),Number(done[1])).run();
    return json({ok:true});
  }
  const undo=path.match(/^\/api\/notes-v3\/(\d+)\/undo$/);
  if(undo&&request.method==='POST'){
    await env.DB.prepare("UPDATE agenda_entries SET entry_status='Yapılacak',completed_date='',reminder_status=CASE WHEN COALESCE(remind_at,'')<>'' THEN 'Açık' ELSE '' END WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(Number(undo[1])).run();
    return json({ok:true});
  }
  const fired=path.match(/^\/api\/notes-v3\/(\d+)\/alarm-fired$/);
  if(fired&&request.method==='POST'){
    await env.DB.prepare("UPDATE agenda_entries SET reminder_status='Çaldı' WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(Number(fired[1])).run();
    return json({ok:true});
  }
  return json({error:'Bulunamadı'},404);
}

async function serveAsset(request,env,pathname){
  const u=new URL(request.url);u.pathname=pathname;u.search='';
  const res=await env.ASSETS.fetch(new Request(u.toString(),{method:'GET',headers:request.headers}));
  const h=new Headers(res.headers);h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/api/notes-v3'||path.startsWith('/api/notes-v3/')){
      try{return await handleNotesApi(request,env,url)}catch(err){console.error(err);return json({error:err?.message||String(err)},500)}
    }
    if(request.method==='GET'&&['/notlar-v2','/notlar-v2/','/notlar-v2.html'].includes(path))return serveAsset(request,env,'/notlar-v2.html');
    if(request.method==='GET'&&['/yeni-not','/yeni-not/','/yeni-not.html'].includes(path))return serveAsset(request,env,'/yeni-not.html');
    return worker.fetch(request,env,ctx);
  }
};
