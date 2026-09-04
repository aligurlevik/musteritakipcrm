import worker from './notes_v3_patch.js';

const enc=new TextEncoder();
async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function sessionRole(request,env){
  const cookie=request.headers.get('Cookie')||'';
  const m=cookie.match(/crm_session=([^;]+)/);
  if(!m)return'';
  const day=new Date().toISOString().slice(0,10);
  for(const role of ['admin','graphic','tracking']){
    const token=role+'.'+day+'.'+await hmac(env.SESSION_SECRET||'change-me',role+'.'+day);
    if(m[1]===token)return role;
  }
  return'';
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
async function ensureVoiceSchema(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agenda_voice_notes (
    agenda_id INTEGER PRIMARY KEY,
    mime_type TEXT NOT NULL DEFAULT 'audio/webm',
    audio_base64 TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
}
async function longVoicePost(request,env,url){
  if(request.method!=='POST')return null;
  const m=url.pathname.match(/^\/api\/mobile-voice\/(\d+)$/);
  if(!m)return null;
  if(await sessionRole(request,env)!=='admin')return json({error:'Yetkisiz'},401);
  let b={};try{b=await request.json()}catch{return json({error:'Ses verisi okunamadı.'},400)}
  const data=String(b.audio_data||'');
  const match=data.match(/^data:(audio\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if(!match)return json({error:'Ses kaydı geçersiz.'},400);
  if(match[2].length>14000000)return json({error:'Ses kaydı dosyası çok büyük. Kaydı biraz daha kısa tutun.'},413);
  const id=Number(m[1]);
  const agenda=await env.DB.prepare("SELECT id FROM agenda_entries WHERE id=? AND COALESCE(source_type,'manual')='manual'").bind(id).first();
  if(!agenda)return json({error:'Not bulunamadı.'},404);
  await ensureVoiceSchema(env);
  await env.DB.prepare(`INSERT INTO agenda_voice_notes(agenda_id,mime_type,audio_base64,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(agenda_id) DO UPDATE SET mime_type=excluded.mime_type,audio_base64=excluded.audio_base64,updated_at=CURRENT_TIMESTAMP`)
    .bind(id,match[1],match[2]).run();
  return json({ok:true,has_voice:true});
}
async function patchHtml(response){
  if(!response||response.status!==200)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('/notes-long-audio-patch.js'))html=html.replace('</body>','<script src="/notes-long-audio-patch.js?v=20260904-1"></script></body>');
  const h=new Headers(response.headers);h.set('content-type','text/html; charset=utf-8');h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}
export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),p=url.pathname;
    if(request.method==='GET'&&p==='/notes-long-audio-patch.js'){
      const u=new URL(request.url);u.pathname='/notes-long-audio-patch.js';u.search='';
      const r=await env.ASSETS.fetch(new Request(u,{method:'GET',headers:request.headers}));
      const h=new Headers(r.headers);h.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
    }
    const voice=await longVoicePost(request,env,url);if(voice)return voice;
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&['/yeni-not','/yeni-not/','/yeni-not.html'].includes(p))return patchHtml(response);
    return response;
  }
};
