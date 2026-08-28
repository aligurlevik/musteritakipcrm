const enc = new TextEncoder();

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sessionToken(env) {
  const day = new Date().toISOString().slice(0,10);
  return day + '.' + await hmac(env.SESSION_SECRET || 'change-me', day);
}
async function validSession(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/crm_session=([^;]+)/);
  return !!m && m[1] === await sessionToken(env);
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
    customer_name TEXT NOT NULL, description TEXT DEFAULT '', quantity INTEGER DEFAULT 1, delivery_date TEXT DEFAULT '',
    status TEXT DEFAULT 'Beklemede', note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    if(!env.ADMIN_PASSWORD || b.password!==env.ADMIN_PASSWORD) return json({error:'Şifre hatalı'},401);
    const token=await sessionToken(env);
    return json({ok:true},200,{'set-cookie':`crm_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`});
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

  if(!(await validSession(request,env))) return json({error:'Yetkisiz'},401);
  await ensureSchemaReady(env);

  if(path==='/api/health') return json({ok:true});
  if(path==='/api/graphic-jobs'&&request.method==='GET'){
    const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10),search=String(url.searchParams.get('search')||'').trim(),upcomingFrom=url.searchParams.get('upcoming_from'),upcomingTo=url.searchParams.get('upcoming_to');
    if(upcomingFrom&&upcomingTo)return json((await env.DB.prepare("SELECT * FROM graphic_jobs WHERE delivery_date>=? AND delivery_date<=? AND status NOT IN ('Tamamlandı','İptal') ORDER BY delivery_date,id").bind(upcomingFrom,upcomingTo).all()).results);
    if(search){const q='%'+search+'%';return json((await env.DB.prepare('SELECT * FROM graphic_jobs WHERE job_no LIKE ? OR customer_name LIKE ? OR description LIKE ? ORDER BY work_date DESC,id DESC').bind(q,q,q).all()).results)}
    return json((await env.DB.prepare("SELECT * FROM graphic_jobs WHERE work_date=? OR (delivery_date=? AND status NOT IN ('Tamamlandı','İptal')) ORDER BY CASE WHEN delivery_date=? THEN 0 ELSE 1 END,id DESC").bind(date,date,date).all()).results)
  }
  if(path==='/api/graphic-jobs'&&request.method==='POST'){
    const b=await body(request),jobNo=String(b.job_no||'').trim(),customer=String(b.customer_name||'').trim();
    if(!b.work_date||!jobNo||!customer)return json({error:'Tarih, iş numarası ve firma zorunlu.'},400);
    const duplicate=await env.DB.prepare('SELECT id,work_date,customer_name FROM graphic_jobs WHERE lower(job_no)=lower(?) LIMIT 1').bind(jobNo).first();
    if(duplicate&&!b.allow_duplicate)return json({error:'Bu iş numarası daha önce kaydedilmiş.',duplicate},409);
    const created=await env.DB.prepare('INSERT INTO graphic_jobs(work_date,job_no,customer_name,description,quantity,delivery_date,status,note) VALUES(?,?,?,?,?,?,?,?)').bind(b.work_date,jobNo,customer,String(b.description||'').trim(),Math.max(1,Number(b.quantity||1)),b.delivery_date||'',b.status||'Beklemede',String(b.note||'').trim()).run();
    return json({ok:true,id:created.meta.last_row_id},201)
  }
  const graphicJob=path.match(/^\/api\/graphic-jobs\/(\d+)$/);
  if(graphicJob&&request.method==='PUT'){
    const b=await body(request),id=Number(graphicJob[1]);
    await env.DB.prepare('UPDATE graphic_jobs SET work_date=COALESCE(?,work_date),job_no=COALESCE(?,job_no),customer_name=COALESCE(?,customer_name),description=COALESCE(?,description),quantity=COALESCE(?,quantity),delivery_date=COALESCE(?,delivery_date),status=COALESCE(?,status),note=COALESCE(?,note),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.work_date??null,b.job_no??null,b.customer_name??null,b.description??null,b.quantity??null,b.delivery_date??null,b.status??null,b.note??null,id).run();
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
    const b=await body(request),fromDate=String(b.from_date||''),today=String(b.today||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)||!/^\d{4}-\d{2}-\d{2}$/.test(today))return json({error:'Geçerli gün bilgisi zorunlu.'},400);
    const moved=await env.DB.prepare("UPDATE agenda_entries SET entry_date=?, remind_at=CASE WHEN COALESCE(remind_at,'')<>'' THEN ?||substr(remind_at,11) ELSE COALESCE(remind_at,'') END, reminder_status=CASE WHEN COALESCE(remind_at,'')<>'' THEN 'Açık' ELSE COALESCE(reminder_status,'') END WHERE entry_date=? AND COALESCE(entry_status,'Yapılacak')<>'Yapıldı'").bind(today,today,fromDate).run();
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
