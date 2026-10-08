import worker from './portfolio_company_link_entry.js';

function addPhoneAlarmButton(html){
  if(html.includes('data-phone-alarm-button'))return html;
  const ui=`<style data-phone-alarm-button>#phoneAlarmBtn{position:fixed;right:18px;bottom:18px;z-index:99990;border:0;border-radius:12px;padding:12px 16px;background:#16a34a;color:white;font-weight:900;cursor:pointer;box-shadow:0 8px 24px #0003}#phoneAlarmBox{display:none;position:fixed;inset:0;z-index:99999;background:#0008;align-items:center;justify-content:center}#phoneAlarmBox.open{display:flex}#phoneAlarmCard{width:min(430px,92vw);background:white;border-radius:16px;padding:24px;text-align:center}#phoneAlarmCode{font-size:42px;font-weight:900;letter-spacing:8px;margin:18px 0}</style><button id="phoneAlarmBtn" type="button">📱 Telefon Alarmını Bağla</button><div id="phoneAlarmBox"><div id="phoneAlarmCard"><h2>Telefon Alarmını Bağla</h2><p>Bu 6 haneli kodu telefondaki CRM Alarm uygulamasına girin.</p><div id="phoneAlarmCode">------</div><button class="btn primary" id="phoneAlarmNew" type="button">Yeni Kod</button> <button class="btn" id="phoneAlarmClose" type="button">Kapat</button></div></div><script data-phone-alarm-button>(function(){var box=document.getElementById('phoneAlarmBox'),out=document.getElementById('phoneAlarmCode');async function load(){out.textContent='......';try{var r=await fetch('/api/native-alarm/pair-code',{method:'POST',credentials:'same-origin',cache:'no-store'});var t=await r.text(),j={};try{j=JSON.parse(t)}catch(_){throw new Error('Sunucu JSON yanıtı vermedi. Sayfayı Ctrl+F5 ile yenileyin.')}if(!r.ok)throw new Error(j.error||'Kod alınamadı');out.textContent=j.code||'HATA'}catch(e){out.textContent='HATA';alert('Eşleştirme kodu alınamadı: '+e.message)}}document.getElementById('phoneAlarmBtn').onclick=function(){box.classList.add('open');load()};document.getElementById('phoneAlarmNew').onclick=load;document.getElementById('phoneAlarmClose').onclick=function(){box.classList.remove('open')}})();</script>`;
  return html.replace(/<\/body>/i,ui+'</body>');
}
function rebuild(response,html){var headers=new Headers(response.headers);['content-length','content-encoding','etag'].forEach(n=>headers.delete(n));headers.set('cache-control','no-store');return new Response(html,{status:response.status,statusText:response.statusText,headers})}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function ensureAlarmTables(env){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS native_alarm_pair_codes (code TEXT PRIMARY KEY, expires_ms INTEGER NOT NULL, used_at TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS native_alarm_devices (device_token TEXT PRIMARY KEY, device_name TEXT DEFAULT '', paired_at TEXT DEFAULT CURRENT_TIMESTAMP, last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS native_alarm_acks (device_token TEXT NOT NULL, agenda_id INTEGER NOT NULL, remind_at TEXT NOT NULL, acked_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(device_token,agenda_id,remind_at))").run();
}
function sixDigitCode(){const a=new Uint32Array(1);crypto.getRandomValues(a);return String(100000+(a[0]%900000));}
function bearer(request){const h=request.headers.get('Authorization')||'';return h.startsWith('Bearer ')?h.slice(7).trim():''}
async function validDevice(env,token){if(!token)return null;return env.DB.prepare('SELECT device_token FROM native_alarm_devices WHERE device_token=?').bind(token).first()}
async function alarmApi(request,env,path){
  await ensureAlarmTables(env);
  if((path==='/api/native-alarm/pair-code'||path==='/api/native-alarm/code')&&request.method==='POST'){
    const now=Date.now();await env.DB.prepare("DELETE FROM native_alarm_pair_codes WHERE expires_ms < ? OR used_at <> ''").bind(now).run();
    const code=sixDigitCode(),expires=now+600000;await env.DB.prepare('INSERT OR REPLACE INTO native_alarm_pair_codes(code,expires_ms,used_at) VALUES(?,?,?)').bind(code,expires,'').run();
    return json({ok:true,code,expires_at:new Date(expires).toISOString()});
  }
  if(path==='/api/native-alarm/pair'&&request.method==='POST'){
    let b={};try{b=await request.json()}catch{}const code=String(b.code||'').trim();
    const row=await env.DB.prepare("SELECT code FROM native_alarm_pair_codes WHERE code=? AND used_at='' AND expires_ms>=? LIMIT 1").bind(code,Date.now()).first();
    if(!row)return json({error:'Kod geçersiz veya süresi dolmuş.'},400);
    const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
    await env.DB.prepare('INSERT INTO native_alarm_devices(device_token,device_name) VALUES(?,?)').bind(token,String(b.label||b.device_name||'Android Telefon')).run();
    await env.DB.prepare("UPDATE native_alarm_pair_codes SET used_at=datetime('now') WHERE code=?").bind(code).run();return json({ok:true,token});
  }
  if(path==='/api/native-alarm/ping'&&request.method==='GET'){
    const token=bearer(request),d=await validDevice(env,token);if(!d)return json({error:'Cihaz eşleşmemiş.'},401);
    await env.DB.prepare("UPDATE native_alarm_devices SET last_seen_at=datetime('now') WHERE device_token=?").bind(token).run();return json({ok:true});
  }
  if(path==='/api/native-alarm/reminders'&&request.method==='GET'){
    const token=bearer(request),d=await validDevice(env,token);if(!d)return json({error:'Cihaz eşleşmemiş.'},401);
    await env.DB.prepare("UPDATE native_alarm_devices SET last_seen_at=datetime('now') WHERE device_token=?").bind(token).run();
    const r=await env.DB.prepare("SELECT id,remind_at,note FROM agenda_entries WHERE COALESCE(remind_at,'')<>'' AND COALESCE(reminder_status,'')<>'Tamamlandı' AND COALESCE(entry_status,'Yapılacak')<>'Yapıldı' ORDER BY remind_at ASC LIMIT 200").all();
    const reminders=(r.results||[]).map(x=>{const s=String(x.remind_at||'');const iso=/[zZ]|[+-]\d\d:\d\d$/.test(s)?s:s.replace(' ','T')+':00+03:00';return {id:Number(x.id),remind_at:s,when:new Date(iso).getTime(),title:'Ajanda Hatırlatması',body:String(x.note||'Hatırlatma zamanı geldi.')}}).filter(x=>Number.isFinite(x.when));
    return json({ok:true,reminders});
  }
  if(path==='/api/native-alarm/ack'&&request.method==='POST'){
    const token=bearer(request),d=await validDevice(env,token);if(!d)return json({error:'Cihaz eşleşmemiş.'},401);let b={};try{b=await request.json()}catch{}
    await env.DB.prepare('INSERT OR REPLACE INTO native_alarm_acks(device_token,agenda_id,remind_at,acked_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(token,Number(b.id)||0,String(b.remind_at||'')).run();return json({ok:true});
  }
  return json({error:'Android alarm API yolu bulunamadı.'},404);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname;
    if(path.startsWith('/api/native-alarm/')){try{return await alarmApi(request,env,path)}catch(error){console.error('native alarm api',error);return json({error:'Android alarm sunucu hatası: '+String(error?.message||error)},500)}}
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&(path==='/'||path==='/index.html'||path==='/safe-crm'||path==='/safe-crm/')&&response.ok&&(response.headers.get('content-type')||'').includes('text/html'))return rebuild(response,addPhoneAlarmButton(await response.text()));
    return response;
  },
  async scheduled(controller,env,ctx){if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx)}
};
