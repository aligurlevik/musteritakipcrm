const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const schemas=new WeakMap();
async function schema(db){
 if(!schemas.has(db))schemas.set(db,(async()=>{
  await db.prepare('CREATE TABLE IF NOT EXISTS native_alarm_device_owners(token_hash TEXT PRIMARY KEY,owner TEXT NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS native_alarm_code_owners(code_hash TEXT PRIMARY KEY,owner TEXT NOT NULL,expires_at INTEGER NOT NULL)').run();
  await db.prepare("CREATE TABLE IF NOT EXISTS native_alarm_devices_v2(device_token TEXT PRIMARY KEY,device_name TEXT NOT NULL DEFAULT '',paired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await db.prepare('CREATE TABLE IF NOT EXISTS native_alarm_acks_v2(device_token TEXT NOT NULL,agenda_id INTEGER NOT NULL,remind_at TEXT NOT NULL,acked_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(device_token,agenda_id,remind_at))').run();
 })().catch(e=>{schemas.delete(db);throw e}));
 await schemas.get(db);
}
async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function hasTable(db,name){return !!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(name).first()}
export function alarmTime(value){const s=String(value||'').trim().replace(' ','T');if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/i.test(s))return NaN;return Date.parse(s+(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)?'':'+03:00'))}
async function body(request){try{return await request.json()}catch{return {}}}
export async function nativeAlarmBridge(request,env,{forward,getRole,now=Date.now()}){
 const path=new URL(request.url).pathname;
 const handled=['pair-code','code','pair','reminders','ack','ping','status','claim'].some(x=>path==='/api/native-alarm/'+x);
 if(!handled)return null;
 const db=env.DB;await schema(db);
 if(['/api/native-alarm/pair-code','/api/native-alarm/code'].includes(path)){
  const role=await getRole();if(!['admin','graphic'].includes(role))return json({error:'Önce kendi CRM hesabınızla giriş yapın.'},401);
  const response=await forward(request);if(!response.ok)return response;
  const data=await response.clone().json();
  await db.prepare('INSERT OR REPLACE INTO native_alarm_code_owners(code_hash,owner,expires_at) VALUES(?,?,?)').bind(await hash(String(data.code)),role,now+600000).run();
  return response;
 }
 if(path==='/api/native-alarm/pair'){
  const b=await body(request.clone());
  const code=await db.prepare('SELECT owner,expires_at FROM native_alarm_code_owners WHERE code_hash=?').bind(await hash(String(b.code||'').trim())).first();
  if(!code||code.expires_at<now)return json({error:'CRM hesabınızdan yeni bir eşleştirme kodu oluşturun.'},400);
  const response=await forward(request);if(!response.ok)return response;
  const data=await response.clone().json();
  if(data.token)await db.prepare('INSERT OR REPLACE INTO native_alarm_device_owners(token_hash,owner) VALUES(?,?)').bind(await hash(data.token),code.owner).run();
  return response;
 }
 if(path==='/api/native-alarm/status'||path==='/api/native-alarm/claim'){
  const role=await getRole();if(!['admin','graphic'].includes(role))return json({error:'Önce kendi CRM hesabınızla giriş yapın.'},401);
  const rows=(await db.prepare('SELECT device_token,device_name,paired_at,last_seen_at FROM native_alarm_devices_v2 ORDER BY last_seen_at DESC LIMIT 50').all()).results||[];
  const devices=[];
  for(const row of rows){const id=await hash(row.device_token),owner=await db.prepare('SELECT owner FROM native_alarm_device_owners WHERE token_hash=?').bind(id).first();if(owner&&owner.owner!==role)continue;if(!owner&&role!=='admin')continue;const lastSeen=Date.parse(row.last_seen_at.replace(' ','T')+'Z');devices.push({id,label:row.device_name,lastSeen:Number.isFinite(lastSeen)?lastSeen:null,online:Number.isFinite(lastSeen)&&now-lastSeen<=90000,notesLinked:!!owner});}
  if(path==='/api/native-alarm/claim'){
   if(request.method!=='POST'||role!=='admin')return json({error:'Bu işlem Ali hesabına açıktır.'},403);
   const b=await body(request),device=devices.find(d=>d.id===b.id);if(!device)return json({error:'Cihaz bulunamadı.'},404);
   await db.prepare('INSERT OR REPLACE INTO native_alarm_device_owners(token_hash,owner) VALUES(?,?)').bind(device.id,role).run();return json({ok:true});
  }
  const windows=devices.filter(d=>/windows.*alarm/i.test(d.label)),latest=windows[0];
  return json({ok:true,installed:!!latest,online:!!latest?.online,lastSeen:latest?.lastSeen||null,ageSeconds:latest?.lastSeen?Math.max(0,Math.round((now-latest.lastSeen)/1000)):null,label:latest?.label||'',deviceCount:windows.length,devices});
 }
 const token=(request.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/i)?.[1]||'';
 if(!token)return json({error:'Cihaz eşleşmemiş.'},401);
 let device=await db.prepare('SELECT device_token FROM native_alarm_devices_v2 WHERE device_token=?').bind(token).first();
 if(!device&&await hasTable(db,'native_alarm_devices')){
  const legacy=await db.prepare('SELECT id,label FROM native_alarm_devices WHERE token_hash=? AND enabled=1').bind(await hash(token)).first();
  if(legacy){
   await db.prepare('INSERT OR IGNORE INTO native_alarm_devices_v2(device_token,device_name) VALUES(?,?)').bind(token,legacy.label||'Windows Alarm').run();
   if(await hasTable(db,'native_alarm_acks'))await db.prepare('INSERT OR IGNORE INTO native_alarm_acks_v2(device_token,agenda_id,remind_at) SELECT ?,agenda_id,remind_at FROM native_alarm_acks WHERE device_id=? AND agenda_id>0').bind(token,legacy.id).run();
   device={device_token:token};
  }
 }
 if(!device)return json({error:'Cihaz eşleşmemiş.'},401);
 await db.prepare("UPDATE native_alarm_devices_v2 SET last_seen_at=datetime('now') WHERE device_token=?").bind(token).run();
 const owner=(await db.prepare('SELECT owner FROM native_alarm_device_owners WHERE token_hash=?').bind(await hash(token)).first())?.owner;
 if(path==='/api/native-alarm/ping')return json({ok:true,notesLinked:!!owner});
 if(path==='/api/native-alarm/ack'){
  if(request.method!=='POST')return json({error:'Geçersiz işlem.'},405);
  const b=await body(request),id=Number(b.id),remind=String(b.remind_at||'');
  if(!Number.isSafeInteger(id)||!id||!Number.isFinite(alarmTime(remind)))return json({error:'Alarm bilgisi geçersiz.'},400);
  if(id<0){if(!owner||!await hasTable(db,'scratch_notes')||!await db.prepare('SELECT id FROM scratch_notes WHERE id=? AND owner=? AND remind_at=?').bind(-id,owner,remind).first())return json({error:'Not bulunamadı.'},404);}
  await db.prepare('INSERT OR REPLACE INTO native_alarm_acks_v2(device_token,agenda_id,remind_at,acked_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(token,id,remind).run();
  return json({ok:true});
 }
 if(request.method!=='GET')return json({error:'Geçersiz işlem.'},405);
 const reminders=[],from=now-300000,to=now+48*3600000;
 if(await hasTable(db,'agenda_entries')){
  const rows=(await db.prepare("SELECT a.id,a.remind_at,a.note FROM agenda_entries a WHERE COALESCE(a.remind_at,'')<>'' AND COALESCE(a.reminder_status,'')<>'Tamamlandı' AND COALESCE(a.entry_status,'')<>'Yapıldı' AND COALESCE(a.is_archived,0)=0 AND COALESCE(a.notebook_no,1)=1 AND NOT EXISTS (SELECT 1 FROM native_alarm_acks_v2 k WHERE k.device_token=? AND k.agenda_id=a.id AND k.remind_at=a.remind_at)").bind(token).all()).results||[];
  for(const row of rows){const when=alarmTime(row.remind_at);if(when>=from&&when<=to)reminders.push({id:Number(row.id),remind_at:row.remind_at,when,title:'Ajanda Hatırlatması',body:String(row.note||'Hatırlatma zamanı geldi.')});}
 }
 if(owner&&await hasTable(db,'scratch_notes')){
  const rows=(await db.prepare("SELECT n.id,n.title,n.note,n.remind_at FROM scratch_notes n WHERE n.owner=? AND n.done=0 AND COALESCE(n.remind_at,'')<>'' AND NOT EXISTS (SELECT 1 FROM native_alarm_acks_v2 k WHERE k.device_token=? AND k.agenda_id=-n.id AND k.remind_at=n.remind_at)").bind(owner,token).all()).results||[];
  for(const row of rows){const when=alarmTime(row.remind_at);if(when>=from&&when<=to)reminders.push({id:-Number(row.id),remind_at:row.remind_at,when,title:String(row.title||'Not Hatırlatması'),body:String(row.note||row.title||'Hatırlatma zamanı geldi.')});}
 }
 reminders.sort((a,b)=>a.when-b.when||a.id-b.id);
 return json({ok:true,serverNow:now,notesLinked:!!owner,reminders:reminders.slice(0,200)});
}
