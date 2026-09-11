import worker from './blank_price_edit_fix.js';

const enc=new TextEncoder();
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
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function body(request){try{return await request.json()}catch{return {}}}
function todayTR(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
const clean=(v,n=12000)=>String(v??'').trim().slice(0,n);
function color(v,fallback){const s=String(v||'').trim();return /^#[0-9a-fA-F]{6}$/.test(s)?s:fallback}
function notebookNo(v){return Math.max(1,Math.min(3,Number(v)||1))}

let schemaPromise;
async function columns(env,t){const r=await env.DB.prepare(`PRAGMA table_info(${t})`).all();return new Set((r.results||[]).map(x=>x.name))}
async function ensureCol(env,t,n,d){const c=await columns(env,t);if(!c.has(n))await env.DB.prepare(`ALTER TABLE ${t} ADD COLUMN ${n} ${d}`).run()}
async function ensureSchema(env){
  if(schemaPromise)return schemaPromise;
  schemaPromise=(async()=>{
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agenda_entries(
      id INTEGER PRIMARY KEY AUTOINCREMENT,entry_date TEXT NOT NULL,sort_order INTEGER DEFAULT 1,
      note TEXT NOT NULL,remind_at TEXT DEFAULT '',reminder_status TEXT DEFAULT '',entry_status TEXT DEFAULT 'Yapılacak',
      completed_date TEXT DEFAULT '',image_data TEXT DEFAULT '',source_type TEXT DEFAULT 'manual',created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();
    for(const [n,d] of [
      ['source_type',"TEXT DEFAULT 'manual'"],['title',"TEXT DEFAULT ''"],['note_type',"TEXT DEFAULT 'Genel Not'"],
      ['is_important','INTEGER DEFAULT 0'],['is_archived','INTEGER DEFAULT 0'],['is_locked','INTEGER DEFAULT 0'],
      ['text_color',"TEXT DEFAULT '#101828'"],['bg_color',"TEXT DEFAULT '#fffdf1'"],['notebook_no','INTEGER DEFAULT 1']
    ])await ensureCol(env,'agenda_entries',n,d);
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agenda_voice_notes(
      agenda_id INTEGER PRIMARY KEY,mime_type TEXT NOT NULL DEFAULT 'audio/webm',audio_base64 TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();
  })().catch(e=>{schemaPromise=undefined;throw e});
  return schemaPromise;
}
async function getNote(env,id){return env.DB.prepare("SELECT * FROM agenda_entries WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(id).first()}
async function unlocked(env,id){const n=await getNote(env,id);if(!n)return{err:json({error:'Not bulunamadı.'},404)};if(Number(n.is_locked||0))return{err:json({error:'Not kilitli. Önce kilidi açın.'},423)};return{n}}

async function notesApi(request,env,url){
  if(await sessionRole(request,env)!=='admin')return json({error:'Yetkisiz'},401);
  await ensureSchema(env);
  const p=url.pathname;
  if(p==='/api/notes-v3'&&request.method==='GET'){
    const scope=url.searchParams.get('scope')||'all',notebook=notebookNo(url.searchParams.get('notebook'));
    await env.DB.prepare("UPDATE agenda_entries SET is_archived=1 WHERE COALESCE(source_type,'manual')='manual' AND COALESCE(is_archived,0)=0 AND entry_status='Yapıldı'").run();
    let w="COALESCE(a.source_type,'manual')='manual' AND COALESCE(a.notebook_no,1)="+notebook;
    w+=scope==='archive'?" AND COALESCE(a.is_archived,0)=1":" AND COALESCE(a.is_archived,0)=0";
    const rows=(await env.DB.prepare(`SELECT a.*,CASE WHEN v.agenda_id IS NULL THEN 0 ELSE 1 END has_voice
      FROM agenda_entries a LEFT JOIN agenda_voice_notes v ON v.agenda_id=a.id WHERE ${w}
      ORDER BY CASE WHEN COALESCE(a.entry_status,'Yapılacak')='Yapıldı' THEN 1 ELSE 0 END ASC,
      COALESCE(a.is_important,0) DESC,COALESCE(a.is_locked,0) DESC,a.id DESC LIMIT 1200`).all()).results||[];
    return json(rows);
  }
  if(p==='/api/notes-v3'&&request.method==='POST'){
    const b=await body(request),note=clean(b.note);
    if(!note)return json({error:'Not boş olamaz.'},400);
    const d=String(b.entry_date||todayTR()).slice(0,10),rem=clean(b.remind_at,40),tc=color(b.text_color,'#101828'),bc=color(b.bg_color,'#fffdf1'),important=b.is_important?1:0,notebook=notebookNo(b.notebook_no),title=clean(b.title,120);
    const last=await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0) n FROM agenda_entries WHERE COALESCE(source_type,'manual')='manual' AND entry_date=? AND COALESCE(notebook_no,1)=?").bind(d,notebook).first();
    const r=await env.DB.prepare(`INSERT INTO agenda_entries(entry_date,sort_order,note,remind_at,reminder_status,entry_status,completed_date,image_data,source_type,title,note_type,is_important,is_archived,is_locked,text_color,bg_color,notebook_no)
      VALUES(?,?,?,?,?,'Yapılacak','','','manual',?,'Genel Not',?,0,0,?,?,?)`).bind(d,Number(last?.n||0)+1,note,rem,rem?'Açık':'',title,important,tc,bc,notebook).run();
    return json({ok:true,id:r.meta.last_row_id},201);
  }
  const item=p.match(/^\/api\/notes-v3\/(\d+)$/);
  if(item&&request.method==='PUT'){
    const id=+item[1],u=await unlocked(env,id);if(u.err)return u.err;
    const b=await body(request),note=b.note===undefined?u.n.note:clean(b.note);if(!note)return json({error:'Not boş olamaz.'},400);
    const rem=b.remind_at===undefined?String(u.n.remind_at||''):clean(b.remind_at,40),rs=b.remind_at===undefined?String(u.n.reminder_status||''):(rem?'Açık':''),tc=b.text_color===undefined?color(u.n.text_color,'#101828'):color(b.text_color,'#101828'),bc=b.bg_color===undefined?color(u.n.bg_color,'#fffdf1'):color(b.bg_color,'#fffdf1');
    await env.DB.prepare('UPDATE agenda_entries SET note=?,remind_at=?,reminder_status=?,text_color=?,bg_color=? WHERE id=?').bind(note,rem,rs,tc,bc,id).run();
    return json({ok:true});
  }
  if(item&&request.method==='DELETE'){
    const id=+item[1],u=await unlocked(env,id);if(u.err)return u.err;
    await env.DB.prepare('DELETE FROM agenda_voice_notes WHERE agenda_id=?').bind(id).run();
    await env.DB.prepare("DELETE FROM agenda_entries WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(id).run();
    return json({ok:true});
  }
  for(const [name,val] of [['archive',1],['unarchive',0]]){
    const m=p.match(new RegExp('^/api/notes-v3/(\\d+)/'+name+'$'));
    if(m&&request.method==='POST'){
      const id=+m[1],u=await unlocked(env,id);if(u.err)return u.err;
      if(val)await env.DB.prepare('UPDATE agenda_entries SET is_archived=1 WHERE id=?').bind(id).run();
      else await env.DB.prepare("UPDATE agenda_entries SET is_archived=0,entry_status='Yapılacak',completed_date='' WHERE id=?").bind(id).run();
      return json({ok:true});
    }
  }
  const im=p.match(/^\/api\/notes-v3\/(\d+)\/(important|unimportant)$/);
  if(im&&request.method==='POST'){await env.DB.prepare("UPDATE agenda_entries SET is_important=? WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(im[2]==='important'?1:0,+im[1]).run();return json({ok:true})}
  const lm=p.match(/^\/api\/notes-v3\/(\d+)\/(lock|unlock)$/);
  if(lm&&request.method==='POST'){await env.DB.prepare("UPDATE agenda_entries SET is_locked=? WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(lm[2]==='lock'?1:0,+lm[1]).run();return json({ok:true})}
  const dm=p.match(/^\/api\/notes-v3\/(\d+)\/(done|undo)$/);
  if(dm&&request.method==='POST'){const done=dm[2]==='done';await env.DB.prepare(`UPDATE agenda_entries SET entry_status=?,completed_date=?,is_archived=?,reminder_status=CASE WHEN COALESCE(remind_at,'')<>'' THEN ? ELSE reminder_status END WHERE id=? AND COALESCE(source_type,'manual')='manual'`).bind(done?'Yapıldı':'Yapılacak',done?todayTR():'',done?1:0,done?'Tamamlandı':'Açık',+dm[1]).run();return json({ok:true})}
  const fm=p.match(/^\/api\/notes-v3\/(\d+)\/alarm-fired$/);
  if(fm&&request.method==='POST'){await env.DB.prepare("UPDATE agenda_entries SET reminder_status='Çaldı' WHERE id=?").bind(+fm[1]).run();return json({ok:true})}
  return json({error:'Bulunamadı'},404);
}

function decodeBase64(value){const bin=atob(value),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
async function voiceApi(request,env,url){
  if(await sessionRole(request,env)!=='admin')return json({error:'Yetkisiz'},401);
  await ensureSchema(env);
  const m=url.pathname.match(/^\/api\/mobile-voice\/(\d+)$/);if(!m)return json({error:'Bulunamadı'},404);
  const id=+m[1];
  if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT mime_type,audio_base64 FROM agenda_voice_notes WHERE agenda_id=?').bind(id).first();
    if(!row)return new Response('Ses kaydı bulunamadı',{status:404});
    return new Response(decodeBase64(String(row.audio_base64||'')),{status:200,headers:{'content-type':row.mime_type||'audio/webm','cache-control':'private, max-age=60'}});
  }
  if(request.method==='POST'){
    const b=await body(request),data=String(b.audio_data||''),match=data.match(/^data:(audio\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
    if(!match)return json({error:'Ses kaydı geçersiz.'},400);
    if(match[2].length>1800000)return json({error:'Ses kaydı çok uzun.'},413);
    const note=await getNote(env,id);if(!note)return json({error:'Not bulunamadı.'},404);
    await env.DB.prepare(`INSERT INTO agenda_voice_notes(agenda_id,mime_type,audio_base64,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(agenda_id) DO UPDATE SET mime_type=excluded.mime_type,audio_base64=excluded.audio_base64,updated_at=CURRENT_TIMESTAMP`).bind(id,match[1],match[2]).run();
    return json({ok:true,has_voice:true});
  }
  if(request.method==='DELETE'){await env.DB.prepare('DELETE FROM agenda_voice_notes WHERE agenda_id=?').bind(id).run();return json({ok:true})}
  return json({error:'Geçersiz işlem.'},405);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),p=url.pathname;
    if(p==='/api/notes-v3'||p.startsWith('/api/notes-v3/')){try{return await notesApi(request,env,url)}catch(e){console.error(e);return json({error:e?.message||String(e)},500)}}
    if(p.startsWith('/api/mobile-voice/')){try{return await voiceApi(request,env,url)}catch(e){console.error(e);return json({error:e?.message||String(e)},500)}}
    return worker.fetch(request,env,ctx);
  }
};
