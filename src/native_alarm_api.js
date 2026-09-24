const encoder=new TextEncoder();
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

async function sha(value){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(String(value||'')));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function randomToken(size=32){return b64(crypto.getRandomValues(new Uint8Array(size)))}
function reminderTime(value){
  const s=String(value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(s))return NaN;
  return Date.parse(s.replace(' ','T')+(/(?:Z|[+-]\d{2}:?\d{2})$/.test(s)?'':'+03:00'));
}
async function admin(request,env){
  const day=new Date().toISOString().slice(0,10),value='admin.'+day;
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.SESSION_SECRET||'change-me'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,encoder.encode(value));
  const expected=value+'.'+[...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,'0')).join('');
  return (request.headers.get('cookie')||'').match(/(?:^|;\s*)crm_session=([^;]+)/)?.[1]===expected;
}
let schemaPromise;
async function ensureSchema(env){
  if(schemaPromise)return schemaPromise;
  schemaPromise=(async()=>{
    for(const sql of [
      `CREATE TABLE IF NOT EXISTS native_alarm_pair_codes(code_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,used_at INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS native_alarm_devices(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,label TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,last_seen INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS native_alarm_acks(device_id TEXT NOT NULL,agenda_id INTEGER NOT NULL,remind_at TEXT NOT NULL,acked_at INTEGER NOT NULL,PRIMARY KEY(device_id,agenda_id,remind_at))`
    ])await env.DB.prepare(sql).run();
  })().catch(e=>{schemaPromise=undefined;throw e});
  return schemaPromise;
}
async function body(request){try{return await request.json()}catch{return {}}}
async function bearerDevice(request,env){
  const m=(request.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/i);
  if(!m)return null;
  const tokenHash=await sha(m[1]);
  return env.DB.prepare('SELECT * FROM native_alarm_devices WHERE token_hash=? AND enabled=1').bind(tokenHash).first();
}
function safePayload(note){
  const book=Math.max(1,Math.min(3,Number(note.notebook_no)||1));
  if(book>1)return {id:Number(note.id),remind_at:String(note.remind_at),title:'Özel not alarmı',body:'İçeriği görmek için CRM özel not alanını açın.',notebook_no:book};
  const title=String(note.title||'').trim(),text=String(note.note||'').trim();
  return {id:Number(note.id),remind_at:String(note.remind_at),title:(title||text.split('\n')[0]||'Ajanda alarmı').slice(0,120),body:(text||title||'Hatırlatma zamanı geldi.').slice(0,650),notebook_no:book};
}
function safeMeetingPayload(meeting){
  const company=String(meeting.company||'Müşteri').trim();
  const no=Number(meeting.meeting_no)||1;
  const note=String(meeting.remind_note||meeting.note||'Bu görüşmeyi takip et.').trim();
  return {
    id:-Math.abs(Number(meeting.id)||1),
    remind_at:String(meeting.remind_at),
    title:(company+' — '+no+'. Görüşme').slice(0,120),
    body:(note||'Görüşme hatırlatma zamanı geldi.').slice(0,650),
    notebook_no:1
  };
}
export async function nativeAlarmApi(request,env,{now=Date.now()}={}){
  await ensureSchema(env);
  const url=new URL(request.url),path=url.pathname;

  if(path==='/api/native-alarm/pair-code'&&request.method==='POST'){
    if(!await admin(request,env))return json({error:'Yetkisiz'},401);
    let code='';
    for(let i=0;i<6;i++)code+=String(crypto.getRandomValues(new Uint8Array(1))[0]%10);
    const codeHash=await sha(code),expiresAt=now+10*60*1000;
    await env.DB.prepare('DELETE FROM native_alarm_pair_codes WHERE expires_at<? OR used_at>0').bind(now).run();
    await env.DB.prepare('INSERT OR REPLACE INTO native_alarm_pair_codes(code_hash,expires_at,used_at) VALUES(?,?,0)').bind(codeHash,expiresAt).run();
    return json({ok:true,code,expiresAt});
  }

  if(path==='/api/native-alarm/pair'&&request.method==='POST'){
    const b=await body(request),code=String(b.code||'').trim(),label=String(b.label||'Android Alarm').trim().slice(0,80);
    if(!/^\d{6}$/.test(code))return json({error:'6 haneli eşleştirme kodu geçersiz.'},400);
    const codeHash=await sha(code),row=await env.DB.prepare('SELECT * FROM native_alarm_pair_codes WHERE code_hash=?').bind(codeHash).first();
    if(!row||Number(row.used_at||0)>0||Number(row.expires_at||0)<now)return json({error:'Eşleştirme kodu geçersiz veya süresi dolmuş.'},400);
    const token=randomToken(32),tokenHash=await sha(token),id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO native_alarm_devices(id,token_hash,label,enabled,created_at,last_seen) VALUES(?,?,?,1,?,?)').bind(id,tokenHash,label,now,now).run();
    await env.DB.prepare('UPDATE native_alarm_pair_codes SET used_at=? WHERE code_hash=?').bind(now,codeHash).run();
    return json({ok:true,token,deviceId:id});
  }

  const device=await bearerDevice(request,env);
  if(!device)return json({error:'Cihaz yetkisi geçersiz.'},401);
  await env.DB.prepare('UPDATE native_alarm_devices SET last_seen=? WHERE id=?').bind(now,device.id).run();

  if(path==='/api/native-alarm/reminders'&&request.method==='GET'){
    const from=now-5*60*1000,to=now+48*60*60*1000;
    const reminders=[];

    const rows=(await env.DB.prepare(`SELECT id,title,note,remind_at,notebook_no,entry_status,is_archived,COALESCE(source_type,'manual') source_type
      FROM agenda_entries WHERE COALESCE(remind_at,'')<>'' AND COALESCE(source_type,'manual')='manual'
      AND COALESCE(is_archived,0)=0 AND COALESCE(entry_status,'')<>'Yapıldı' ORDER BY remind_at,id`).all()).results||[];
    for(const note of rows){
      const when=reminderTime(note.remind_at);
      if(!Number.isFinite(when)||when<from||when>to)continue;
      const payload=safePayload(note);
      const ack=await env.DB.prepare('SELECT acked_at FROM native_alarm_acks WHERE device_id=? AND agenda_id=? AND remind_at=?').bind(device.id,payload.id,payload.remind_at).first();
      if(ack)continue;
      reminders.push({...payload,when});
    }

    const meetings=(await env.DB.prepare(`SELECT m.id,m.meeting_no,m.note,m.remind_at,m.remind_note,m.reminder_status,c.company
      FROM meetings m LEFT JOIN customers c ON c.id=m.customer_id
      WHERE COALESCE(m.remind_at,'')<>'' AND COALESCE(m.reminder_status,'')='Açık'
      ORDER BY m.remind_at,m.id`).all()).results||[];
    for(const meeting of meetings){
      const when=reminderTime(meeting.remind_at);
      if(!Number.isFinite(when)||when<from||when>to)continue;
      const payload=safeMeetingPayload(meeting);
      const ack=await env.DB.prepare('SELECT acked_at FROM native_alarm_acks WHERE device_id=? AND agenda_id=? AND remind_at=?').bind(device.id,payload.id,payload.remind_at).first();
      if(ack)continue;
      reminders.push({...payload,when});
    }

    reminders.sort((a,b)=>a.when-b.when||a.id-b.id);
    return json({ok:true,serverNow:now,reminders:reminders.slice(0,100)});
  }

  if(path==='/api/native-alarm/ack'&&request.method==='POST'){
    const b=await body(request),id=Number(b.id)||0,remindAt=String(b.remind_at||'');
    if(!id||!remindAt)return json({error:'Alarm bilgisi eksik.'},400);
    await env.DB.prepare(`INSERT INTO native_alarm_acks(device_id,agenda_id,remind_at,acked_at) VALUES(?,?,?,?)
      ON CONFLICT(device_id,agenda_id,remind_at) DO UPDATE SET acked_at=excluded.acked_at`).bind(device.id,id,remindAt,now).run();
    return json({ok:true});
  }

  if(path==='/api/native-alarm/ping'&&request.method==='GET')return json({ok:true,deviceId:device.id,label:device.label,serverNow:now});
  return json({error:'Bulunamadı'},404);
}
