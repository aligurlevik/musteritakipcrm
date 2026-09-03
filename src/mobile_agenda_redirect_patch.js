import worker from './tracking_total_count_patch.js';

const enc=new TextEncoder();
async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sessionRole(request,env){
  const cookie=request.headers.get('Cookie')||'';
  const m=cookie.match(/crm_session=([^;]+)/);
  if(!m)return '';
  const day=new Date().toISOString().slice(0,10);
  for(const role of ['admin','graphic','tracking']){
    const token=role+'.'+day+'.'+await hmac(env.SESSION_SECRET||'change-me',role+'.'+day);
    if(m[1]===token)return role;
  }
  return '';
}
function isMobileRequest(request){
  const hint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(hint==='?1')return true;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(request.headers.get('user-agent')||'');
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8'}})}
function assetRequest(request,pathname){
  const url=new URL(request.url);url.pathname=pathname;url.search='';
  return new Request(url.toString(),{method:'GET',headers:request.headers,redirect:'manual'});
}

let mobileHtmlCache='';
async function serveMobileNotes(request,env){
  if(mobileHtmlCache)return new Response(mobileHtmlCache,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
  let response=await env.ASSETS.fetch(assetRequest(request,'/notlar-v2.html'));
  for(let i=0;i<3&&response.status>=300&&response.status<400;i++){
    const location=response.headers.get('location');if(!location)break;
    const next=new URL(location,new URL(request.url).origin);
    response=await env.ASSETS.fetch(assetRequest(request,next.pathname));
  }
  if(response.status!==200){
    response=await env.ASSETS.fetch(assetRequest(request,'/notlar-v2'));
    for(let i=0;i<3&&response.status>=300&&response.status<400;i++){
      const location=response.headers.get('location');if(!location)break;
      const next=new URL(location,new URL(request.url).origin);
      response=await env.ASSETS.fetch(assetRequest(request,next.pathname));
    }
  }
  if(response.status!==200)return response;
  let html=await response.text();
  html=html.replace('placeholder="Notunuzu yazın veya diktafonla ses kaydedin..."','placeholder="Notunuzu buraya yazın..."');
  html=html.replace("voiceStatus(String(key),'🔴 Kayıt başladı…');","voiceStatus(String(key),'🔴 Ses kaydı başladı — konuşabilirsiniz');");
  const fontBoost=`<style id="mobileNoteFontBoost">
.title{font-size:24.5px!important}
.date{font-size:12.5px!important}
.text{font-size:17px!important;font-weight:850!important;color:#111!important}
.meta{font-size:14px!important;font-weight:900!important}
.created{font-size:14.5px!important;font-weight:950!important;color:#111!important}
.badge{font-size:inherit!important;line-height:1.35!important}
.topbtn,.logout,.smallbtn,.importantToggle{font-size:14px!important}
.voiceplay,.quickDelete{font-size:12.5px!important}
.newbox textarea,.inlineEditor textarea{font-size:16.5px!important}
.voiceStatus{font-size:12.5px!important}
.alarmPart label{font-size:11.5px!important}
.alarmPart select{font-size:15px!important}
.dateRow{display:flex!important;align-items:center!important;gap:7px!important;margin:2px 0 5px!important;padding:1px 2px!important;background:transparent!important;border:0!important;border-radius:0!important}
.dateRow label{font-size:0!important;min-width:auto!important;flex:0 0 auto!important;color:#665100!important}
.dateRow label:after{content:"📅 Tarih";font-size:14.5px!important;font-weight:950!important}
.dateRow input{width:158px!important;max-width:56vw!important;min-width:0!important;height:35px!important;padding:3px 7px!important;border:1px solid #d6c679!important;border-radius:6px!important;background:#fff!important;font-size:17px!important;font-weight:900!important}
.meta .badge:first-child{font-weight:950!important;background:#fff6bf!important;color:#111!important}
@media(max-width:430px){.text{font-size:17px!important}.meta{font-size:13.8px!important}.created{font-size:14.2px!important}.dateRow input{width:154px!important;max-width:56vw!important;font-size:17px!important}}
</style>`;
  const closedStartPatch=`<script id="mobileClosedStartPatch">
(function(){
  function closeNewBoxOnStart(){
    const box=document.getElementById('newBox');
    if(box)box.classList.remove('show');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',closeNewBoxOnStart,{once:true});
  else closeNewBoxOnStart();
  window.addEventListener('pageshow',closeNewBoxOnStart);
})();
</script>`;
  if(!html.includes('id="mobileNoteFontBoost"'))html=html.replace('</head>',fontBoost+'\n</head>');
  if(!html.includes('id="mobileClosedStartPatch"'))html=html.replace('</body>',closedStartPatch+'\n</body>');
  mobileHtmlCache=html;
  return new Response(mobileHtmlCache,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'}});
}

let voiceSchemaPromise;
function ensureVoiceSchema(env){
  if(!voiceSchemaPromise)voiceSchemaPromise=env.DB.prepare(`CREATE TABLE IF NOT EXISTS agenda_voice_notes (
    agenda_id INTEGER PRIMARY KEY,
    mime_type TEXT NOT NULL DEFAULT 'audio/webm',
    audio_base64 TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(e=>{voiceSchemaPromise=undefined;throw e});
  return voiceSchemaPromise;
}
function decodeBase64(value){
  const bin=atob(value),out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}
async function handleVoiceApi(request,env,url){
  const role=await sessionRole(request,env);
  if(role!=='admin')return json({error:'Yetkisiz'},401);
  await ensureVoiceSchema(env);
  const m=url.pathname.match(/^\/api\/mobile-voice\/(\d+)$/);
  if(!m)return null;
  const id=Number(m[1]);
  if(request.method==='GET'){
    const row=await env.DB.prepare('SELECT mime_type,audio_base64 FROM agenda_voice_notes WHERE agenda_id=?').bind(id).first();
    if(!row)return new Response('Ses kaydı bulunamadı',{status:404});
    const bytes=decodeBase64(String(row.audio_base64||''));
    return new Response(bytes,{status:200,headers:{'content-type':row.mime_type||'audio/webm','cache-control':'private, max-age=60'}});
  }
  if(request.method==='POST'){
    let b={};try{b=await request.json()}catch{return json({error:'Ses verisi okunamadı.'},400)}
    const data=String(b.audio_data||'');
    const match=data.match(/^data:(audio\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
    if(!match)return json({error:'Ses kaydı geçersiz.'},400);
    if(match[2].length>1800000)return json({error:'Ses kaydı çok uzun. Daha kısa kayıt yapın.'},413);
    const agenda=await env.DB.prepare("SELECT id FROM agenda_entries WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(id).first();
    if(!agenda)return json({error:'Not bulunamadı.'},404);
    await env.DB.prepare(`INSERT INTO agenda_voice_notes(agenda_id,mime_type,audio_base64,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(agenda_id) DO UPDATE SET mime_type=excluded.mime_type,audio_base64=excluded.audio_base64,updated_at=CURRENT_TIMESTAMP`)
      .bind(id,match[1],match[2]).run();
    return json({ok:true,has_voice:true});
  }
  if(request.method==='DELETE'){
    await env.DB.prepare('DELETE FROM agenda_voice_notes WHERE agenda_id=?').bind(id).run();
    return json({ok:true});
  }
  return json({error:'Geçersiz işlem.'},405);
}
async function attachVoiceFlags(response,env){
  if(response.status!==200)return response;
  let items;try{items=await response.json()}catch{return response}
  if(!Array.isArray(items)||!items.length)return json(items||[]);
  await ensureVoiceSchema(env);
  const rows=(await env.DB.prepare('SELECT agenda_id FROM agenda_voice_notes').all()).results||[];
  const voiceIds=new Set(rows.map(r=>Number(r.agenda_id)));
  for(const item of items)item.has_voice=voiceIds.has(Number(item.id));
  return json(items);
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isGet=request.method==='GET';
    const isHome=isGet&&(url.pathname==='/'||url.pathname==='/index.html');
    const isMobilePage=isGet&&['/mobil-ajanda','/mobil-ajanda.html','/notlar-v2','/notlar-v2/','/notlar-v2.html'].includes(url.pathname);
    const forceMobile=url.searchParams.get('mobile')==='1';

    if(url.pathname.startsWith('/api/mobile-voice/'))return handleVoiceApi(request,env,url);

    if(url.pathname==='/api/agenda'&&request.method==='GET'){
      return attachVoiceFlags(await worker.fetch(request,env,ctx),env);
    }

    const agendaDelete=url.pathname.match(/^\/api\/agenda\/(\d+)$/);
    if(agendaDelete&&request.method==='DELETE'){
      const response=await worker.fetch(request,env,ctx);
      if(response.status===200){try{await ensureVoiceSchema(env);await env.DB.prepare('DELETE FROM agenda_voice_notes WHERE agenda_id=?').bind(Number(agendaDelete[1])).run()}catch{}}
      return response;
    }

    if(isMobilePage||isHome&&(forceMobile||isMobileRequest(request)))return serveMobileNotes(request,env);
    return worker.fetch(request,env,ctx);
  }
};
