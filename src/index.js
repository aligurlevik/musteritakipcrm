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
    follow_date TEXT, note TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS mails (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, direction TEXT, mail_date TEXT, email TEXT,
    subject TEXT, summary TEXT, follow_date TEXT, external_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS meeting_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id INTEGER NOT NULL, object_key TEXT NOT NULL UNIQUE,
    file_name TEXT, content_type TEXT, file_size INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  for (const [name,def] of [
    ['invoice_title',"TEXT DEFAULT ''"],['tax_office',"TEXT DEFAULT ''"],['tax_number',"TEXT DEFAULT ''"],
    ['invoice_address',"TEXT DEFAULT ''"],['record_status',"TEXT DEFAULT 'Aktif'"],
    ['special_notes',"TEXT DEFAULT ''"],['machine_info',"TEXT DEFAULT ''"],
    ['phones_json',"TEXT DEFAULT '[]'"],['emails_json',"TEXT DEFAULT '[]'"],
    ['categories',"TEXT DEFAULT ''"]
  ]) await ensureColumn(env,'customers',name,def);

  for (const [name,def] of [
    ['remind_at',"TEXT DEFAULT ''"],['remind_note',"TEXT DEFAULT ''"],['reminder_status',"TEXT DEFAULT ''"],
    ['result',"TEXT DEFAULT 'Beklemede'"],['result_note',"TEXT DEFAULT ''"]
  ]) await ensureColumn(env,'meetings',name,def);

  for (const sql of [
    'CREATE INDEX IF NOT EXISTS idx_customers_record_status ON customers(record_status)',
    'CREATE INDEX IF NOT EXISTS idx_meetings_result ON meetings(result)',
    'CREATE INDEX IF NOT EXISTS idx_meetings_remind_at ON meetings(remind_at)',
    'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
    'CREATE INDEX IF NOT EXISTS idx_mails_external_id ON mails(external_id)'
    ,'CREATE INDEX IF NOT EXISTS idx_meeting_images_meeting ON meeting_images(meeting_id)'
  ]) await env.DB.prepare(sql).run();
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
    await ensureSchema(env);
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
  await ensureSchema(env);

  if(path==='/api/health') return json({ok:true});
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
    const q=url.searchParams.get('q')||'', status=url.searchParams.get('status')||'Aktif', category=url.searchParams.get('category')||'';
    const where=[], vals=[];
    if(status!=='Tümü'){where.push('record_status=?');vals.push(status)}
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
    const r=await env.DB.prepare(`INSERT INTO customers(
      company,contact_name,phone,email,region,sector,priority,stage,follow_date,
      invoice_title,tax_office,tax_number,invoice_address,record_status,
      special_notes,machine_info,phones_json,emails_json,categories
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(
        b.company,b.contact_name||'',phones[0]||'',emails[0]||'',b.region||'',categories,
        b.priority||'NORMAL',b.stage||'Yeni Lead',b.follow_date||'',
        b.invoice_title||'',b.tax_office||'',b.tax_number||'',b.invoice_address||'','Aktif',
        b.special_notes||'',b.machine_info||'',JSON.stringify(phones),JSON.stringify(emails),categories
      ).run();
    return json({id:r.meta.last_row_id},201);
  }
  const cm=path.match(/^\/api\/customers\/(\d+)$/);
  if(cm && request.method==='PUT') {
    const b=await body(request);
    const phones=Array.isArray(b.phones)?b.phones:[], emails=Array.isArray(b.emails)?b.emails:[];
    const categories=Array.isArray(b.categories)?b.categories.join(','):(b.categories||'');
    await env.DB.prepare(`UPDATE customers SET
      company=?,contact_name=?,phone=?,email=?,region=?,sector=?,priority=?,stage=?,follow_date=?,
      invoice_title=?,tax_office=?,tax_number=?,invoice_address=?,
      special_notes=?,machine_info=?,phones_json=?,emails_json=?,categories=?,
      updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(
        b.company||'',b.contact_name||'',phones[0]||'',emails[0]||'',b.region||'',categories,
        b.priority||'NORMAL',b.stage||'Yeni Lead',b.follow_date||'',
        b.invoice_title||'',b.tax_office||'',b.tax_number||'',b.invoice_address||'',
        b.special_notes||'',b.machine_info||'',JSON.stringify(phones),JSON.stringify(emails),categories,
        Number(cm[1])
      ).run();
    return json({ok:true});
  }
  const trash=path.match(/^\/api\/customers\/(\d+)\/trash$/); if(trash&&request.method==='POST'){await env.DB.prepare("UPDATE customers SET record_status='Silindi',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(trash[1])).run();return json({ok:true})}
  const restore=path.match(/^\/api\/customers\/(\d+)\/restore$/); if(restore&&request.method==='POST'){await env.DB.prepare("UPDATE customers SET record_status='Aktif',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(Number(restore[1])).run();return json({ok:true})}

  const history=path.match(/^\/api\/customers\/(\d+)\/history$/);
  if(history && request.method==='GET') {
    const customerId=Number(history[1]);
    const customer=await env.DB.prepare('SELECT * FROM customers WHERE id=?').bind(customerId).first();
    if(!customer)return json({error:'Müşteri bulunamadı'},404);
    const [meetings,mails,offers,images]=await Promise.all([
      env.DB.prepare('SELECT * FROM meetings WHERE customer_id=? ORDER BY meeting_no ASC, COALESCE(meeting_date,created_at) ASC').bind(customerId).all(),
      env.DB.prepare('SELECT * FROM mails WHERE customer_id=? ORDER BY COALESCE(mail_date,created_at) DESC').bind(customerId).all(),
      env.DB.prepare('SELECT * FROM offers WHERE customer_id=? ORDER BY COALESCE(offer_date,created_at) DESC').bind(customerId).all(),
      env.DB.prepare('SELECT mi.* FROM meeting_images mi JOIN meetings m ON m.id=mi.meeting_id WHERE m.customer_id=? ORDER BY mi.created_at').bind(customerId).all()
    ]);
    const imageRows=images.results||[];
    const meetingRows=(meetings.results||[]).map(meeting=>({...meeting,images:imageRows.filter(image=>image.meeting_id===meeting.id)}));
    return json({customer,meetings:meetingRows,mails:mails.results||[],offers:offers.results||[]});
  }

  if(path==='/api/meetings' && request.method==='GET') {
    const status=url.searchParams.get('status')||'Aktif'; let where=" WHERE c.record_status<>'Silindi'";
    if(status==='Aktif') where=" WHERE c.record_status='Aktif' AND COALESCE(m.result,'Beklemede') IN ('Olumlu','Tekrar Görüşülecek')";
    else if(status==='Bekleyen') where=" WHERE c.record_status<>'Silindi' AND COALESCE(m.result,'Beklemede')='Beklemede'";
    else if(status==='Pasif') where=" WHERE c.record_status='Pasif' OR COALESCE(m.result,'')='Olumsuz'";
    const rows=await env.DB.prepare(`SELECT m.*,c.company,c.contact_name,c.record_status FROM meetings m JOIN customers c ON c.id=m.customer_id ${where} ORDER BY COALESCE(m.meeting_date,m.created_at) DESC`).all();
    return json(rows.results);
  }
  if(path==='/api/meetings' && request.method==='POST') {
    const b=await body(request);
    const customerId=Number(b.customer_id||0);
    if(!customerId)return json({error:'Firma seçimi zorunlu'},400);
    const last=await env.DB.prepare('SELECT COALESCE(MAX(meeting_no),0) last_no FROM meetings WHERE customer_id=?').bind(customerId).first();
    const meetingNo=Number(last?.last_no||0)+1;
    const created=await env.DB.prepare(`INSERT INTO meetings(customer_id,meeting_no,meeting_date,note,next_follow_date,remind_at,remind_note,reminder_status,result,result_note) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .bind(customerId,meetingNo,b.meeting_date||'',b.note||'',b.next_follow_date||'',b.remind_at||'',b.remind_note||'',b.remind_at?'Açık':'',b.result||'Beklemede',b.result_note||'').run();
    if(b.next_follow_date) await env.DB.prepare('UPDATE customers SET follow_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.next_follow_date,customerId).run();
    if(b.result==='Olumsuz') await env.DB.prepare("UPDATE customers SET record_status='Pasif',stage='Kaybedildi',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(customerId).run();
    else if(b.result==='Olumlu'||b.result==='Tekrar Görüşülecek') await env.DB.prepare("UPDATE customers SET record_status='Aktif',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(customerId).run();
    return json({ok:true,meeting_id:created.meta.last_row_id,meeting_no:meetingNo},201);
  }
  const meetingImages=path.match(/^\/api\/meetings\/(\d+)\/images$/);
  if(meetingImages&&request.method==='POST'){
    if(!env.MEETING_IMAGES)return json({error:'Fotoğraf deposu bağlı değil'},503);
    const meetingId=Number(meetingImages[1]);
    const meeting=await env.DB.prepare('SELECT id FROM meetings WHERE id=?').bind(meetingId).first();
    if(!meeting)return json({error:'Görüşme bulunamadı'},404);
    const form=await request.formData();
    const files=form.getAll('images').filter(file=>file instanceof File&&file.size>0);
    if(!files.length)return json({error:'Fotoğraf seçilmedi'},400);
    if(files.length>10)return json({error:'Bir görüşmeye en fazla 10 fotoğraf eklenebilir'},400);
    const allowed=new Set(['image/jpeg','image/png','image/webp','image/gif']);
    const saved=[];
    for(const file of files){
      if(!allowed.has(file.type))return json({error:`Desteklenmeyen dosya: ${file.name}`},400);
      if(file.size>8*1024*1024)return json({error:`${file.name} 8 MB sınırını aşıyor`},400);
      const extension=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif' })[file.type];
      const key=`meetings/${meetingId}/${crypto.randomUUID()}.${extension}`;
      await env.MEETING_IMAGES.put(key,file,{httpMetadata:{contentType:file.type}});
      try{
        const result=await env.DB.prepare('INSERT INTO meeting_images(meeting_id,object_key,file_name,content_type,file_size) VALUES(?,?,?,?,?)')
          .bind(meetingId,key,file.name,file.type,file.size).run();
        saved.push({id:result.meta.last_row_id,file_name:file.name});
      }catch(error){await env.MEETING_IMAGES.delete(key);throw error}
    }
    return json({ok:true,images:saved},201);
  }
  const imageRoute=path.match(/^\/api\/meeting-images\/(\d+)$/);
  if(imageRoute&&request.method==='GET'){
    const image=await env.DB.prepare('SELECT * FROM meeting_images WHERE id=?').bind(Number(imageRoute[1])).first();
    if(!image)return json({error:'Fotoğraf bulunamadı'},404);
    const object=await env.MEETING_IMAGES.get(image.object_key);
    if(!object)return json({error:'Fotoğraf dosyası bulunamadı'},404);
    const headers=new Headers();object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);headers.set('cache-control','private, max-age=86400');
    return new Response(object.body,{headers});
  }
  if(imageRoute&&request.method==='DELETE'){
    const image=await env.DB.prepare('SELECT object_key FROM meeting_images WHERE id=?').bind(Number(imageRoute[1])).first();
    if(!image)return json({error:'Fotoğraf bulunamadı'},404);
    await env.MEETING_IMAGES.delete(image.object_key);
    await env.DB.prepare('DELETE FROM meeting_images WHERE id=?').bind(Number(imageRoute[1])).run();
    return json({ok:true});
  }
  const md=path.match(/^\/api\/meetings\/(\d+)$/);
  if(md&&request.method==='DELETE'){
    const meetingId=Number(md[1]);
    const images=await env.DB.prepare('SELECT object_key FROM meeting_images WHERE meeting_id=?').bind(meetingId).all();
    const keys=(images.results||[]).map(image=>image.object_key);
    if(keys.length&&env.MEETING_IMAGES)await env.MEETING_IMAGES.delete(keys);
    await env.DB.prepare('DELETE FROM meeting_images WHERE meeting_id=?').bind(meetingId).run();
    await env.DB.prepare('DELETE FROM meetings WHERE id=?').bind(meetingId).run();
    return json({ok:true});
  }

  if(path==='/api/offers'&&request.method==='GET'){return json((await env.DB.prepare('SELECT o.*,c.company FROM offers o JOIN customers c ON c.id=o.customer_id ORDER BY COALESCE(o.offer_date,o.created_at) DESC').all()).results)}
  if(path==='/api/offers'&&request.method==='POST'){const b=await body(request);await env.DB.prepare('INSERT INTO offers(customer_id,offer_no,subject,amount,currency,status,offer_date,follow_date,note) VALUES(?,?,?,?,?,?,?,?,?)').bind(b.customer_id,b.offer_no||'',b.subject||'',Number(b.amount||0),b.currency||'TRY',b.status||'Taslak',b.offer_date||'',b.follow_date||'',b.note||'').run();return json({ok:true},201)}

  if(path==='/api/mails'&&request.method==='GET'){return json((await env.DB.prepare('SELECT m.*,c.company FROM mails m LEFT JOIN customers c ON c.id=m.customer_id ORDER BY COALESCE(m.mail_date,m.created_at) DESC').all()).results)}
  if(path==='/api/mails'&&request.method==='POST'){const b=await body(request);await env.DB.prepare('INSERT INTO mails(customer_id,direction,mail_date,email,subject,summary,follow_date,external_id) VALUES(?,?,?,?,?,?,?,?)').bind(b.customer_id||null,b.direction||'',b.mail_date||'',b.email||'',b.subject||'',b.summary||'',b.follow_date||'',b.external_id||'').run();return json({ok:true},201)}


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
