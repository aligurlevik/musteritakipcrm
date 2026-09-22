import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {Script} from 'node:vm';
import test from 'node:test';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const {ensurePushSchema,pushApi,deliverDueReminders,reminderTime,sendPush}=await import('../src/phone_reminders.js');
const {default:worker}=await import('../src/phone_reminders_entry.js');
const now=Date.parse('2030-09-20T09:00:30Z'),secret='push-test-session';
const b64=bytes=>Buffer.from(bytes).toString('base64url');
const subscription=(async()=>{
  const keys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  return {endpoint:'https://fcm.googleapis.com/fcm/send/test-phone',expirationTime:null,keys:{p256dh:b64(await crypto.subtle.exportKey('raw',keys.publicKey)),auth:b64(crypto.getRandomValues(new Uint8Array(16)))},privateKey:keys.privateKey};
})();
async function fixture(){
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE agenda_entries(id INTEGER PRIMARY KEY,title TEXT DEFAULT '',note TEXT,remind_at TEXT,notebook_no INTEGER DEFAULT 1,source_type TEXT DEFAULT 'manual',is_archived INTEGER DEFAULT 0,entry_status TEXT DEFAULT 'Yapılacak',reminder_status TEXT DEFAULT 'Açık')`);
  const env={
    SESSION_SECRET:secret,
    DB:{
      prepare(sql){
        let values=[];
        return {
          bind(...v){values=v;return this},
          async first(){return db.prepare(sql).get(...values)||null},
          async all(){return {results:db.prepare(sql).all(...values)}},
          async run(){const result=db.prepare(sql).run(...values);return {meta:{changes:result.changes,last_row_id:Number(result.lastInsertRowid)}}}
        };
      }
    },
    ASSETS:{
      async fetch(request){
        const path=new URL(request.url).pathname;
        try{return new Response(await readFile('public'+(path==='/'?'/index.html':path)),{headers:{'content-type':path.endsWith('.js')?'application/javascript':'text/html; charset=utf-8'}})}
        catch{return new Response('Bulunamadı',{status:404})}
      }
    }
  };
  await ensurePushSchema(env);
  const day=new Date().toISOString().slice(0,10),text=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',text.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=b64(await crypto.subtle.sign('HMAC',key,text.encode('admin.'+day)));
  const cookie='crm_session=admin.'+day+'.'+Buffer.from(signature,'base64url').toString('hex');
  async function request(path,body,authenticated=true,extra={},clock=now-120000){
    const headers={'content-type':'application/json',...extra};if(authenticated)headers.cookie=cookie;
    return pushApi(new Request('https://crm.test'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),env,{now:clock});
  }
  await request('/api/push/config');
  const sub=await subscription;
  const result=await request('/api/push/subscribe',sub);
  assert.equal(result.status,200);
  const deviceId=(await result.json()).deviceId;
  const note=(id,opts={})=>{const row={title:'Başlık '+id,note:'Ekranda görülecek uyarı '+id,remind_at:'2030-09-20T12:00',notebook_no:1,entry_status:'Yapılacak',is_archived:0,reminder_status:'Açık',...opts};db.prepare('INSERT INTO agenda_entries(id,title,note,remind_at,notebook_no,entry_status,is_archived,reminder_status) VALUES(?,?,?,?,?,?,?,?)').run(id,row.title,row.note,row.remind_at,row.notebook_no,row.entry_status,row.is_archived,row.reminder_status)};
  return {db,env,request,deviceId,note};
}

test('push registration requires an admin session, rejects other origins and invalid endpoints',async()=>{
  const f=await fixture(),sub=await subscription;
  assert.equal((await f.request('/api/push/config',undefined,false)).status,401);
  assert.equal((await f.request('/api/push/subscribe',sub,true,{origin:'https://other.test'})).status,403);
  for(const endpoint of ['http://fcm.googleapis.com/send/a','https://example.com/private','https://fcm.googleapis.com.evil.test/send/a','https://fcm.googleapis.com:8443/send/a','https://user:pass@fcm.googleapis.com/send/a'])assert.equal((await f.request('/api/push/subscribe',{...sub,endpoint})).status,400);
  assert.equal((await f.request('/api/push/subscribe',{...sub,keys:{...sub.keys,auth:'invalid'}})).status,400);
  const first=await (await f.request('/api/push/config')).json(),second=await (await f.request('/api/push/config')).json();
  assert.deepEqual(Object.keys(first),['publicKey']);assert.equal(first.publicKey,second.publicKey);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM crm_push_devices').get().n,1);
});

test('Istanbul reminders fire at the correct instant including midnight and explicit time zones',()=>{
  assert.equal(reminderTime('2030-09-20T12:00'),Date.parse('2030-09-20T09:00Z'));
  assert.equal(reminderTime('2030-09-21T00:00'),Date.parse('2030-09-20T21:00Z'));
  assert.equal(reminderTime('2030-09-20 12:00:15'),Date.parse('2030-09-20T09:00:15Z'));
  assert.equal(reminderTime('2030-09-20T09:00Z'),Date.parse('2030-09-20T09:00Z'));
  assert.ok(Number.isNaN(reminderTime('12:00')));
});

test('closed-app scheduling includes all notebooks, ignores completion/archive, and does not repeat',async()=>{
  const f=await fixture();for(let notebook=1;notebook<=3;notebook++)f.note(notebook,{notebook_no:notebook,reminder_status:notebook===2?'Çaldı':'Açık'});
  f.note(4,{entry_status:'Yapıldı'});f.note(5,{is_archived:1});f.note(6,{remind_at:'2030-09-20T12:01'});f.note(7,{remind_at:'2028-01-01T12:00'});f.note(8,{remind_at:'2030-09-20T11:00'});
  const sent=[],send=async(device,data)=>{sent.push({device,data});return new Response('',{status:201})};
  assert.equal((await deliverDueReminders(f.env,{now,send})).sent,3);
  assert.deepEqual(sent.map(x=>x.data.id),[1,2,3]);assert.equal(sent[2].data.url,'/notlar-v2.html?page=3&reminder=3');assert.equal(sent[0].data.title,'Başlık 1');assert.equal(sent[0].data.body,'Ekranda görülecek uyarı 1');
  assert.equal(sent[2].data.title,'🔒 Özel not hatırlatıcısı');assert.equal(sent[2].data.body,'İçeriği görmek için Not 3 özel şifresini girin.');assert.ok(!sent[2].data.body.includes('Ekranda görülecek uyarı 3'));
  assert.equal((await deliverDueReminders(f.env,{now:now+10000,send})).sent,0);
  f.db.prepare('UPDATE agenda_entries SET remind_at=? WHERE id=1').run('2030-09-20T12:01');
  assert.equal((await deliverDueReminders(f.env,{now:now+60000,send})).sent,2);
});

test('temporary push failures retry, expired phone subscriptions stop, and concurrent cron runs claim once',async()=>{
  const f=await fixture();f.note(1);
  await deliverDueReminders(f.env,{now,send:async()=>new Response('',{status:503})});
  assert.equal(f.db.prepare('SELECT delivered_at,claimed_until FROM crm_push_deliveries').get().delivered_at,0);
  let attempts=0;const send=async()=>{attempts++;await new Promise(resolve=>setTimeout(resolve,5));return new Response('',{status:201})};
  await Promise.all([deliverDueReminders(f.env,{now:now+10000,send}),deliverDueReminders(f.env,{now:now+10000,send})]);assert.equal(attempts,1);
  f.note(2);await deliverDueReminders(f.env,{now:now+20000,send:async()=>new Response('',{status:410})});
  assert.equal(f.db.prepare('SELECT enabled FROM crm_push_devices').get().enabled,0);
});

test('foreground acknowledgement suppresses this phone only and turning notifications off stops scheduling',async()=>{
  const f=await fixture(),sub=await subscription;f.note(1,{remind_at:'2030-09-20T11:59'});
  const second=await (await f.request('/api/push/subscribe',{...sub,endpoint:sub.endpoint+'-second'})).json();
  assert.equal((await f.request('/api/push/ack',{deviceId:f.deviceId,id:1,remind_at:'2030-09-20T11:59'},true,{},now)).status,200);
  const devices=[];await deliverDueReminders(f.env,{now,send:async device=>{devices.push(device.id);return new Response('',{status:201})}});assert.deepEqual(devices,[second.deviceId]);
  await f.request('/api/push/unsubscribe',{endpoint:sub.endpoint+'-second'});f.note(2);f.db.prepare('UPDATE crm_push_devices SET enabled=0').run();
  assert.equal((await deliverDueReminders(f.env,{now,send:async()=>{throw new Error('disabled devices must not send')}})).sent,0);
});

test('the actual web push payload uses modern encryption, decrypts to the reminder, and signs valid VAPID',async()=>{
  const f=await fixture(),sub=await subscription,device=f.db.prepare('SELECT * FROM crm_push_devices').get(),config=f.db.prepare('SELECT * FROM crm_push_config').get();
  const data={title:'Sesli alarm',body:'Telefon ekranında yazı',tag:'agenda-test'};
  await sendPush(device,data,{publicKey:config.public_key,privateKey:config.private_key,subject:config.subject},async(endpoint,options)=>{
    assert.equal(endpoint,sub.endpoint);assert.equal(options.headers['content-encoding'],'aes128gcm');assert.equal(options.headers.urgency,'high');assert.equal(options.method,'post');assert.equal(options.redirect,undefined);assert.equal(options.signal,undefined);
    const auth=options.headers.authorization;assert.match(auth,/^vapid t=.+,\s*k=/);
    const token=auth.match(/t=([^, ]+)/)[1],parts=token.split('.'),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
    assert.equal(claims.aud,'https://fcm.googleapis.com');assert.equal(claims.sub,'https://crm.test');
    const verifyKey=await crypto.subtle.importKey('raw',Buffer.from(config.public_key,'base64url'),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    assert.ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},verifyKey,Buffer.from(parts[2],'base64url'),new TextEncoder().encode(parts[0]+'.'+parts[1])));
    const body=new Uint8Array(options.body),salt=body.slice(0,16),serverPublic=body.slice(21,21+body[20]),encrypted=body.slice(21+body[20]);
    const pub=await crypto.subtle.importKey('raw',serverPublic,{name:'ECDH',namedCurve:'P-256'},false,[]);
    const shared=await crypto.subtle.deriveBits({name:'ECDH',public:pub},sub.privateKey,256);
    const hkdf=async(secret,salt,info,length)=>{const key=await crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveBits']);return crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8)};
    const info=Buffer.concat([Buffer.from('WebPush: info\0'),Buffer.from(sub.keys.p256dh,'base64url'),Buffer.from(serverPublic)]);
    const ikm=await hkdf(shared,Buffer.from(sub.keys.auth,'base64url'),info,32),cek=await hkdf(ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16),nonce=await hkdf(ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
    const aes=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['decrypt']);
    const plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},aes,encrypted));
    let end=plaintext.length-1;while(plaintext[end]===0)end--;assert.equal(plaintext[end],2);
    assert.deepEqual(JSON.parse(new TextDecoder().decode(plaintext.slice(0,end))),data);
    return new Response('',{status:201});
  });
});

test('service worker shows visible, audible notifications and notification clicks keep navigation inside the app',async()=>{
  const listeners={},notifications=[],opened=[],messages=[];
  const self={location:{origin:'https://crm.test'},addEventListener(name,fn){listeners[name]=fn},registration:{async showNotification(title,options){notifications.push({title,options})}},clients:{async matchAll(){return [{url:'https://crm.test/notlar-v2.html',postMessage(message){messages.push(message)}}]},async openWindow(url){opened.push(url)}}};
  new Script(await readFile('public/agenda-sw.js','utf8')).runInNewContext({self,URL});
  let promise;listeners.push({data:{json:()=>({title:'Başlık',body:'Uyarı metni',url:'/notlar-v2.html?page=2',tag:'agenda-1'})},waitUntil(p){promise=p}});await promise;
  assert.equal(notifications[0].options.silent,false);assert.ok(notifications[0].options.vibrate.length);assert.equal(notifications[0].options.requireInteraction,true);assert.equal(messages[0].type,'CRM_REMINDER');
  self.clients.matchAll=async()=>[];listeners.notificationclick({notification:{data:{url:'https://other.test/'},close(){}},waitUntil(p){promise=p}});await promise;assert.equal(opened[0],'https://crm.test/notlar-v2.html');
});

test('deployed entry serves phone assets and loads note palettes once on note pages',async()=>{
  const f=await fixture();
  const sw=await worker.fetch(new Request('https://crm.test/agenda-sw.js'),f.env,{});assert.equal(sw.status,200);assert.equal(sw.headers.get('service-worker-allowed'),'/');assert.match(sw.headers.get('content-type'),/javascript/);
  const palette=await worker.fetch(new Request('https://crm.test/note-color-palette.js'),f.env,{});assert.equal(palette.status,200);assert.match(palette.headers.get('cache-control'),/no-cache/);assert.match(await palette.text(),/Açık zemin renkleri/);
  for(const path of ['/','/notlar-v2.html','/yeni-not.html','/planlama.html']){
    const response=await worker.fetch(new Request('https://crm.test'+path,{headers:{'user-agent':'Mozilla/5.0 (Linux; Android 14) Mobile'}}),f.env,{}),html=await response.text();
    assert.equal(response.status,200);assert.equal((html.match(/src="\/phone-reminders\.js/g)||[]).length,1);assert.equal((html.match(/src="\/phone-notification-controls\.js/g)||[]).length,1);if(html.includes('function checkAlarm'))assert.ok(html.indexOf('/phone-reminders.js')<html.indexOf('function checkAlarm'));assert.ok(!html.includes('src="/mobile-notification-permission.js'));
    assert.equal((html.match(/src="\/note-color-palette\.js/g)||[]).length,path==='/planlama.html'?0:1);
    if(path==='/planlama.html'){
      assert.match(html,/data-planner-version="google-calendar-v1"/);
      assert.match(html,/data-view="day"/);
      assert.match(html,/data-view="week"/);
      assert.match(html,/data-view="month"/);
      assert.match(html,/function noteDetail\(item\)/);
      assert.match(html,/class="monthEventNote"/);
      assert.match(html,/class="eventNote"/);
      assert.match(html,/data-filter="note"/);
      assert.match(html,/data-filter="reminder"/);
      assert.match(html,/state\.filter==='all'\|\|typeFilter\(item\.note_type\)===state\.filter/);
      assert.match(html,/state\.filter=state\.filter===button\.dataset\.filter\?'all':button\.dataset\.filter/);
      assert.ok(!html.includes('src="/planlama-daily-patch.js'));
      assert.ok(!html.includes('src="/planlama-monthly-patch.js'));
    }
  const desktop=await worker.fetch(new Request('https://crm.test/',{headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}}),f.env,{});
  const desktopHtml=await desktop.text();
  assert.equal((desktopHtml.match(/src="\/phone-reminders\.js/g)||[]).length,1);
  assert.equal((desktopHtml.match(/src="\/phone-notification-controls\.js/g)||[]).length,1);
  }
});
