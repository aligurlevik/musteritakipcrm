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
async function tableColumns(env,table){
  const result=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((result.results||[]).map(row=>row.name));
}
async function ensureColumn(env,table,name,definition){
  const columns=await tableColumns(env,table);
  if(!columns.has(name))await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run();
}
export async function ensurePushSchema(env){
  if(!schemas.has(env.DB))schemas.set(env.DB,(async()=>{
    for(const sql of [
      `CREATE TABLE IF NOT EXISTS crm_push_config(id INTEGER PRIMARY KEY CHECK(id=1),public_key TEXT NOT NULL,private_key TEXT NOT NULL,subject TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS crm_push_devices(id TEXT PRIMARY KEY,endpoint TEXT NOT NULL UNIQUE,p256dh TEXT NOT NULL,auth TEXT NOT NULL,origin TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,enabled_since INTEGER NOT NULL,last_seen INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS crm_push_deliveries(device_id TEXT NOT NULL,agenda_id INTEGER NOT NULL,remind_at TEXT NOT NULL,delivered_at INTEGER NOT NULL DEFAULT 0,claimed_until INTEGER NOT NULL DEFAULT 0,confirmed INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(device_id,agenda_id,remind_at))`,
      `CREATE TABLE IF NOT EXISTS crm_push_runtime(id INTEGER PRIMARY KEY CHECK(id=1),last_started_at INTEGER NOT NULL DEFAULT 0,last_finished_at INTEGER NOT NULL DEFAULT 0,last_sent INTEGER NOT NULL DEFAULT 0,last_devices INTEGER NOT NULL DEFAULT 0,last_due INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '')`
    ])await env.DB.prepare(sql).run();
    await ensureColumn(env,'crm_push_deliveries','confirmed','INTEGER NOT NULL DEFAULT 0');
    await ensureColumn(env,'crm_push_deliveries','attempts','INTEGER NOT NULL DEFAULT 0');
    await ensureColumn(env,'crm_push_deliveries','last_status','INTEGER NOT NULL DEFAULT 0');
    await ensureColumn(env,'crm_push_deliveries','last_error',"TEXT NOT NULL DEFAULT ''");
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
  if(notebook>1)return {title:'🔒 Özel not hatırlatıcısı',body:'İçeriği görmek için Not '+notebook+' özel şifresini girin.',tag:'agenda-'+note.id+'-'+note.remind_at,id:Number(note.id),remind_at:note.remind_at,url:'/notlar-v2.html?page='+notebook+'&reminder='+note.id};
  return {title:(title||text.split('\n')[0]||'Ajanda hatırlatması').slice(0,120),body:(text||title).slice(0,650),tag:'agenda-'+note.id+'-'+note.remind_at,id:Number(note.id),remind_at:note.remind_at,url:'/notlar-v2.html?page='+notebook+'&reminder='+note.id};
}
export async function sendPush(device,data,vapid,request=fetch){
  const subscription=await validSubscription({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth}});
  const payload=await buildPushPayload({data,options:{ttl:3600,urgency:'high'}},subscription,vapid);
  // Cloudflare Workers/Web Push örneğindeki FetchInit'i değiştirmeden gönder.
  // Bazı Android push servisleri eklenen redirect/signal seçeneklerinde isteği
  // daha servise ulaşmadan reddedebiliyor.
  return request(device.endpoint,payload);
}

async function vapidWakeHeaders(subscription,vapid,clock=Date.now()){
  const endpoint=new URL(subscription.endpoint),pub=decode(vapid.publicKey);
  if(pub.length!==65||pub[0]!==4)throw new Error('Geçersiz VAPID public key.');
  const x=b64(pub.slice(1,33)),y=b64(pub.slice(33,65));
  const key=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x,y,d:vapid.privateKey,ext:true,key_ops:['sign']},{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const head=b64(encoder.encode(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const body=b64(encoder.encode(JSON.stringify({aud:endpoint.origin,exp:Math.floor(clock/1000)+43200,sub:vapid.subject})));
  const signing=head+'.'+body;
  const sig=b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode(signing)));
  return {authorization:'vapid t='+signing+'.'+sig+', k='+vapid.publicKey,ttl:'3600',urgency:'high'};
}
export async function sendWakePush(device,_data,vapid,request=fetch){
  const subscription=await validSubscription({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth}});
  return request(device.endpoint,{method:'POST',headers:await vapidWakeHeaders(subscription,vapid)});
}
async function deviceFor(env,id,origin){return env.DB.prepare('SELECT * FROM crm_push_devices WHERE id=? AND origin=? AND enabled=1').bind(String(id||''),origin).first()}

export async function pushApi(request,env,{send=sendPush,now=Date.now()}={}){
  const url=new URL(request.url),origin=url.origin;
  await ensurePushSchema(env);

  if(url.pathname==='/api/push/pull'&&request.method==='POST'){
    if(request.headers.get('origin')&&request.headers.get('origin')!==origin)return json({error:'Yetkisiz'},403);
    let body={};try{body=await request.json()}catch{return json({error:'Bildirim isteği geçersiz.'},400)}
    const endpoint=String(body.endpoint||'');
    const device=await env.DB.prepare('SELECT * FROM crm_push_devices WHERE endpoint=? AND enabled=1').bind(endpoint).first();
    if(!device)return json({error:'Bildirim cihazı bulunamadı.'},404);
    const cutoff=new Date(now-86400000).toISOString().slice(0,10),lastDay=new Date(now+86400000).toISOString().slice(0,10);
    const rows=(await env.DB.prepare(`SELECT id,title,note,remind_at,notebook_no FROM agenda_entries
      WHERE COALESCE(source_type,'manual')='manual' AND COALESCE(is_archived,0)=0 AND COALESCE(entry_status,'')<>'Yapıldı'
      AND substr(remind_at,1,10)>=? AND substr(remind_at,1,10)<=?
      ORDER BY remind_at,id`).bind(cutoff,lastDay).all()).results||[];
    const reminders=[];
    for(const note of rows){
      const time=reminderTime(note.remind_at);
      if(!Number.isFinite(time)||time>now||now-time>86400000||time<Number(device.enabled_since||0)-15*60*1000)continue;
      const state=await env.DB.prepare('SELECT confirmed FROM crm_push_deliveries WHERE device_id=? AND agenda_id=? AND remind_at=?').bind(device.id,note.id,note.remind_at).first();
      if(Number(state?.confirmed||0)===1)continue;
      reminders.push({...reminderPayload(note),deviceId:device.id});
      if(reminders.length>=10)break;
    }
    await env.DB.prepare('UPDATE crm_push_devices SET last_seen=? WHERE id=?').bind(now,device.id).run();
    return json({ok:true,reminders});
  }

  // Service Worker acknowledgement: the random device id is only delivered
  // inside the encrypted Web Push payload. This endpoint lets a closed app
  // confirm that the push event really reached the device.
  if(url.pathname==='/api/push/received'&&request.method==='POST'){
    if(request.headers.get('origin')&&request.headers.get('origin')!==origin)return json({error:'Yetkisiz'},403);
    let body={};try{body=await request.json()}catch{return json({error:'Bildirim onayı geçersiz.'},400)}
    const device=await env.DB.prepare('SELECT id FROM crm_push_devices WHERE id=? AND enabled=1').bind(String(body.deviceId||'')).first();
    const note=await env.DB.prepare('SELECT id,remind_at FROM agenda_entries WHERE id=?').bind(Number(body.id)||0).first();
    const time=reminderTime(note?.remind_at);
    if(!device||!note||note.remind_at!==body.remind_at||!Number.isFinite(time)||time>now||now-time>86400000)return json({error:'Hatırlatma bulunamadı.'},400);
    await env.DB.prepare(`INSERT INTO crm_push_deliveries(device_id,agenda_id,remind_at,delivered_at,claimed_until,confirmed,attempts) VALUES(?,?,?,?,0,1,1)
      ON CONFLICT(device_id,agenda_id,remind_at) DO UPDATE SET delivered_at=excluded.delivered_at,claimed_until=0,confirmed=1`)
      .bind(device.id,note.id,note.remind_at,now).run();
    return json({ok:true});
  }

  if(!await admin(request,env))return json({error:'Yetkisiz'},401);
  if(request.headers.get('origin')&&request.headers.get('origin')!==origin)return json({error:'Yetkisiz'},403);
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
    const result=await send(device,{title:'🔔 Ajanda alarmı denemesi',body:'Sunucudan gelen gerçek push testidir.',tag:'agenda-test-'+crypto.randomUUID(),url:'/notlar-v2.html'},await vapidKeys(env,origin));
    if(!result.ok)return json({error:'Deneme bildirimi gönderilemedi. Bildirimleri yeniden açın.'},502);
    return json({ok:true});
  }
  if(url.pathname==='/api/push/ack'){
    const note=await env.DB.prepare('SELECT id,remind_at FROM agenda_entries WHERE id=?').bind(Number(body.id)||0).first();
    const time=reminderTime(note?.remind_at);
    if(!note||note.remind_at!==body.remind_at||!Number.isFinite(time)||time>now||now-time>86400000)return json({error:'Hatırlatma bulunamadı.'},400);
    await env.DB.prepare(`INSERT INTO crm_push_deliveries(device_id,agenda_id,remind_at,delivered_at,claimed_until,confirmed,attempts) VALUES(?,?,?,?,0,1,1)
      ON CONFLICT(device_id,agenda_id,remind_at) DO UPDATE SET delivered_at=excluded.delivered_at,claimed_until=0,confirmed=1`).bind(device.id,note.id,note.remind_at,now).run();
    return json({ok:true});
  }
  return json({error:'Bulunamadı'},404);
}

export async function pushHealth(env,{now=Date.now()}={}){
  await ensurePushSchema(env);
  const runtime=await env.DB.prepare('SELECT * FROM crm_push_runtime WHERE id=1').first();
  const devices=await env.DB.prepare('SELECT COUNT(*) n FROM crm_push_devices WHERE enabled=1').first();
  const config=await env.DB.prepare('SELECT COUNT(*) n FROM crm_push_config WHERE id=1').first();
  const recent=(await env.DB.prepare(`SELECT id,remind_at,reminder_status,entry_status,COALESCE(source_type,'manual') source_type,COALESCE(is_archived,0) is_archived,COALESCE(notebook_no,1) notebook_no
    FROM agenda_entries WHERE COALESCE(remind_at,'')<>'' ORDER BY id DESC LIMIT 8`).all()).results||[];
  const deliveryStates=(await env.DB.prepare(`SELECT agenda_id,remind_at,confirmed,attempts,delivered_at,claimed_until,last_status,last_error
    FROM crm_push_deliveries WHERE agenda_id IN (SELECT id FROM agenda_entries WHERE COALESCE(remind_at,'')<>'' ORDER BY id DESC LIMIT 8)
    ORDER BY agenda_id DESC,device_id`).all()).results||[];
  const rawDevices=(await env.DB.prepare('SELECT id,endpoint,enabled_since,last_seen FROM crm_push_devices WHERE enabled=1 ORDER BY enabled_since').all()).results||[];
  const deviceStates=rawDevices.map(d=>({id:String(d.id).slice(0,8),endpointHost:(()=>{try{return new URL(String(d.endpoint)).hostname}catch{return ''}})(),enabled_since:d.enabled_since,last_seen:d.last_seen}));
  const due=recent.filter(note=>{
    const time=reminderTime(note.remind_at);
    return Number.isFinite(time)&&time<=now&&now-time<=86400000&&String(note.entry_status||'')!=='Yapıldı'&&Number(note.is_archived||0)===0&&String(note.source_type||'manual')==='manual';
  });
  const lastFinished=Number(runtime?.last_finished_at||0);
  return {
    ok:true,
    now,
    cronHealthy:Boolean(lastFinished&&now-lastFinished<180000),
    cronAgeSeconds:lastFinished?Math.max(0,Math.round((now-lastFinished)/1000)):null,
    lastStartedAt:Number(runtime?.last_started_at||0),
    lastFinishedAt:lastFinished,
    lastSent:Number(runtime?.last_sent||0),
    lastDevices:Number(runtime?.last_devices||0),
    lastDue:Number(runtime?.last_due||0),
    lastError:String(runtime?.last_error||''),
    enabledDevices:Number(devices?.n||0),
    configured:Number(config?.n||0)>0,
    dueNow:due.length,
    recentReminders:recent,
    deliveryStates,
    deviceStates
  };
}

export async function deliverDueReminders(env,{now=Date.now(),send=sendWakePush}={}){
  await ensurePushSchema(env);
  await env.DB.prepare(`INSERT INTO crm_push_runtime(id,last_started_at,last_error) VALUES(1,?,'')
    ON CONFLICT(id) DO UPDATE SET last_started_at=excluded.last_started_at,last_error=''`).bind(now).run();
  let sent=0,deviceCount=0,dueCount=0;
  try{
    const devices=(await env.DB.prepare('SELECT * FROM crm_push_devices WHERE enabled=1').all()).results||[];
    deviceCount=devices.length;
    const config=await env.DB.prepare('SELECT * FROM crm_push_config WHERE id=1').first();
    if(!devices.length||!config){
      await env.DB.prepare('UPDATE crm_push_runtime SET last_finished_at=?,last_sent=0,last_devices=?,last_due=0,last_error=? WHERE id=1')
        .bind(now,deviceCount,!config?'VAPID yapılandırması yok':'').run();
      return {sent:0};
    }
    const vapid={publicKey:config.public_key,privateKey:config.private_key,subject:config.subject};
    const cutoff=new Date(now-86400000).toISOString().slice(0,10),lastDay=new Date(now+86400000).toISOString().slice(0,10);
    const notes=(await env.DB.prepare(`SELECT id,title,note,remind_at,notebook_no FROM agenda_entries
      WHERE COALESCE(source_type,'manual')='manual' AND COALESCE(is_archived,0)=0 AND COALESCE(entry_status,'')<>'Yapıldı'
      AND COALESCE(reminder_status,'')<>'Tamamlandı' AND substr(remind_at,1,10)>=? AND substr(remind_at,1,10)<=?
      ORDER BY remind_at,id`).bind(cutoff,lastDay).all()).results||[];
    const due=[];
    for(const note of notes){
      const time=reminderTime(note.remind_at);
      if(Number.isFinite(time)&&time<=now&&now-time<=86400000)due.push({note,time});
    }
    dueCount=due.length;
    for(const {note,time} of due){
      for(const device of devices){
        if(!device.enabled||time<device.enabled_since-15*60*1000)continue;
        const claim=await env.DB.prepare(`INSERT INTO crm_push_deliveries(device_id,agenda_id,remind_at,claimed_until,confirmed,attempts) VALUES(?,?,?,?,0,1)
          ON CONFLICT(device_id,agenda_id,remind_at) DO UPDATE SET claimed_until=excluded.claimed_until,attempts=crm_push_deliveries.attempts+1
          WHERE COALESCE(crm_push_deliveries.confirmed,0)=0 AND crm_push_deliveries.claimed_until<=? RETURNING device_id`).bind(device.id,note.id,note.remind_at,now+120000,now).first();
        if(!claim)continue;
        try{
          const data={...reminderPayload(note),deviceId:device.id};
          const result=await send(device,data,vapid);
          if(result.ok){
            await env.DB.prepare("UPDATE crm_push_deliveries SET last_status=?,last_error='' WHERE device_id=? AND agenda_id=? AND remind_at=?")
              .bind(result.status,device.id,note.id,note.remind_at).run();
            // Acceptance by FCM/Apple/Windows is not proof that the device
            // displayed the notification. Keep it unconfirmed and retry
            // after the claim window unless the Service Worker acknowledges it.
            sent++;
          }else{
            await env.DB.prepare("UPDATE crm_push_deliveries SET last_status=?,last_error=? WHERE device_id=? AND agenda_id=? AND remind_at=?")
              .bind(result.status,'push service '+result.status,device.id,note.id,note.remind_at).run();
            if(result.status===404||result.status===410){device.enabled=0;await env.DB.prepare('UPDATE crm_push_devices SET enabled=0 WHERE id=?').bind(device.id).run()}
            await env.DB.prepare('UPDATE crm_push_deliveries SET claimed_until=0 WHERE device_id=? AND agenda_id=? AND remind_at=?').bind(device.id,note.id,note.remind_at).run();
            console.warn('Ajanda push service status',result.status);
          }
        }catch(error){
          const message=String(error?.message||error?.name||'Push error').slice(0,240);
          await env.DB.prepare("UPDATE crm_push_deliveries SET claimed_until=0,last_status=0,last_error=? WHERE device_id=? AND agenda_id=? AND remind_at=?")
            .bind(message,device.id,note.id,note.remind_at).run();
          console.warn('Ajanda push delivery will retry',error?.name||'Error');
        }
      }
    }
    await env.DB.prepare('DELETE FROM crm_push_deliveries WHERE delivered_at>0 AND delivered_at<?').bind(now-604800000).run();
    await env.DB.prepare('UPDATE crm_push_runtime SET last_finished_at=?,last_sent=?,last_devices=?,last_due=?,last_error=? WHERE id=1')
      .bind(now,sent,deviceCount,dueCount,'').run();
    return {sent};
  }catch(error){
    const message=String(error?.message||error||'Bilinmeyen cron hatası').slice(0,500);
    await env.DB.prepare('UPDATE crm_push_runtime SET last_finished_at=?,last_sent=?,last_devices=?,last_due=?,last_error=? WHERE id=1')
      .bind(now,sent,deviceCount,dueCount,message).run().catch(()=>{});
    throw error;
  }
}
