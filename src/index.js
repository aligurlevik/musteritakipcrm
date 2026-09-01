const enc = new TextEncoder();

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sessionToken(env, role='admin') {
  const day = new Date().toISOString().slice(0,10);
  return role + '.' + day + '.' + await hmac(env.SESSION_SECRET || 'change-me', role+'.'+day);
}
async function sessionRole(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/crm_session=([^;]+)/);
  if(!m)return '';
  for(const role of ['admin','graphic','tracking'])if(m[1]===await sessionToken(env,role))return role;
  return '';
}
const json = (data,status=200,headers={}) => new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});
async function body(request){ try{return await request.json()}catch{return {}} }
function validAgendaImage(value){const image=String(value||'');if(!image)return '';if(image.length>450000||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))return null;return image}

async function tableColumns(env, table) {
  const r = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((r.results||[]).map(x=>x.name));
}
async function ensureColumn(env, table, name, def) {
  const cols = await tableColumns(env, table);
  if (!cols.has(name)) await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`).run();
}
async function ensureSchema(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT NOT NULL, contact_name TEXT, phone TEXT, email TEXT,
    region TEXT, sector TEXT, priority TEXT DEFAULT 'NORMAL', stage TEXT DEFAULT 'Yeni Lead', follow_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, meeting_no INTEGER DEFAULT 1,
    meeting_date TEXT, note TEXT, next_follow_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, offer_no TEXT, subject TEXT,
    amount REAL DEFAULT 0, currency TEXT DEFAULT 'TRY', status TEXT DEFAULT 'Taslak', offer_date TEXT,
    follow_date TEXT, note TEXT, result_reason TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mails (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, direction TEXT, mail_date TEXT, email TEXT,
    subject TEXT, summary TEXT, follow_date TEXT, external_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agenda_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entry_date TEXT NOT NULL, sort_order INTEGER DEFAULT 1,
    note TEXT NOT NULL, remind_at TEXT DEFAULT '', reminder_status TEXT DEFAULT '',
    entry_status TEXT DEFAULT 'Yapılacak', completed_date TEXT DEFAULT '', image_data TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS graphic_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, work_date TEXT NOT NULL, job_no TEXT NOT NULL,
    customer_name TEXT NOT NULL, description TEXT DEFAULT '', quantity INTEGER DEFAULT 1, delivery_date TEXT DEFAULT '', delivery_place TEXT DEFAULT '',
    status TEXT DEFAULT 'Beklemede', note TEXT DEFAULT '', price REAL DEFAULT 0, created_by TEXT DEFAULT '', completed_by TEXT DEFAULT '', remind_at TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS graphic_job_delays (
    id INTEGER PRIMARY KEY AUTOINCREMENT, graphic_job_id INTEGER NOT NULL,
    delayed_from TEXT NOT NULL, delayed_to TEXT NOT NULL, note TEXT DEFAULT '',
    delayed_by TEXT DEFAULT 'Recep', created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  for (const [name,def] of [
    ['invoice_title',"TEXT DEFAULT ''"],['tax_office',"TEXT DEFAULT ''"],['tax_number',"TEXT DEFAULT ''"],
    ['invoice_address',"TEXT DEFAULT ''"],['record_status',"TEXT DEFAULT 'Aktif'"],
    ['special_notes',"TEXT DEFAULT ''"],['machine_info',"TEXT DEFAULT ''"],
    ['phones_json',"TEXT DEFAULT '[]'"],['emails_json',"TEXT DEFAULT '[]'"],
    ['categories',"TEXT DEFAULT ''"],['note_image_data',"TEXT DEFAULT ''"]
  ]) await ensureColumn(env,'customers',name,def);

  for (const [name,def] of [
    ['remind_at',"TEXT DEFAULT ''"],['remind_note',"TEXT DEFAULT ''"],['reminder_status',"TEXT DEFAULT ''"],
    ['result',"TEXT DEFAULT 'Beklemede'"],['result_note',"TEXT DEFAULT ''"],['participants_json',"TEXT DEFAULT '[]'"]
  ]) await ensureColumn(env,'meetings',name,def);

  await ensureColumn(env,'offers','result_reason',"TEXT DEFAULT ''");
  await ensureColumn(env,'offers','offer_text',"TEXT DEFAULT ''");
  await ensureColumn(env,'offers','image_data',"TEXT DEFAULT ''");
  await ensureColumn(env,'agenda_entries','entry_status',"TEXT DEFAULT 'Yapılacak'");
  await ensureColumn(env,'agenda_entries','completed_date',"TEXT DEFAULT ''");
  await ensureColumn(env,'agenda_entries','image_data',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','delivery_date',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','delivery_place',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','price','REAL DEFAULT 0');
  await ensureColumn(env,'graphic_jobs','created_by',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','completed_by',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','remind_at',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','tracking_status',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','tracked_by',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','tracked_at',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','original_work_date',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','completed_at',"TEXT DEFAULT ''");
  await ensureColumn(env,'graphic_jobs','tracking_note',"TEXT DEFAULT ''");
  await env.DB.prepare("UPDATE graphic_jobs SET original_work_date=work_date WHERE COALESCE(original_work_date,'')='' ").run();
  await env.DB.prepare("UPDATE graphic_jobs SET remind_at=COALESCE((SELECT a.remind_at FROM agenda_entries a WHERE a.entry_date=graphic_jobs.work_date AND a.note LIKE graphic_jobs.customer_name||' — '||graphic_jobs.job_no||'%' ORDER BY a.id DESC LIMIT 1),'') WHERE COALESCE(remind_at,'')='' ").run();

  for (const sql of [
    'CREATE INDEX IF NOT EXISTS idx_customers_record_status ON customers(record_status)',
    'CREATE INDEX IF NOT EXISTS idx_meetings_result ON meetings(result)',
    'CREATE INDEX IF NOT EXISTS idx_meetings_remind_at ON meetings(remind_at)',
    'CREATE INDEX IF NOT EXISTS idx_agenda_entry_date ON agenda_entries(entry_date)',
    'CREATE INDEX IF NOT EXISTS idx_agenda_remind_at ON agenda_entries(remind_at)',
    'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
    'CREATE INDEX IF NOT EXISTS idx_mails_external_id ON mails(external_id)'
    ,'CREATE INDEX IF NOT EXISTS idx_graphic_jobs_date ON graphic_jobs(work_date)'
    ,'CREATE INDEX IF NOT EXISTS idx_graphic_jobs_no ON graphic_jobs(job_no)'
    ,'CREATE INDEX IF NOT EXISTS idx_graphic_job_delays_from ON graphic_job_delays(delayed_from)'
  ]) await env.DB.prepare(sql).run();
}

// Ayni Worker calisirken her API isteginde onlarca PRAGMA/CREATE sorgusunu
// yeniden kosma. Ilk kontrol tamamlaninca sonraki istekler dogrudan veriye gider.
let schemaReadyPromise;
async function ensureSchemaReady(env) {
  if (!schemaReadyPromise) {
    schemaReadyPromise=ensureSchema(env).catch(error=>{schemaReadyPromise=undefined;throw error});
  }
  return schemaReadyPromise;
}

async function api(request, env) {
  const url = new URL(request.url), path=url.pathname;
  if (path==='/api/login' && request.method==='POST') {
    const b=await body(request);
    const requestedRole=b.user==='Çağatay'?'graphic':b.user==='Recep'?'tracking':'admin';
    const valid=requestedRole==='admin'?(env.ADMIN_PASSWORD&&b.password===env.ADMIN_PASSWORD):requestedRole==='graphic'?b.password===(env.CAGATAY_PASSWORD||'4444'):b.password===(env.RECEP_PASSWORD||'3333');
    if(!valid) return json({error:'Şifre hatalı'},401);
    const token=await sessionToken(env,requestedRole);
    return json({ok:true,role:requestedRole,user:requestedRole==='admin'?'Ali':requestedRole==='graphic'?'Çağatay':'Recep'},200,{'set-cookie':`crm_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`});
  }
  if(path==='/api/logout') return json({ok:true},200,{'set-cookie':'crm_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'});

  if(path==='/api/mail-webhook' && request.method==='POST') {
    await ensureSchemaReady(env);
    const supplied=request.headers.get('x-crm-webhook-key')||'';
    if(!env.MAIL_WEBHOOK_KEY || supplied!==env.MAIL_WEBHOOK_KEY) return json({error:'Webhook anahtarı geçersiz'},401);
    const b=await body(request), email=String(b.email||'').trim().toLowerCase(), externalId=String(b.external_id||'');
    let customerId=null, company=null;
    if(email){
      const c=await env.DB.prepare("SELECT id,company FROM customers WHERE lower(email)=? OR lower(emails_json) LIKE ? LIMIT 1")
        .bind(email,`%${email}%`).first();
      if(c){customerId=c.id;company=c.company}
    }
    if(externalId){const ex=await env.DB.prepare('SELECT id FROM mails WHERE external_id=? LIMIT 1').bind(externalId).first(); if(ex)return json({ok:true,duplicate:true,matched_company:company})}
    await env.DB.prepare('INSERT INTO mails(customer_id,direction,mail_date,email,subject,summary,follow_date,external_id) VALUES(?,?,?,?,?,?,?,?)')
      .bind(customerId,b.direction||'Gelen',b.mail_date||new Date().toISOString(),email,b.subject||'',b.summary||'','',externalId).run();
    return json({ok:true,matched_customer_id:customerId,matched_company:company},201);
  }

  const role=await sessionRole(request,env);
  if(!role) return json({error:'Yetkisiz'},401);
  if(path==='/api/session')return json({ok:true,role,user:role==='admin'?'Ali':role==='graphic'?'Çağatay':'Recep'});
  if(role==='graphic'&&!path.startsWith('/api/graphic-jobs')&&path!=='/api/health')return json({error:'Bu bölüm yalnızca yöneticiye açıktır.'},403);
  if(role==='tracking'&&!path.startsWith('/api/tracking')&&path!=='/api/health')return json({error:'Recep yalnızca bugünkü takip işlerini görebilir.'},403);
  await ensureSchemaReady(env);

  if(path==='/api/health') return json({ok:true});
  if(path==='/api/tracking'&&request.method==='GET'){
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const tomorrowDate=new Date();tomorrowDate.setTime(tomorrowDate.getTime()+86400000);
    const tomorrow=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(tomorrowDate);
    const selectedDate=url.searchParams.get('day')==='tomorrow'?tomorrow:today;
    return json((await env.DB.prepare("SELECT id,work_date,job_no,customer_name,description,note,tracking_note,status,remind_at,tracking_status,tracked_by,tracked_at FROM graphic_jobs WHERE work_date=? AND status LIKE 'İmalat%' ORDER BY CASE WHEN COALESCE(remind_at,'')='' THEN 1 ELSE 0 END,remind_at,id").bind(selectedDate).all()).results)
  }
  const trackingJob=path.match(/^\/api\/tracking\/(\d+)$/);
  if(trackingJob&&request.method==='PUT'){
    const b=await body(request),done=Boolean(b.done),id=Number(trackingJob[1]);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const tomorrowDate=new Date();tomorrowDate.setTime(tomorrowDate.getTime()+86400000);
    const tomorrow=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(tomorrowDate);
    const selectedDate=b.action==='today'||b.view_day==='tomorrow'?tomorrow:today;
    const found=await env.DB.prepare("SELECT id FROM graphic_jobs WHERE id=? AND work_date=? AND status LIKE 'İmalat%'").bind(id,selectedDate).first();
    if(!found)return json({error:'Bu iş seçilen takip listesinde değil.'},403);
    if(b.action==='note'){
      const trackingNote=String(b.tracking_note||'').trim().slice(0,1000);
      await env.DB.prepare('UPDATE graphic_jobs SET tracking_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(trackingNote,id).run();
      return json({ok:true,tracking_note:trackingNote})
    }
    if(b.action==='tomorrow'){
      const job=await env.DB.prepare('SELECT tracking_note FROM graphic_jobs WHERE id=?').bind(id).first();
      await env.DB.prepare('INSERT INTO graphic_job_delays(graphic_job_id,delayed_from,delayed_to,note,delayed_by) VALUES(?,?,?,?,?)').bind(id,today,tomorrow,String(job?.tracking_note||''),'Recep').run();
      await env.DB.prepare("UPDATE graphic_jobs SET work_date=?,remind_at='',tracking_status='',tracked_by='',tracked_at='',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(tomorrow,id).run();
      return json({ok:true,work_date:tomorrow})
    }
    if(b.action==='today'){
      await env.DB.prepare('DELETE FROM graphic_job_delays WHERE id=(SELECT id FROM graphic_job_delays WHERE graphic_job_id=? AND delayed_from=? AND delayed_to=? ORDER BY id DESC LIMIT 1)').bind(id,today,tomorrow).run();
      await env.DB.prepare("UPDATE graphic_jobs SET work_date=?,tracking_status='',tracked_by='',tracked_at='',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(today,id).run();
      return json({ok:true,work_date:today})
    }
    await env.DB.prepare("UPDATE graphic_jobs SET tracking_status=?,tracked_by=?,tracked_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(done?'Görüşüldü':'',done?'Recep':'',done?new Date().toISOString():'',id).run();
    return json({ok:true})
  }
  if(path==='/api/reports/delays'&&request.method==='GET'){
    if(role!=='admin')return json({error:'Raporlama yalnızca yöneticiye açıktır.'},403);
    const reportDate=url.searchParams.get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const rows=await env.DB.prepare(`SELECT g.id,g.customer_name,g.job_no,g.description,g.status,g.remind_at,g.tracking_status,g.tracked_by,
      d.delayed_from report_date,d.delayed_to,d.note delay_note,d.delayed_by,d.created_at delay_created_at
      FROM graphic_job_delays d JOIN graphic_jobs g ON g.id=d.graphic_job_id WHERE d.delayed_from=?
      UNION ALL
      SELECT g.id,g.customer_name,g.job_no,g.description,g.status,g.remind_at,g.tracking_status,g.tracked_by,
      g.work_date report_date,'' delayed_to,'' delay_note,'' delayed_by,'' delay_created_at
      FROM graphic_jobs g WHERE g.work_date=? AND g.status LIKE 'İmalat%' AND g.status NOT LIKE '%Bitti'
      AND NOT EXISTS(SELECT 1 FROM graphic_job_delays d WHERE d.graphic_job_id=g.id AND d.delayed_from=?)
      ORDER BY customer_name,job_no`).bind(reportDate,reportDate,reportDate).all();
    return json(rows.results)
  }
  if(path==='/api/reports/production'&&request.method==='GET'){
    if(role!=='admin')return json({error:'Raporlama yalnızca yöneticiye açıktır.'},403);
    const from=url.searchParams.get('from'),to=url.searchParams.get('to');
    if(!from||!to)return json({error:'Rapor başlangıç ve bitiş tarihi zorunlu.'},400);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const jobs=(await env.DB.prepare(`SELECT g.id,g.customer_name,g.job_no,g.description,g.tracking_note,g.status,g.original_work_date,g.work_date,g.completed_at,g.tracking_status,
      EXISTS(SELECT 1 FROM graphic_job_delays d WHERE d.graphic_job_id=g.id AND d.delayed_from>=? AND d.delayed_from<=?) delayed,
      (SELECT MAX(d.delayed_to) FROM graphic_job_delays d WHERE d.graphic_job_id=g.id) delayed_to
      FROM graphic_jobs g WHERE g.original_work_date>=? AND g.original_work_date<=? AND g.status LIKE 'İmalat%' ORDER BY g.original_work_date,g.customer_name,g.job_no`).bind(from,to,from,to).all()).results;
    const localDay=value=>value?new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value.replace(' ','T')+(String(value).includes('Z')?'':'Z'))):'';
    const classified=jobs.map(x=>{const done=String(x.status||'').includes('Bitti'),late=Boolean(x.delayed)||String(x.work_date||'')>String(x.original_work_date||'')||(done&&x.completed_at&&localDay(x.completed_at)>x.original_work_date),open=!done,status=late?'Yetişmedi':open&&x.original_work_date<=today?'Yetişmedi':open?'Bekliyor':'Yetişti';return {...x,report_status:status}});
    const summary={total:classified.length,on_time:classified.filter(x=>x.report_status==='Yetişti').length,late:classified.filter(x=>x.report_status==='Yetişmedi').length,pending:classified.filter(x=>x.report_status==='Bekliyor').length};
    summary.success_rate=(summary.on_time+summary.late)?Math.round(summary.on_time/(summary.on_time+summary.late)*100):0;
    return json({from,to,summary,jobs:classified})
  }
  if(path==='/api/graphic-jobs'&&request.method==='GET'){
    const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10),visibleDate=url.searchParams.get('visible_date'),search=String(url.searchParams.get('search')||'').trim(),upcomingFrom=url.searchParams.get('upcoming_from'),upcomingTo=url.searchParams.get('upcoming_to'),workFrom=url.searchParams.get('work_from'),workTo=url.searchParams.get('work_to'),createdFrom=url.searchParams.get('created_from'),createdTo=url.searchParams.get('created_to');
    const clean=rows=>rows.map(x=>({...x,description:String(x.description||'').toLocaleLowerCase('tr-TR').includes('yapıldı')?'':x.description}));
    if(upcomingFrom&&upcomingTo)return json(clean((await env.DB.prepare("SELECT * FROM graphic_jobs WHERE delivery_date>=? AND delivery_date<=? AND status NOT IN ('Tamamlandı','Bitti','İptal') ORDER BY delivery_date,id").bind(upcomingFrom,upcomingTo).all()).results));
    if(workFrom&&workTo)return json(clean((await env.DB.prepare('SELECT * FROM graphic_jobs WHERE work_date>=? AND work_date<=? ORDER BY work_date,id').bind(workFrom,workTo).all()).results));
    if(createdFrom&&createdTo){if(role==='graphic')return json([]);return json(clean((await env.DB.prepare("SELECT *,date(created_at,'+3 hours') created_date FROM graphic_jobs WHERE date(created_at,'+3 hours')>=? AND date(created_at,'+3 hours')<=? ORDER BY created_at,id").bind(createdFrom,createdTo).all()).results))}
    if(search){const q='%'+search+'%';return json(clean((await env.DB.prepare('SELECT * FROM graphic_jobs WHERE job_no LIKE ? OR customer_name LIKE ? OR description LIKE ? ORDER BY work_date DESC,id DESC').bind(q,q,q).all()).results))}
    if(visibleDate)return json(clean((await env.DB.prepare("SELECT *,date(created_at,'+3 hours') created_date FROM graphic_jobs WHERE work_date=? OR date(created_at,'+3 hours')=? ORDER BY CASE WHEN work_date=? THEN 0 ELSE 1 END,id DESC").bind(visibleDate,visibleDate,visibleDate).all()).results))
    return json(clean((await env.DB.prepare('SELECT * FROM graphic_jobs WHERE work_date=? ORDER BY id DESC').bind(date).all()).results))
  }
  if(path==='/api/graphic-jobs'&&request.method==='POST'){
    const b=await body(request),jobNo=String(b.job_no||'').trim(),customer=String(b.customer_name||'').trim();
    if(!b.work_date||!jobNo||!customer)return json({error:'Tarih, iş numarası ve firma zorunlu.'},400);
    const duplicate=await env.DB.prepare('SELECT id,work_date,customer_name FROM graphic_jobs WHERE lower(job_no)=lower(?) LIMIT 1').bind(jobNo).first();
    if(duplicate&&!b.allow_duplicate)return json({error:'Bu iş numarası daha önce kaydedilmiş.',duplicate},409);
    const description=String(b.description||'').trim();
    const createdBy=role==='graphic'?'Çağatay':String(b.created_by||'').trim();
    const deliveryPlace=['Bursa','Kargo','İstanbul','Otobüs'].includes(String(b.delivery_place||''))?String(b.delivery_place):'';
    const created=await env.DB.prepare('INSERT INTO graphic_jobs(work_date,original_work_date,job_no,customer_name,description,quantity,delivery_date,delivery_place,status,note,price,created_by,remind_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(b.work_date,b.work_date,jobNo,customer,description,Math.max(1,Number(b.quantity||1)),b.delivery_date||'',deliveryPlace,b.status||'Beklemede',String(b.note||'').trim(),Math.max(0,Number(b.price||0)),createdBy,String(b.remind_at||'')).run();
    if(b.remind_at){const last=await env.DB.prepare('SELECT COALESCE(MAX(sort_order),0) n FROM agenda_entries WHERE entry_date=?').bind(b.work_date).first();await env.DB.prepare('INSERT INTO agenda_entries(entry_date,sort_order,note,remind_at,reminder_status) VALUES(?,?,?,?,?)').bind(b.work_date,Number(last?.n||0)+1,`${customer} — ${jobNo}${description?' — '+description:''}`,String(b.remind_at),'Açık').run()}
    return json({ok:true,id:created.meta.last_row_id},201)
  }
  const graphicJob=path.match(/^\/api\/graphic-jobs\/(\d+)$/);
  if(graphicJob&&request.method==='PUT'){
    const b=await body(request),id=Number(graphicJob[1]);
    const completedBy=role==='graphic'&&b.completed_by?'Çağatay':(b.completed_by??null);
    const completedAt=b.status===undefined?null:String(b.status).includes('Bitti')?new Date().toISOString():'';
    const deliveryPlace=b.delivery_place===undefined?null:(['Bursa','Kargo','İstanbul','Otobüs'].includes(String(b.delivery_place))?String(b.delivery_place):'');
    await env.DB.prepare('UPDATE graphic_jobs SET work_date=COALESCE(?,work_date),job_no=COALESCE(?,job_no),customer_name=COALESCE(?,customer_name),description=COALESCE(?,description),quantity=COALESCE(?,quantity),delivery_date=COALESCE(?,delivery_date),delivery_place=COALESCE(?,delivery_place),status=COALESCE(?,status),note=COALESCE(?,note),price=COALESCE(?,price),created_by=COALESCE(?,created_by),completed_by=COALESCE(?,completed_by),remind_at=COALESCE(?,remind_at),completed_at=COALESCE(?,completed_at),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.work_date??null,b.job_no??null,b.customer_name??null,b.description??null,b.quantity??null,b.delivery_date??null,deliveryPlace,b.status??null,b.note??null,b.price??null,role==='graphic'?null:(b.created_by??null),completedBy,b.remind_at??null,completedAt,id).run();
    return json({ok:true})
  }
  if(graphicJob&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM graphic_jobs WHERE id=?').bind(Number(graphicJob[1])).run();return json({ok:true})}
  if(path==='/api/dashboard') {
    const today=new Date().toISOString().slice(0,10);
    const [total,todayQ,overdue,openOffers]=await Promise.all([
      env.DB.prepare("SELECT COUNT(*) c FROM customers WHERE record_status='Aktif'").first(),
      env.DB.prepare("SELECT COUNT(*) c FROM customers WHERE record_status='Aktif' AND follow_date=? AND stage NOT IN ('Kazanıldı','Kaybedildi')").bind(today).first(),
      env.DB.prepare("SELECT COUNT(*) c FROM customers WHERE record_status='Aktif' AND follow_date<>'' AND follow_date<? AND stage NOT IN ('Kazanıldı','Kaybedildi')").bind(today).first(),
      env.DB.prepare("SELECT COUNT(*) c FROM offers WHERE status IN ('Taslak','Gönderildi','Revize','Bekliyor')").first()
    ]);
    const due=await env.DB.prepare("SELECT * FROM customers WHERE record_status='Aktif' AND follow_date<=? AND follow_date<>'' AND stage NOT IN ('Kazanıldı','Kaybedildi') ORDER BY follow_date LIMIT 30").bind(today).all();
    return json({total:total.c,today:todayQ.c,overdue:overdue.c,openOffers:openOffers.c,due:due.results});
  }

  if(path==='/api/customers' && request.method==='GET') {
    const q=url.searchParams.get('q')||'', status=url.searchParams.get('status')||'Aktif', category=url.searchParams.get('category')||'', result=url.searchParams.get('result')||'';
    const where=[], vals=[];
    if(!result&&status!=='Tümü'){where.push('record_status=?');vals.push(status)}
    if(result==='Olumlu')where.push("stage='Kazanıldı'");
    else if(result==='Olumsuz')where.push("stage='Kaybedildi'");
    else if(result==='Sonuçlanmadı')where.push("COALESCE(stage,'') NOT IN ('Kazanıldı','Kaybedildi')");
    if(category){where.push('categories LIKE ?');vals.push(`%${category}%`)}
    if(q){
      where.push('(company LIKE ? OR contact_name LIKE ? OR sector LIKE ? OR email LIKE ? OR phones_json LIKE ? OR emails_json LIKE ?)');
      vals.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`);
    }
    const sql=`SELECT * FROM customers ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY CASE priority WHEN 'KRİTİK' THEN 1 WHEN 'YÜKSEK' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, company`;
    return json((await env.DB.prepare(sql).bind(...vals).all()).results);
  }
  if(path==='/api/customers' && request.method==='POST') {
    const b=await body(request); if(!b.company)return json({error:'Firma adı zorunlu'},400);
    const phones=Array.isArray(b.phones)?b.phones:[], emails=Array.isArray(b.emails)?b.emails:[];
    const categories=Array.isArray(b.categories)?b.categories.join(','):(b.categories||'');
    const imageData=validAgendaImage(b.note_image_data);if(imageData===null)return json({error:'Resim geçersiz veya çok büyük.'},400);
    const r=await env.DB.prepare(`INSERT INTO customers(
      company,contact_name,phone,email,region,sector,priority,stage,follow_date,
      invoice_title,tax_office,tax_number,invoice_address,record_status,
      special_notes,machine_info,phones_json,emails_json,categories,note_image_data
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(
        b.company,b.contact_name||'',phones[0]||'',emails[0]||'',b.region||'',categories,
        b.priority||'NORMAL',b.stage||'Yeni Lead',b.follow_date||'',
        b.invoice_title||'',b.tax_office||'',b.tax_number||'',b.invoice_address||'','Aktif',
        b.special_notes||'',b.machine_info||'',JSON.stringify(phones),JSON.stringify(emails),categories,imageData
      ).run();
    return json({id:r.meta.last_row_id},201);
  }
  const cm=path.match(/^\/api\/customers\/(\d+)$/);
  if(cm && request.method==='PUT') {
    const b=await body(request);
    const phones=Array.isArray(b.phones)?b.phones:[], emails=Array.isArray(b.emails)?b.emails:[];
    const categories=Array.isArray(b.categories)?b.categories.join(','):(b.categories||'');
    const existingCustomer=await env.DB.prepare('SELECT note_image_data FROM customers WHERE id=?').bind(Number(cm[1])).first();
    const imageData=b.note_image_data===undefined?String(existingCustomer?.note_image_data||''):validAgendaImage(b.note_image_data);if(imageData===null)return json({error:'Resim geçersiz veya çok büyük.'},400);
    await env.DB.prepare(`UPDATE customers SET
      company=?,contact_name=?,phone=?,email=?,region=?,sector=?,priority=?,stage=?,follow_date=?,
      invoice_title=?,tax_office=?,tax_number=?,invoice_address=?,
      special_notes=?,machine_info=?,phones_json=?,emails_json=?,categories=?,note_image_data=?,
      updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(
        b.company||'',b.contact_name||'',phones[0]||'',emails[0]||'',b.region||'',categories,
        b.priority||'NORMAL',b.stage||'Yeni Lead',b.follow_date||'',
        b.invoice_title||'',b.tax_office||'',b.tax_number||'',b.invoice_address||'',
        b.special_notes||'',b.machine_info||'',JSON.stringify(phones),JSON.stringify(emails),categories,imageData,
        Number(cm[1])
      ).run();
    return json({ok:true});
  }
  const customerResult=path.match(/^\/api\/customers\/(\d+)\/result$/);
  if(customerResult&&request.method==='PUT'){
    const customerId=Number(customerResult[1]),b=await body(request);
    if(!['Olumlu','Olumsuz'].includes(b.result))return json({error:'Sonuç Olumlu veya Olumsuz olmalı.'},400);
    const stage=b.result==='Olumlu'?'Kazanıldı':'Kaybedildi';
    const recordStatus=b.result==='Olumlu'?'Aktif':'Pasif';
    await env.DB.prepare('UPDATE customers SET stage=?,record_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(stage,recordStatus,customerId).run();
    return json({ok:true,result:b.result});
  }

  const trash=path.match(/^\/api\/customers\/(\d+)\/trash$/); if(trash&&request.method==='POST'){await env.DB.prepare("UPDATE customers SET record_status='Silindi',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(trash[1])).run();return json({ok:true})}
  const restore=path.match(/^\/api\/customers\/(\d+)\/restore$/); if(restore&&request.method==='POST'){await env.DB.prepare("UPDATE customers SET record_status='Aktif',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(restore[1])).run();return json({ok:true})}

  const history=path.match(/^\/api\/customers\/(\d+)\/history$/);
  if(history && request.method==='GET') {
    const customerId=Number(history[1]);
    const customer=await env.DB.prepare('SELECT * FROM customers WHERE id=?').bind(customerId).first();
    if(!customer)return json({error:'Müşteri bulunamadı'},404);
    const [meetings,mails,offers]=await Promise.all([
      env.DB.prepare('SELECT * FROM meetings WHERE customer_id=? ORDER BY meeting_no ASC, COALESCE(meeting_date,created_at) ASC').bind(customerId).all(),
      env.DB.prepare('SELECT * FROM mails WHERE customer_id=? ORDER BY COALESCE(mail_date,created_at) DESC').bind(customerId).all(),
      env.DB.prepare('SELECT * FROM offers WHERE customer_id=? ORDER BY COALESCE(offer_date,created_at) DESC').bind(customerId).all()
    ]);
    return json({customer,meetings:meetings.results||[],mails:mails.results||[],offers:offers.results||[]});
  }

  if(path==='/api/meetings' && request.method==='GET') {
    const status=url.searchParams.get('status')||'Aktif'; let where=" WHERE c.record_status<>'Silindi'";
    if(status==='Aktif') where=" WHERE c.record_status='Aktif' AND COALESCE(m.result,'Beklemede') IN ('Olumlu','Tekrar Görüşülecek')";
    else if(status==='Bekleyen') where=" WHERE c.record_status<>'Silindi' AND COALESCE(m.result,'Beklemede')='Beklemede'";
    else if(status==='Pasif') where=" WHERE c.record_status='Pasif' OR COALESCE(m.result,'')='Olumsuz'";
    const rows=await env.DB.prepare(`SELECT m.*,c.company,c.contact_name,c.phone,c.email,c.phones_json,c.emails_json,c.record_status FROM meetings m JOIN customers c ON c.id=m.customer_id ${where} ORDER BY COALESCE(m.meeting_date,m.created_at) DESC`).all();
    return json(rows.results);
  }
  if(path==='/api/meetings' && request.method==='POST') {
    const b=await body(request);
    const customerId=Number(b.customer_id||0);
    if(!customerId)return json({error:'Firma seçimi zorunlu'},400);
    const last=await env.DB.prepare('SELECT COALESCE(MAX(meeting_no),0) last_no FROM meetings WHERE customer_id=?').bind(customerId).first();
    const meetingNo=Number(last?.last_no||0)+1;
    const created=await env.DB.prepare(`INSERT INTO meetings(customer_id,meeting_no,meeting_date,note,next_follow_date,remind_at,remind_note,reminder_status,result,result_note,participants_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(customerId,meetingNo,b.meeting_date||'',b.note||'',b.next_follow_date||'',b.remind_at||'',b.remind_note||'',b.remind_at?'Açık':'',b.result||'Beklemede',b.result_note||'',JSON.stringify((Array.isArray(b.participants)?b.participants:[]).slice(0,4).map(p=>({name:String(p?.name||'').trim(),phone:String(p?.phone||'').trim()})).filter(p=>p.name||p.phone))).run();
    if(b.next_follow_date) await env.DB.prepare('UPDATE customers SET follow_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.next_follow_date,customerId).run();
    if(b.result==='Olumsuz') await env.DB.prepare("UPDATE customers SET record_status='Pasif',stage='Kaybedildi',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(customerId).run();
    else if(b.result==='Olumlu') await env.DB.prepare("UPDATE customers SET record_status='Aktif',stage='Kazanıldı',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(customerId).run();
    else if(b.result==='Tekrar Görüşülecek') await env.DB.prepare("UPDATE customers SET record_status='Aktif',stage=CASE WHEN stage IN ('Kaybedildi','Kazanıldı') THEN 'İlk Görüşme' ELSE stage END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(customerId).run();
    return json({ok:true,meeting_id:created.meta.last_row_id,meeting_no:meetingNo},201);
  }
  const md=path.match(/^\/api\/meetings\/(\d+)$/);
  const reminderDone=path.match(/^\/api\/meetings\/(\d+)\/reminder-complete$/);
  if(reminderDone&&request.method==='POST'){
    await env.DB.prepare("UPDATE meetings SET reminder_status='Tamamlandı' WHERE id=?").bind(Number(reminderDone[1])).run();
    return json({ok:true});
  }
  const reminderSnooze=path.match(/^\/api\/meetings\/(\d+)\/reminder-snooze$/);
  if(reminderSnooze&&request.method==='POST'){
    const b=await body(request);if(!b.remind_at)return json({error:'Yeni hatırlatma zamanı zorunlu'},400);
    await env.DB.prepare("UPDATE meetings SET remind_at=?,reminder_status='Açık' WHERE id=?").bind(b.remind_at,Number(reminderSnooze[1])).run();
    return json({ok:true,remind_at:b.remind_at});
  }
  const reminderUpdate=path.match(/^\/api\/meetings\/(\d+)\/reminder$/);
  if(reminderUpdate&&request.method==='PUT'){
    const meetingId=Number(reminderUpdate[1]),b=await body(request),remindAt=b.remind_at||'';
    const existing=await env.DB.prepare('SELECT id FROM meetings WHERE id=?').bind(meetingId).first();
    if(!existing)return json({error:'Görüşme bulunamadı'},404);
    await env.DB.prepare('UPDATE meetings SET remind_at=?,remind_note=?,reminder_status=? WHERE id=?').bind(remindAt,b.remind_note||'',remindAt?'Açık':'',meetingId).run();
    return json({ok:true});
  }
  if(md&&request.method==='PUT'){
    const meetingId=Number(md[1]), b=await body(request);
    const existing=await env.DB.prepare('SELECT customer_id FROM meetings WHERE id=?').bind(meetingId).first();
    if(!existing)return json({error:'Görüşme bulunamadı'},404);
    await env.DB.prepare(`UPDATE meetings SET meeting_date=?,note=?,next_follow_date=?,remind_at=?,remind_note=?,reminder_status=?,result=?,result_note=?,participants_json=? WHERE id=?`)
      .bind(b.meeting_date||'',b.note||'',b.next_follow_date||'',b.remind_at||'',b.remind_note||'',b.remind_at?'Açık':'',b.result||'Beklemede',b.result_note||'',JSON.stringify((Array.isArray(b.participants)?b.participants:[]).slice(0,4).map(p=>({name:String(p?.name||'').trim(),phone:String(p?.phone||'').trim()})).filter(p=>p.name||p.phone)),meetingId).run();
    if(b.next_follow_date)await env.DB.prepare('UPDATE customers SET follow_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.next_follow_date,existing.customer_id).run();
    if(b.result==='Olumsuz')await env.DB.prepare("UPDATE customers SET record_status='Pasif',stage='Kaybedildi',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(existing.customer_id).run();
    else if(b.result==='Olumlu')await env.DB.prepare("UPDATE customers SET record_status='Aktif',stage='Kazanıldı',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(existing.customer_id).run();
    else if(b.result==='Tekrar Görüşülecek')await env.DB.prepare("UPDATE customers SET record_status='Aktif',stage=CASE WHEN stage IN ('Kaybedildi','Kazanıldı') THEN 'İlk Görüşme' ELSE stage END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(existing.customer_id).run();
    return json({ok:true});
  }
  if(md&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM meetings WHERE id=?').bind(Number(md[1])).run();return json({ok:true})}

  if(path==='/api/offers'&&request.method==='GET'){return json((await env.DB.prepare('SELECT o.*,c.company FROM offers o JOIN customers c ON c.id=o.customer_id ORDER BY COALESCE(o.offer_date,o.created_at) DESC').all()).results)}
  if(path==='/api/offers'&&request.method==='POST'){const b=await body(request);const status=b.status||'Taslak';const reason=(b.result_reason||'').trim();const imageData=validAgendaImage(b.image_data);if(imageData===null)return json({error:'Teklif resmi geçersiz veya çok büyük.'},400);if((status==='Onaylandı'||status==='Reddedildi')&&!reason)return json({error:'Olumlu veya olumsuz teklif sonucu için neden zorunludur.'},400);await env.DB.prepare('INSERT INTO offers(customer_id,offer_no,subject,amount,currency,status,offer_date,follow_date,note,result_reason,offer_text,image_data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(b.customer_id,b.offer_no||'',b.subject||'',Number(b.amount||0),b.currency||'TRY',status,b.offer_date||'',b.follow_date||'',b.note||'',reason,b.offer_text||'',imageData).run();return json({ok:true},201)}
  const od=path.match(/^\/api\/offers\/(\d+)$/);
  if(od&&request.method==='PUT'){const offerId=Number(od[1]);const existing=await env.DB.prepare('SELECT id FROM offers WHERE id=?').bind(offerId).first();if(!existing)return json({error:'Teklif bulunamadı.'},404);const b=await body(request);const status=b.status||'Taslak';const reason=(b.result_reason||'').trim();const imageData=validAgendaImage(b.image_data);if(imageData===null)return json({error:'Teklif resmi geçersiz veya çok büyük.'},400);if((status==='Onaylandı'||status==='Reddedildi')&&!reason)return json({error:'Olumlu veya olumsuz teklif sonucu için neden zorunludur.'},400);await env.DB.prepare('UPDATE offers SET offer_no=?,subject=?,amount=?,currency=?,status=?,offer_date=?,follow_date=?,note=?,result_reason=?,offer_text=?,image_data=? WHERE id=?').bind(b.offer_no||'',b.subject||'',Number(b.amount||0),b.currency||'TRY',status,b.offer_date||'',b.follow_date||'',b.note||'',reason,b.offer_text||'',imageData,offerId).run();return json({ok:true})}

  if(path==='/api/mails'&&request.method==='GET'){return json((await env.DB.prepare('SELECT m.*,c.company FROM mails m LEFT JOIN customers c ON c.id=m.customer_id ORDER BY COALESCE(m.mail_date,m.created_at) DESC').all()).results)}
  if(path==='/api/mails'&&request.method==='POST'){const b=await body(request);await env.DB.prepare('INSERT INTO mails(customer_id,direction,mail_date,email,subject,summary,follow_date,external_id) VALUES(?,?,?,?,?,?,?,?)').bind(b.customer_id||null,b.direction||'',b.mail_date||'',b.email||'',b.subject||'',b.summary||'',b.follow_date||'',b.external_id||'').run();return json({ok:true},201)}

  if(path==='/api/agenda/reminders'&&request.method==='GET'){return json((await env.DB.prepare("SELECT * FROM agenda_entries WHERE reminder_status='Açık' AND remind_at<>'' ORDER BY remind_at").all()).results)}
  if(path==='/api/agenda/rollover'&&request.method==='POST'){
    const b=await body(request),today=String(b.today||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(today))return json({error:'Geçerli gün bilgisi zorunlu.'},400);
    const moved=await env.DB.prepare("UPDATE agenda_entries SET entry_date=?, remind_at=CASE WHEN COALESCE(remind_at,'')<>'' THEN ?||substr(remind_at,11) ELSE COALESCE(remind_at,'') END, reminder_status=CASE WHEN COALESCE(remind_at,'')<>'' THEN 'Açık' ELSE COALESCE(reminder_status,'') END WHERE entry_date<? AND COALESCE(entry_status,'Yapılacak')<>'Yapıldı'").bind(today,today,today).run();
    return json({ok:true,moved:Number(moved.meta?.changes||0)});
  }
  if(path==='/api/agenda/day'&&request.method==='GET'){const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10);return json((await env.DB.prepare('SELECT * FROM agenda_entries WHERE entry_date=? ORDER BY sort_order,id').bind(date).all()).results)}
  if(path==='/api/agenda/completed'&&request.method==='GET'){const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10);return json((await env.DB.prepare("SELECT * FROM agenda_entries WHERE entry_status='Yapıldı' AND completed_date=? ORDER BY id DESC").bind(date).all()).results)}
  if(path==='/api/agenda'&&request.method==='GET'){const month=url.searchParams.get('month')||new Date().toISOString().slice(0,7);return json((await env.DB.prepare("SELECT * FROM agenda_entries WHERE entry_date LIKE ? ORDER BY entry_date,sort_order,id").bind(month+'%').all()).results)}
  if(path==='/api/agenda'&&request.method==='POST'){const b=await body(request);if(!b.entry_date||!String(b.note||'').trim())return json({error:'Tarih ve ajanda notu zorunlu.'},400);const imageData=validAgendaImage(b.image_data);if(imageData===null)return json({error:'Resim geçersiz veya çok büyük.'},400);const last=await env.DB.prepare('SELECT COALESCE(MAX(sort_order),0) n FROM agenda_entries WHERE entry_date=?').bind(b.entry_date).first();const remindAt=b.remind_at||'';const created=await env.DB.prepare('INSERT INTO agenda_entries(entry_date,sort_order,note,remind_at,reminder_status,image_data) VALUES(?,?,?,?,?,?)').bind(b.entry_date,Number(last?.n||0)+1,String(b.note).trim(),remindAt,remindAt?'Açık':'',imageData).run();return json({ok:true,id:created.meta.last_row_id},201)}
  const agendaItem=path.match(/^\/api\/agenda\/(\d+)$/);
  if(agendaItem&&request.method==='PUT'){const id=Number(agendaItem[1]),b=await body(request);if(!b.entry_date||!String(b.note||'').trim())return json({error:'Tarih ve ajanda notu zorunlu.'},400);const remindAt=b.remind_at||'';const ex=await env.DB.prepare('SELECT id,image_data FROM agenda_entries WHERE id=?').bind(id).first();if(!ex)return json({error:'Ajanda notu bulunamadı.'},404);const imageData=b.image_data===undefined?String(ex.image_data||''):validAgendaImage(b.image_data);if(imageData===null)return json({error:'Resim geçersiz veya çok büyük.'},400);await env.DB.prepare('UPDATE agenda_entries SET entry_date=?,note=?,remind_at=?,reminder_status=?,image_data=? WHERE id=?').bind(b.entry_date,String(b.note).trim(),remindAt,remindAt?'Açık':'',imageData,id).run();return json({ok:true})}
  if(agendaItem&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM agenda_entries WHERE id=?').bind(Number(agendaItem[1])).run();return json({ok:true})}
  const agendaDone=path.match(/^\/api\/agenda\/(\d+)\/complete$/);
  if(agendaDone&&request.method==='POST'){await env.DB.prepare("UPDATE agenda_entries SET reminder_status='Tamamlandı' WHERE id=?").bind(Number(agendaDone[1])).run();return json({ok:true})}
  const agendaSnooze=path.match(/^\/api\/agenda\/(\d+)\/snooze$/);
  if(agendaSnooze&&request.method==='POST'){const b=await body(request);if(!b.remind_at)return json({error:'Yeni hatırlatma zamanı zorunlu.'},400);await env.DB.prepare("UPDATE agenda_entries SET remind_at=?,reminder_status='Açık' WHERE id=?").bind(b.remind_at,Number(agendaSnooze[1])).run();return json({ok:true})}
  const agendaTaskDone=path.match(/^\/api\/agenda\/(\d+)\/task-done$/);
  if(agendaTaskDone&&request.method==='POST'){const b=await body(request),date=String(b.completed_date||new Date().toISOString().slice(0,10));await env.DB.prepare("UPDATE agenda_entries SET entry_status='Yapıldı',completed_date=?,reminder_status=CASE WHEN reminder_status='Açık' THEN 'Tamamlandı' ELSE reminder_status END WHERE id=?").bind(date,Number(agendaTaskDone[1])).run();return json({ok:true})}
  const agendaTaskUndo=path.match(/^\/api\/agenda\/(\d+)\/task-undo$/);
  if(agendaTaskUndo&&request.method==='POST'){await env.DB.prepare("UPDATE agenda_entries SET entry_status='Yapılacak',completed_date='' WHERE id=?").bind(Number(agendaTaskUndo[1])).run();return json({ok:true})}


  if(path==='/api/demo-seed'&&request.method==='POST'){
    const ex=await env.DB.prepare("SELECT COUNT(*) c FROM customers WHERE company='Atlas Tekstil'").first();
    if(ex.c>0)return json({error:'Örnek veriler zaten mevcut.'},409);
    const demo=[
      ['Atlas Tekstil','Murat Yılmaz','0532 111 22 33','murat@atlastekstil.com','Bursa','Tekstil','KRİTİK','Teklif','2026-08-21'],
      ['Vera Medikal','Ece Kılıç','0541 234 56 78','ece@veramedikal.com','Bursa','Medikal','YÜKSEK','İlk Görüşme','2026-08-21'],
      ['Artemis Kozmetik','Buse Demir','0536 555 66 77','buse@artemiskozmetik.com','İstanbul','Kozmetik','KRİTİK','Pazarlık','2026-08-19'],
      ['Mavi Kutu Ambalaj','Selin Kara','0533 222 33 44','selin@mavikutu.com','Bursa','Ambalaj','YÜKSEK','Teklif','2026-08-22']
    ];
    for(const c of demo){await env.DB.prepare('INSERT INTO customers(company,contact_name,phone,email,region,sector,priority,stage,follow_date,invoice_title,tax_office,tax_number,invoice_address,record_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...c,'','','','','Aktif').run()}
    return json({ok:true,message:'Örnek müşteriler yüklendi.'},201);
  }

  return json({error:'Bulunamadı'},404);
}

export default { async fetch(request,env){ const url=new URL(request.url); if(url.pathname.startsWith('/api/')){try{return await api(request,env)}catch(err){console.error(err);return json({error:err?.message||String(err)},500)}} return env.ASSETS.fetch(request); } };
