import {buildPushPayload} from '@block65/webcrypto-web-push';

const encoder=new TextEncoder();
const schemas=new WeakMap();
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function decode(value){const s=String(value||'');if(!/^[A-Za-z0-9_-]+={0,2}$/.test(s))throw new Error('Geçersiz bildirim anahtarı.');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}

async function admin(request,env){
  const day=new Date().toISOString().slice(0,10),value='admin.'+day;
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.SESSION_SECRET||'change-me'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,encoder.encode(value));
  const expected=value+'.'+Array.from(new Uint8Array(sig),x=>x.toString(16).padStart(2,'0')).join('');
  return (request.headers.get('cookie')||'').match(/(?:^|;\s*)crm_session=([^;]+)/)?.[1]===expected;
}
export async function ensurePushSchema(env){
  if(!schemas.has(env.DB))schemas.set(env.DB,(async()=>{
    for(const sql of [
      `CREATE TABLE IF NOT EXISTS crm_push_config(id INTEGER PRIMARY KEY CHECK(id=1),public_key TEXT NOT NULL,private_key TEXT NOT NULL,subject TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS crm_push_devices(id TEXT PRIMARY KEY,endpoint TEXT NOT NULL UNIQUE,p256dh TEXT NOT NULL,auth TEXT NOT NULL,origin TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,enabled_since INTEGER NOT NULL,last_seen INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS crm_push_deliveries(device_id TEXT NOT NULL,agenda_id INTEGER NOT NULL,remind_at TEXT NOT NULL,delivered_at INTEGER NOT NULL DEFAULT 0,claimed_until INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(device_id,agenda_id,remind_at))`
    ])await env.DB.prepare(sql).run();
  })().catch(error=>{schemas.delete(env.DB);throw error}));
  return schemas.get(env.DB);
}
export async function vapidKeys(env,origin){
  await ensurePushSchema(env);
  let row=await env.DB.prepare('SELECT * FROM crm_push_config WHERE id=1').first();
  if(!row){
    const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
    const publicKey=b64(await crypto.subtle.exportKey('raw',pair.publicKey));
    const privateKey=(await crypto.subtle.exportKey('jwk',pair.privateKey)).d;
    await env.DB.prepare('INSERT OR IGNORE INTO crm_push_config(id,public_key,private_key,subject) VALUES(1,?,?,?)').bind(publicKey,privateKey,origin).run();
    row=await env.DB.prepare('SELECT * FROM crm_push_config WHERE id=1').first();
  }
  return {publicKey:row.public_key,privateKey:row.private_key,subject:row.subject};
}
export async function validSubscription(value){
  const endpoint=String(value?.endpoint||'');
  if(endpoint.length>4096)throw new Error('Bildirim adresi geçersiz.');
  let url;try{url=new URL(endpoint)}catch{throw new Error('Bildirim adresi geçersiz.')}
  const host=url.hostname;
  const allowed=host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||host==='web.push.apple.com'||host.endsWith('.push.apple.com')||host.endsWith('.notify.windows.com');
  if(!allowed||url.protocol!=='https:'||url.username||url.password||url.port||url.hash)throw new Error('Bildirim adresi geçersiz.');
  const p256dh=String(value?.keys?.p256dh||''),auth=String(value?.keys?.auth||'');
  const pub=decode(p256dh),secret=decode(auth);
  if(pub.length!==65||pub[0]!==4||secret.length!==16)throw new Error('Bildirim anahtarı geçersiz.');
  await crypto.subtle.importKey('raw',pub,{name:'ECDH',namedCurve:'P-256'},false,[]);
  return {endpoint,keys:{p256dh,auth},expirationTime:null};
}
export function reminderTime(value){
  const s=String(value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(s))return NaN;
  return Date.parse(s.replace(' ','T')+(/(?:Z|[+-]\d{2}:?\d{2})$/.test(s)?'':'+03:00'));
}
export function reminderPayload(note){
  const title=String(note.title||'').trim(),text=String(note.note||'').trim();
  const notebook=Math.max(1,Math.min(3,Number(note.notebook_no)||1));
  return {title:(title||text.split('\n')[0]||'Ajanda hatırlatması').slice(0,120),body:(text||title).slice(0,650),tag:'agenda-'+note.id+'-'+note.remind_at,id:Number(note.id),remind_at:note.remind_at,url:'/notlar-v2.html?page='+notebook+'&reminder='+note.id};
}
export async function sendPush(device,data,vapid,request=fetch){
  const subscription=await validSubscription({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth}});
  const payload=await buildPushPayload({data,options:{ttl:3600,urgency:'high'}},subscription,vapid);
  return request(device.endpoint,{...payload,redirect:'error',signal:AbortSignal.timeout(10000)});
}
async function deviceFor(env,id,origin){return env.DB.prepare('SELECT * FROM crm_push_devices WHERE id=? AND origin=? AND enabled=1').bind(String(id||''),origin).first()}

export async function pushApi(request,env,{send=sendPush,now=Date.now()}={}){
  const url=new URL(request.url),origin=url.origin;
  if(!await admin(request,env))return json({error:'Yetkisiz'},401);
  if(request.headers.get('origin')&&request.headers.get('origin')!==origin)return json({error:'Yetkisiz'},403);
  await ensurePushSchema(env);
  if(url.pathname==='/api/push/config'&&request.method==='GET')return json({publicKey:(await vapidKeys(env,origin)).publicKey});
  if(request.method!=='POST')return json({error:'Geçersiz işlem.'},405);
  if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Bildirim verisi çok büyük.'},413);
  const text=await request.text();if(text.length>12000)return json({error:'Bildirim verisi çok büyük.'},413);
  let body;try{body=JSON.parse(text)}catch{return json({error:'Bildirim verisi geçersiz.'},400)}
  if(url.pathname==='/api/push/subscribe'){
    let sub;try{sub=await validSubscription(body)}catch{return json({error:'Telefon bildirim kaydı geçersiz.'},400)}
    const old=await env.DB.prepare('SELECT * FROM crm_push_devices WHERE endpoint=?').bind(sub.endpoint).first();
    const id=old?.id||crypto.randomUUID(),since=old?.enabled?old.enabled_since:now;
    await env.DB.prepare(`INSERT INTO crm_push_devices(id,endpoint,p256dh,auth,origin,enabled,enabled_since,last_seen) VALUES(?,?,?,?,?,1,?,?)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,origin=excluded.origin,enabled=1,enabled_since=excluded.enabled_since,last_seen=excluded.last_seen`).bind(id,sub.endpoint,sub.keys.p256dh,sub.keys.auth,origin,since,now).run();
    return json({ok:true,deviceId:id});
  }
  if(url.pathname==='/api/push/unsubscribe'){
    await env.DB.prepare('UPDATE crm_push_devices SET enabled=0 WHERE endpoint=? AND origin=?').bind(String(body.endpoint||''),origin).run();
    return json({ok:true});
  }
  const device=await deviceFor(env,body.deviceId,origin);
  if(!device)return json({error:'Önce telefon bildirimlerini açın.'},404);
  if(url.pathname==='/api/push/test'){
    const result=await send(device,{title:'🔔 Ajanda alarmı denemesi',body:'Yazılı uyarı ve bildirim sesi birlikte çalışır. Telefonun bildirim sesinin açık olduğundan emin olun.',tag:'agenda-test-'+crypto.randomUUID(),url:'/notlar-v2.html'},await vapidKeys(env,origin));
    if(!result.ok)return json({error:'Deneme bildirimi gönderilemedi. Bildirimleri yeniden açın.'},502);
    return json({ok:true});
  }
  if(url.pathname==='/api/push/ack'){
    const note=await env.DB.prepare('SELECT id,remind_at FROM agenda_entries WHERE id=?').bind(Number(body.id)||0).first();
    const time=reminderTime(note?.remind_at);
    if(!note||note.remind_at!==body.remind_at||!Number.isFinite(time)||time>now||now-time>86400000)return json({error:'Hatırlatma bulunamadı.'},400);
    await env.DB.prepare(`INSERT INTO crm_push_deliveries(device_id,agenda_id,remind_at,delivered_at) VALUES(?,?,?,?)
      ON CONFLICT(device_id,agenda_id,remind_at) DO UPDATE SET delivered_at=excluded.delivered_at,claimed_until=0`).bind(device.id,note.id,note.remind_at,now).run();
    return json({ok:true});
  }
  return json({error:'Bulunamadı'},404);
}

export async function deliverDueReminders(env,{now=Date.now(),send=sendPush}={}){
  await ensurePushSchema(env);
  const devices=(await env.DB.prepare('SELECT * FROM crm_push_devices WHERE enabled=1').all()).results||[];
  if(!devices.length)return {sent:0};
  const config=await env.DB.prepare('SELECT * FROM crm_push_config WHERE id=1').first();
  if(!config)return {sent:0};
  const vapid={publicKey:config.public_key,privateKey:config.private_key,subject:config.subject};
  const cutoff=new Date(now-86400000).toISOString().slice(0,10),lastDay=new Date(now+86400000).toISOString().slice(0,10);
  const notes=(await env.DB.prepare(`SELECT id,title,note,remind_at,notebook_no FROM agenda_entries
    WHERE COALESCE(source_type,'manual')='manual' AND COALESCE(is_archived,0)=0 AND COALESCE(entry_status,'')<>'Yapıldı'
    AND COALESCE(reminder_status,'')<>'Tamamlandı' AND substr(remind_at,1,10)>=? AND substr(remind_at,1,10)<=?
    ORDER BY remind_at,id`).bind(cutoff,lastDay).all()).results||[];
  let sent=0;
  for(const note of notes){
    const time=reminderTime(note.remind_at);
    if(!Number.isFinite(time)||time>now||now-time>86400000)continue;
    for(const device of devices){
      if(!device.enabled||time<device.enabled_since)continue;
      const claim=await env.DB.prepare(`INSERT INTO crm_push_deliveries(device_id,agenda_id,remind_at,claimed_until) VALUES(?,?,?,?)
        ON CONFLICT(device_id,agenda_id,remind_at) DO UPDATE SET claimed_until=excluded.claimed_until
        WHERE crm_push_deliveries.delivered_at=0 AND crm_push_deliveries.claimed_until<=? RETURNING device_id`).bind(device.id,note.id,note.remind_at,now+120000,now).first();
      if(!claim)continue;
      try{
        const result=await send(device,reminderPayload(note),vapid);
        if(result.ok){
          await env.DB.prepare('UPDATE crm_push_deliveries SET delivered_at=?,claimed_until=0 WHERE device_id=? AND agenda_id=? AND remind_at=?').bind(now,device.id,note.id,note.remind_at).run();
          sent++;
        }else{
          if(result.status===404||result.status===410){device.enabled=0;await env.DB.prepare('UPDATE crm_push_devices SET enabled=0 WHERE id=?').bind(device.id).run()}
          await env.DB.prepare('UPDATE crm_push_deliveries SET claimed_until=0 WHERE device_id=? AND agenda_id=? AND remind_at=?').bind(device.id,note.id,note.remind_at).run();
          console.warn('Ajanda push service status',result.status);
        }
      }catch{
        await env.DB.prepare('UPDATE crm_push_deliveries SET claimed_until=0 WHERE device_id=? AND agenda_id=? AND remind_at=?').bind(device.id,note.id,note.remind_at).run();
        console.warn('Ajanda push delivery will retry');
      }
    }
  }
  await env.DB.prepare('DELETE FROM crm_push_deliveries WHERE delivered_at>0 AND delivered_at<?').bind(now-604800000).run();
  return {sent};
}
