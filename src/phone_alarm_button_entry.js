import worker from './portfolio_company_link_entry.js';

function addPhoneAlarmButton(html){
  if(html.includes('data-phone-alarm-button'))return html;
  const ui=`<style data-phone-alarm-button>#phoneAlarmBtn{position:fixed;right:18px;bottom:18px;z-index:99990;border:0;border-radius:12px;padding:12px 16px;background:#16a34a;color:white;font-weight:900;cursor:pointer;box-shadow:0 8px 24px #0003}#phoneAlarmBox{display:none;position:fixed;inset:0;z-index:99999;background:#0008;align-items:center;justify-content:center}#phoneAlarmBox.open{display:flex}#phoneAlarmCard{width:min(430px,92vw);background:white;border-radius:16px;padding:24px;text-align:center}#phoneAlarmCode{font-size:42px;font-weight:900;letter-spacing:8px;margin:18px 0}</style><button id="phoneAlarmBtn" type="button">📱 Telefon Alarmını Bağla</button><div id="phoneAlarmBox"><div id="phoneAlarmCard"><h2>Telefon Alarmını Bağla</h2><p>Bu 6 haneli kodu telefondaki CRM Alarm uygulamasına girin.</p><div id="phoneAlarmCode">------</div><button class="btn primary" id="phoneAlarmNew" type="button">Yeni Kod</button> <button class="btn" id="phoneAlarmClose" type="button">Kapat</button></div></div><script data-phone-alarm-button>(function(){var box=document.getElementById('phoneAlarmBox'),out=document.getElementById('phoneAlarmCode');async function load(){out.textContent='......';try{var r=await fetch('/api/native-alarm/pair-code',{method:'POST',credentials:'same-origin',cache:'no-store'});var t=await r.text(),j={};try{j=JSON.parse(t)}catch(_){throw new Error('Sunucu JSON yanıtı vermedi. Ctrl+F5 yapın.')}if(!r.ok)throw new Error(j.error||'Kod alınamadı');out.textContent=j.code||'HATA'}catch(e){out.textContent='HATA';alert('Eşleştirme kodu alınamadı: '+e.message)}}document.getElementById('phoneAlarmBtn').onclick=function(){box.classList.add('open');load()};document.getElementById('phoneAlarmNew').onclick=load;document.getElementById('phoneAlarmClose').onclick=function(){box.classList.remove('open')}})();</script>`;
  return html.replace(/<\/body>/i,ui+'</body>');
}
function rebuild(response,html){const headers=new Headers(response.headers);['content-length','content-encoding','etag'].forEach(n=>headers.delete(n));headers.set('cache-control','no-store');return new Response(html,{status:response.status,statusText:response.statusText,headers})}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function ensureAlarmTables(env){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS native_alarm_pair_codes_v2 (code TEXT PRIMARY KEY, expires_at TEXT NOT NULL, used_at TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS native_alarm_devices_v2 (device_token TEXT PRIMARY KEY, device_name TEXT NOT NULL DEFAULT '', paired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS native_alarm_acks_v2 (device_token TEXT NOT NULL, agenda_id INTEGER NOT NULL, remind_at TEXT NOT NULL, acked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(device_token,agenda_id,remind_at))").run();
}
function sixDigitCode(){const a=new Uint32Array(1);crypto.getRandomValues(a);return String(100000+(a[0]%900000));}
function bearer(request){const h=request.headers.get('Authorization')||'';return h.startsWith('Bearer ')?h.slice(7).trim():''}
async function validDevice(env,token){if(!token)return null;return env.DB.prepare('SELECT device_token FROM native_alarm_devices_v2 WHERE device_token=?').bind(token).first()}
async function alarmApi(request,env,path){
  await ensureAlarmTables(env);
  if((path==='/api/native-alarm/pair-code'||path==='/api/native-alarm/code')&&request.method==='POST'){
    await env.DB.prepare("DELETE FROM native_alarm_pair_codes_v2 WHERE expires_at < datetime('now') OR used_at <> ''").run();
    const code=sixDigitCode(),expires=new Date(Date.now()+600000).toISOString();
    await env.DB.prepare('INSERT INTO native_alarm_pair_codes_v2(code,expires_at,used_at) VALUES(?,?,?)').bind(code,expires,'').run();
    return json({ok:true,code,expires_at:expires});
  }
  if(path==='/api/native-alarm/pair'&&request.method==='POST'){
    let b={};try{b=await request.json()}catch{}const code=String(b.code||'').trim();
    const row=await env.DB.prepare("SELECT code FROM native_alarm_pair_codes_v2 WHERE code=? AND used_at='' AND expires_at>=datetime('now') LIMIT 1").bind(code).first();
    if(!row)return json({error:'Kod geçersiz veya süresi dolmuş. CRM’den Yeni Kod alın.'},400);
    const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
    await env.DB.prepare('INSERT INTO native_alarm_devices_v2(device_token,device_name) VALUES(?,?)').bind(token,String(b.label||b.device_name||'Android Telefon')).run();
    await env.DB.prepare("UPDATE native_alarm_pair_codes_v2 SET used_at=datetime('now') WHERE code=?").bind(code).run();
    return json({ok:true,token,label:String(b.label||'Android Alarm')});
  }
  const token=bearer(request),d=await validDevice(env,token);if(!d)return json({error:'Cihaz eşleşmemiş.'},401);
  await env.DB.prepare("UPDATE native_alarm_devices_v2 SET last_seen_at=datetime('now') WHERE device_token=?").bind(token).run();
  if(path==='/api/native-alarm/ping'&&request.method==='GET')return json({ok:true,label:'Android Ajanda'});
  if(path==='/api/native-alarm/agenda'&&request.method==='GET'){
    const r=await env.DB.prepare("SELECT id,entry_date,note,remind_at,entry_status,completed_date FROM agenda_entries ORDER BY CASE WHEN COALESCE(entry_status,'Yapılacak')='Yapıldı' THEN 1 ELSE 0 END, entry_date DESC, id DESC LIMIT 500").all();
    return json({ok:true,entries:r.results||[]});
  }
  if(path==='/api/native-alarm/agenda'&&request.method==='POST'){
    let b={};try{b=await request.json()}catch{}const note=String(b.note||'').trim();if(!note)return json({error:'Not boş olamaz.'},400);
    const date=String(b.entry_date||new Date().toISOString().slice(0,10)),remind=String(b.remind_at||'');
    const r=await env.DB.prepare("INSERT INTO agenda_entries(entry_date,sort_order,note,remind_at,reminder_status,entry_status,completed_date) VALUES(?,1,?,?,'','Yapılacak','')").bind(date,note,remind).run();
    return json({ok:true,id:Number(r.meta?.last_row_id||0)});
  }
  const m=path.match(/^\/api\/native-alarm\/agenda\/(\d+)$/);
  if(m&&request.method==='PUT'){
    let b={};try{b=await request.json()}catch{}const id=Number(m[1]),note=String(b.note||'').trim();if(!note)return json({error:'Not boş olamaz.'},400);
    await env.DB.prepare("UPDATE agenda_entries SET entry_date=?,note=?,remind_at=?,reminder_status='' WHERE id=?").bind(String(b.entry_date||''),note,String(b.remind_at||''),id).run();return json({ok:true});
  }
  if(m&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM agenda_entries WHERE id=?').bind(Number(m[1])).run();return json({ok:true});}
  if(m&&request.method==='POST'){
    let b={};try{b=await request.json()}catch{}const archived=!!b.archived;
    await env.DB.prepare("UPDATE agenda_entries SET entry_status=?,completed_date=? WHERE id=?").bind(archived?'Yapıldı':'Yapılacak',archived?new Date().toISOString().slice(0,10):'',Number(m[1])).run();return json({ok:true});
  }
  if(path==='/api/native-alarm/reminders'&&request.method==='GET'){
    const r=await env.DB.prepare("SELECT a.id,a.remind_at,a.note FROM agenda_entries a WHERE COALESCE(a.remind_at,'')<>'' AND COALESCE(a.reminder_status,'')<>'Tamamlandı' AND COALESCE(a.entry_status,'Yapılacak')<>'Yapıldı' AND NOT EXISTS (SELECT 1 FROM native_alarm_acks_v2 k WHERE k.device_token=? AND k.agenda_id=a.id AND k.remind_at=a.remind_at) ORDER BY a.remind_at ASC LIMIT 200").bind(token).all();
    const reminders=(r.results||[]).map(x=>{const s=String(x.remind_at||'');const iso=/[zZ]|[+-]\d\d:\d\d$/.test(s)?s:s.replace(' ','T')+':00+03:00';return {id:Number(x.id),remind_at:s,when:new Date(iso).getTime(),title:'Ajanda Hatırlatması',body:String(x.note||'Hatırlatma zamanı geldi.')}}).filter(x=>Number.isFinite(x.when));
    return json({ok:true,reminders});
  }
  if(path==='/api/native-alarm/ack'&&request.method==='POST'){
    let b={};try{b=await request.json()}catch{}const id=Number(b.id)||0,remind=String(b.remind_at||'');
    await env.DB.prepare('INSERT OR REPLACE INTO native_alarm_acks_v2(device_token,agenda_id,remind_at,acked_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(token,id,remind).run();
    await env.DB.prepare("UPDATE agenda_entries SET reminder_status='Tamamlandı' WHERE id=? AND remind_at=?").bind(id,remind).run();
    return json({ok:true});
  }
  return json({error:'Android alarm API yolu bulunamadı.'},404);
}
export default{async fetch(request,env,ctx){const url=new URL(request.url),path=url.pathname;if(path.startsWith('/api/native-alarm/')){try{return await alarmApi(request,env,path)}catch(error){console.error('native alarm api',error);return json({error:'Android alarm sunucu hatası: '+String(error?.message||error)},500)}}const response=await worker.fetch(request,env,ctx);if(request.method==='GET'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html'))return rebuild(response,addPhoneAlarmButton(await response.text()));return response;},async scheduled(controller,env,ctx){if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx)}};
