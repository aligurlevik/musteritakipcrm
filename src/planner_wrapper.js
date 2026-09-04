import worker from './note_page_lock_wrapper.js';

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
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
async function body(request){try{return await request.json()}catch{return {}}}
function clean(v,n=12000){return String(v??'').trim().slice(0,n)}
function todayTR(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function validType(v){const s=String(v||'Genel Not');return ['Genel Not','Hatırlatıcı','Görev','Doğum Günü'].includes(s)?s:'Genel Not'}
async function columns(env,t){const r=await env.DB.prepare(`PRAGMA table_info(${t})`).all();return new Set((r.results||[]).map(x=>x.name))}
async function ensureCol(env,t,n,d){const c=await columns(env,t);if(!c.has(n))await env.DB.prepare(`ALTER TABLE ${t} ADD COLUMN ${n} ${d}`).run()}
let schemaPromise;
async function ensureSchema(env){
  if(schemaPromise)return schemaPromise;
  schemaPromise=(async()=>{
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agenda_entries(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL,
      sort_order INTEGER DEFAULT 1,
      note TEXT NOT NULL,
      remind_at TEXT DEFAULT '',
      reminder_status TEXT DEFAULT '',
      entry_status TEXT DEFAULT 'Yapılacak',
      completed_date TEXT DEFAULT '',
      image_data TEXT DEFAULT '',
      source_type TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();
    for(const [n,d] of [
      ['source_type',"TEXT DEFAULT 'manual'"],['title',"TEXT DEFAULT ''"],['note_type',"TEXT DEFAULT 'Genel Not'"],
      ['is_important','INTEGER DEFAULT 0'],['is_archived','INTEGER DEFAULT 0'],['is_locked','INTEGER DEFAULT 0'],
      ['text_color',"TEXT DEFAULT '#101828'"],['bg_color',"TEXT DEFAULT '#fffdf1'"],['notebook_no','INTEGER DEFAULT 1']
    ])await ensureCol(env,'agenda_entries',n,d);
  })().catch(e=>{schemaPromise=undefined;throw e});
  return schemaPromise;
}
async function plannerApi(request,env,url){
  if(await sessionRole(request,env)!=='admin')return json({error:'Yetkisiz'},401);
  await ensureSchema(env);
  if(url.pathname==='/api/planner'&&request.method==='POST'){
    const b=await body(request),note=clean(b.note),title=clean(b.title,160),type=validType(b.note_type);
    if(!note&&!title)return json({error:'Başlık veya not yazmalısınız.'},400);
    const d=/^\d{4}-\d{2}-\d{2}$/.test(String(b.entry_date||''))?String(b.entry_date):todayTR();
    const rem=clean(b.remind_at,40);
    const text=note||title;
    const last=await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0) n FROM agenda_entries WHERE COALESCE(source_type,'manual')='manual' AND entry_date=? AND COALESCE(notebook_no,1)=1").bind(d).first();
    const r=await env.DB.prepare(`INSERT INTO agenda_entries(entry_date,sort_order,note,remind_at,reminder_status,entry_status,completed_date,image_data,source_type,title,note_type,is_important,is_archived,is_locked,text_color,bg_color,notebook_no)
      VALUES(?,?,?,?,?,'Yapılacak','','','manual',?,?,0,0,0,'#101828','#fffdf1',1)`)
      .bind(d,Number(last?.n||0)+1,text,rem,rem?'Açık':'',title,type).run();
    return json({ok:true,id:r.meta.last_row_id},201);
  }
  const m=url.pathname.match(/^\/api\/planner\/(\d+)$/);
  if(m&&request.method==='PUT'){
    const id=Number(m[1]);
    const old=await env.DB.prepare("SELECT * FROM agenda_entries WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(id).first();
    if(!old)return json({error:'Kayıt bulunamadı.'},404);
    if(Number(old.is_locked||0))return json({error:'Not kilitli. Önce kilidi açın.'},423);
    const b=await body(request);
    const title=b.title===undefined?String(old.title||''):clean(b.title,160);
    const note=b.note===undefined?String(old.note||''):clean(b.note);
    const type=b.note_type===undefined?validType(old.note_type):validType(b.note_type);
    const d=b.entry_date===undefined?String(old.entry_date||todayTR()):(/^\d{4}-\d{2}-\d{2}$/.test(String(b.entry_date))?String(b.entry_date):String(old.entry_date||todayTR()));
    const rem=b.remind_at===undefined?String(old.remind_at||''):clean(b.remind_at,40);
    const text=note||title;
    if(!text)return json({error:'Başlık veya not yazmalısınız.'},400);
    await env.DB.prepare(`UPDATE agenda_entries SET entry_date=?,note=?,title=?,note_type=?,remind_at=?,reminder_status=CASE WHEN ?<>'' THEN 'Açık' ELSE '' END WHERE id=?`)
      .bind(d,text,title,type,rem,rem,id).run();
    return json({ok:true});
  }
  return json({error:'Bulunamadı'},404);
}
function assetRequest(request,path){const u=new URL(request.url);u.pathname=path;u.search='';return new Request(u.toString(),{method:'GET',headers:request.headers,redirect:'manual'})}
async function servePlanner(request,env){
  let r=await env.ASSETS.fetch(assetRequest(request,'/planlama.html'));
  const h=new Headers(r.headers);h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
}
async function injectPlannerButton(response){
  if(!response.ok)return response;
  const ct=response.headers.get('content-type')||'';if(!ct.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('id="plannerNavBtn"')){
    const css='<style id="plannerNavCss">#plannerNavBtn{border:0;border-radius:10px;padding:9px 12px;background:#1769c2;color:#fff;font-weight:950;text-decoration:none;white-space:nowrap}.toprow>div:last-child{display:flex;gap:7px;align-items:center}@media(max-width:430px){#plannerNavBtn{padding:9px 9px;font-size:13px}}</style>';
    html=html.replace('</head>',css+'</head>');
    html=html.replace('<button class="newbtn" onclick="location.href=\'/yeni-not.html\'">＋ Yeni Not</button>','<div><a id="plannerNavBtn" href="/planlama.html">📅 Planlama</a><button class="newbtn" onclick="location.href=\'/yeni-not.html\'">＋ Yeni Not</button></div>');
  }
  const h=new Headers(response.headers);h.set('content-type','text/html; charset=utf-8');h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}
export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),p=url.pathname;
    if(p==='/api/planner'||p.startsWith('/api/planner/')){try{return await plannerApi(request,env,url)}catch(e){console.error(e);return json({error:e?.message||String(e)},500)}}
    if(request.method==='GET'&&['/planlama','/planlama/','/planlama.html'].includes(p))return servePlanner(request,env);
    if(request.method==='GET'&&['/notlar-v2','/notlar-v2/','/notlar-v2.html'].includes(p))return injectPlannerButton(await worker.fetch(request,env,ctx));
    return worker.fetch(request,env,ctx);
  }
};
