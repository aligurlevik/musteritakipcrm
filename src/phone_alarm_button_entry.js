import worker from './portfolio_company_link_entry.js';

function addPhoneAlarmButton(html){
  if(html.includes('data-phone-alarm-button'))return html;
  const ui=`<style data-phone-alarm-button>#phoneAlarmBtn{position:fixed;right:18px;bottom:18px;z-index:99990;border:0;border-radius:12px;padding:12px 16px;background:#16a34a;color:white;font-weight:900;cursor:pointer;box-shadow:0 8px 24px #0003}#phoneAlarmBox{display:none;position:fixed;inset:0;z-index:99999;background:#0008;align-items:center;justify-content:center}#phoneAlarmBox.open{display:flex}#phoneAlarmCard{width:min(430px,92vw);background:white;border-radius:16px;padding:24px;text-align:center}#phoneAlarmCode{font-size:42px;font-weight:900;letter-spacing:8px;margin:18px 0}</style><button id="phoneAlarmBtn" type="button">📱 Telefon Alarmını Bağla</button><div id="phoneAlarmBox"><div id="phoneAlarmCard"><h2>Telefon Alarmını Bağla</h2><p>Bu 6 haneli kodu telefondaki CRM Alarm uygulamasına girin.</p><div id="phoneAlarmCode">------</div><button class="btn primary" id="phoneAlarmNew" type="button">Yeni Kod</button> <button class="btn" id="phoneAlarmClose" type="button">Kapat</button></div></div><script data-phone-alarm-button>(function(){var box=document.getElementById('phoneAlarmBox'),out=document.getElementById('phoneAlarmCode');async function load(){out.textContent='......';try{var r=await fetch('/api/native-alarm/code',{method:'POST'}),j=await r.json();if(!r.ok)throw new Error(j.error||'Kod alınamadı');out.textContent=j.code||'HATA'}catch(e){out.textContent='HATA';alert('Eşleştirme kodu alınamadı: '+e.message)}}document.getElementById('phoneAlarmBtn').onclick=function(){box.classList.add('open');load()};document.getElementById('phoneAlarmNew').onclick=load;document.getElementById('phoneAlarmClose').onclick=function(){box.classList.remove('open')}})();</script>`;
  return html.replace(/<\/body>/i,ui+'</body>');
}
function rebuild(response,html){var headers=new Headers(response.headers);['content-length','content-encoding','etag'].forEach(function(n){headers.delete(n)});headers.set('cache-control','no-store');return new Response(html,{status:response.status,statusText:response.statusText,headers:headers})}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function ensureAlarmTables(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS native_alarm_pair_codes (code TEXT PRIMARY KEY, expires_at TEXT NOT NULL, used_at TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS native_alarm_devices (device_token TEXT PRIMARY KEY, device_name TEXT DEFAULT '', paired_at TEXT DEFAULT CURRENT_TIMESTAMP, last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
}
function sixDigitCode(){var a=new Uint32Array(1);crypto.getRandomValues(a);return String(100000+(a[0]%900000));}
async function alarmApi(request,env,path){
  await ensureAlarmTables(env);
  if(path==='/api/native-alarm/code'&&request.method==='POST'){
    await env.DB.prepare("DELETE FROM native_alarm_pair_codes WHERE expires_at < datetime('now') OR used_at <> ''").run();
    var code=sixDigitCode(),expires=new Date(Date.now()+10*60*1000).toISOString();
    await env.DB.prepare('INSERT OR REPLACE INTO native_alarm_pair_codes(code,expires_at,used_at) VALUES(?,?,?)').bind(code,expires,'').run();
    return json({ok:true,code,expires_at:expires});
  }
  if(path==='/api/native-alarm/pair'&&request.method==='POST'){
    var b={};try{b=await request.json()}catch{}
    var code=String(b.code||'').trim();
    var row=await env.DB.prepare("SELECT code FROM native_alarm_pair_codes WHERE code=? AND used_at='' AND expires_at >= datetime('now') LIMIT 1").bind(code).first();
    if(!row)return json({error:'Kod geçersiz veya süresi dolmuş.'},400);
    var token=crypto.randomUUID()+crypto.randomUUID().replaceAll('-','');
    await env.DB.prepare('INSERT INTO native_alarm_devices(device_token,device_name) VALUES(?,?)').bind(token,String(b.device_name||'Android Telefon')).run();
    await env.DB.prepare("UPDATE native_alarm_pair_codes SET used_at=datetime('now') WHERE code=?").bind(code).run();
    return json({ok:true,device_token:token,token});
  }
  if(path==='/api/native-alarm/ping'&&request.method==='POST'){
    var p={};try{p=await request.json()}catch{}
    var token=String(p.device_token||p.token||'');
    if(!token)return json({error:'Cihaz anahtarı eksik.'},401);
    var d=await env.DB.prepare('SELECT device_token FROM native_alarm_devices WHERE device_token=?').bind(token).first();
    if(!d)return json({error:'Cihaz eşleşmemiş.'},401);
    await env.DB.prepare("UPDATE native_alarm_devices SET last_seen_at=datetime('now') WHERE device_token=?").bind(token).run();
    return json({ok:true});
  }
  return null;
}

export default{
  async fetch(request,env,ctx){
    var url=new URL(request.url),path=url.pathname;
    if(path.startsWith('/api/native-alarm/')){
      var ar=await alarmApi(request,env,path);if(ar)return ar;
    }
    var response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&(path==='/'||path==='/index.html'||path==='/safe-crm'||path==='/safe-crm/')&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      return rebuild(response,addPhoneAlarmButton(await response.text()));
    }
    return response;
  },
  async scheduled(controller,env,ctx){if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx)}
};
