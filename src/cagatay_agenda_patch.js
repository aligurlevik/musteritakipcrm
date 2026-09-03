import worker from './tracking_total_count_patch.js';

const enc = new TextEncoder();

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function sessionToken(env, role='admin') {
  const day = new Date().toISOString().slice(0,10);
  return role + '.' + day + '.' + await hmac(env.SESSION_SECRET || 'change-me', role+'.'+day);
}

async function sessionRole(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/crm_session=([^;]+)/);
  if(!m)return '';
  for(const role of ['admin','graphic','tracking']){
    if(m[1]===await sessionToken(env,role))return role;
  }
  return '';
}

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8'}});
async function body(request){try{return await request.json()}catch{return {}}}
function validAgendaImage(value){
  const image=String(value||'');
  if(!image)return '';
  if(image.length>450000||!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))return null;
  return image;
}

let cagatayAgendaReady;
async function ensureCagatayAgenda(env){
  if(!cagatayAgendaReady){
    cagatayAgendaReady=(async()=>{
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cagatay_agenda_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date TEXT NOT NULL,
        sort_order INTEGER DEFAULT 1,
        note TEXT NOT NULL,
        remind_at TEXT DEFAULT '',
        reminder_status TEXT DEFAULT '',
        entry_status TEXT DEFAULT 'Yapılacak',
        completed_date TEXT DEFAULT '',
        image_data TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`).run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_cagatay_agenda_date ON cagatay_agenda_entries(entry_date)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_cagatay_agenda_remind ON cagatay_agenda_entries(remind_at)').run();
    })().catch(error=>{cagatayAgendaReady=undefined;throw error});
  }
  return cagatayAgendaReady;
}

async function cagatayAgendaApi(request,env){
  await ensureCagatayAgenda(env);
  const url=new URL(request.url),path=url.pathname;

  if(path==='/api/agenda/reminders'&&request.method==='GET'){
    return json((await env.DB.prepare("SELECT * FROM cagatay_agenda_entries WHERE reminder_status='Açık' AND remind_at<>'' ORDER BY remind_at").all()).results);
  }

  if(path==='/api/agenda/rollover'&&request.method==='POST'){
    const b=await body(request),today=String(b.today||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(today))return json({error:'Geçerli gün bilgisi zorunlu.'},400);
    const moved=await env.DB.prepare("UPDATE cagatay_agenda_entries SET entry_date=?, remind_at=CASE WHEN COALESCE(remind_at,'')<>'' THEN ?||substr(remind_at,11) ELSE COALESCE(remind_at,'') END, reminder_status=CASE WHEN COALESCE(remind_at,'')<>'' THEN 'Açık' ELSE COALESCE(reminder_status,'') END WHERE entry_date<? AND COALESCE(entry_status,'Yapılacak')<>'Yapıldı'").bind(today,today,today).run();
    return json({ok:true,moved:Number(moved.meta?.changes||0)});
  }

  if(path==='/api/agenda/day'&&request.method==='GET'){
    const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10);
    return json((await env.DB.prepare('SELECT * FROM cagatay_agenda_entries WHERE entry_date=? ORDER BY sort_order,id').bind(date).all()).results);
  }

  if(path==='/api/agenda/completed'&&request.method==='GET'){
    const date=url.searchParams.get('date')||new Date().toISOString().slice(0,10);
    return json((await env.DB.prepare("SELECT * FROM cagatay_agenda_entries WHERE entry_status='Yapıldı' AND completed_date=? ORDER BY id DESC").bind(date).all()).results);
  }

  if(path==='/api/agenda'&&request.method==='GET'){
    const month=url.searchParams.get('month')||new Date().toISOString().slice(0,7);
    return json((await env.DB.prepare('SELECT * FROM cagatay_agenda_entries WHERE entry_date LIKE ? ORDER BY entry_date,sort_order,id').bind(month+'%').all()).results);
  }

  if(path==='/api/agenda'&&request.method==='POST'){
    const b=await body(request);
    if(!b.entry_date||!String(b.note||'').trim())return json({error:'Tarih ve ajanda notu zorunlu.'},400);
    const imageData=validAgendaImage(b.image_data);
    if(imageData===null)return json({error:'Resim geçersiz veya çok büyük.'},400);
    const last=await env.DB.prepare('SELECT COALESCE(MAX(sort_order),0) n FROM cagatay_agenda_entries WHERE entry_date=?').bind(b.entry_date).first();
    const remindAt=String(b.remind_at||'');
    const created=await env.DB.prepare('INSERT INTO cagatay_agenda_entries(entry_date,sort_order,note,remind_at,reminder_status,image_data) VALUES(?,?,?,?,?,?)').bind(b.entry_date,Number(last?.n||0)+1,String(b.note).trim(),remindAt,remindAt?'Açık':'',imageData).run();
    return json({ok:true,id:created.meta.last_row_id},201);
  }

  const agendaItem=path.match(/^\/api\/agenda\/(\d+)$/);
  if(agendaItem&&request.method==='PUT'){
    const id=Number(agendaItem[1]),b=await body(request);
    if(!b.entry_date||!String(b.note||'').trim())return json({error:'Tarih ve ajanda notu zorunlu.'},400);
    const ex=await env.DB.prepare('SELECT id,image_data FROM cagatay_agenda_entries WHERE id=?').bind(id).first();
    if(!ex)return json({error:'Ajanda notu bulunamadı.'},404);
    const imageData=b.image_data===undefined?String(ex.image_data||''):validAgendaImage(b.image_data);
    if(imageData===null)return json({error:'Resim geçersiz veya çok büyük.'},400);
    const remindAt=String(b.remind_at||'');
    await env.DB.prepare('UPDATE cagatay_agenda_entries SET entry_date=?,note=?,remind_at=?,reminder_status=?,image_data=? WHERE id=?').bind(b.entry_date,String(b.note).trim(),remindAt,remindAt?'Açık':'',imageData,id).run();
    return json({ok:true});
  }

  if(agendaItem&&request.method==='DELETE'){
    await env.DB.prepare('DELETE FROM cagatay_agenda_entries WHERE id=?').bind(Number(agendaItem[1])).run();
    return json({ok:true});
  }

  const agendaComplete=path.match(/^\/api\/agenda\/(\d+)\/complete$/);
  if(agendaComplete&&request.method==='POST'){
    await env.DB.prepare("UPDATE cagatay_agenda_entries SET reminder_status='Tamamlandı' WHERE id=?").bind(Number(agendaComplete[1])).run();
    return json({ok:true});
  }

  const agendaSnooze=path.match(/^\/api\/agenda\/(\d+)\/snooze$/);
  if(agendaSnooze&&request.method==='POST'){
    const b=await body(request);
    if(!b.remind_at)return json({error:'Yeni hatırlatma zamanı zorunlu.'},400);
    await env.DB.prepare("UPDATE cagatay_agenda_entries SET remind_at=?,reminder_status='Açık' WHERE id=?").bind(b.remind_at,Number(agendaSnooze[1])).run();
    return json({ok:true});
  }

  const agendaTaskDone=path.match(/^\/api\/agenda\/(\d+)\/task-done$/);
  if(agendaTaskDone&&request.method==='POST'){
    const b=await body(request),date=String(b.completed_date||new Date().toISOString().slice(0,10));
    await env.DB.prepare("UPDATE cagatay_agenda_entries SET entry_status='Yapıldı',completed_date=?,reminder_status=CASE WHEN reminder_status='Açık' THEN 'Tamamlandı' ELSE reminder_status END WHERE id=?").bind(date,Number(agendaTaskDone[1])).run();
    return json({ok:true});
  }

  const agendaTaskUndo=path.match(/^\/api\/agenda\/(\d+)\/task-undo$/);
  if(agendaTaskUndo&&request.method==='POST'){
    await env.DB.prepare("UPDATE cagatay_agenda_entries SET entry_status='Yapılacak',completed_date='' WHERE id=?").bind(Number(agendaTaskUndo[1])).run();
    return json({ok:true});
  }

  return json({error:'Ajanda işlemi bulunamadı.'},404);
}

const cagatayAgendaUiPatch=`
<script>
(function(){
  function showCagatayMenus(){
    if(window.currentAccessRole!=='graphic'&&typeof currentAccessRole!=='undefined'&&currentAccessRole!=='graphic')return;
    document.querySelectorAll('.menu button[data-page]').forEach(function(button){
      var page=button.dataset.page;
      button.style.display=(page==='graphicJobs'||page==='agenda')?'block':'none';
    });
    document.querySelectorAll('.customer-folder-group').forEach(function(el){el.style.display='none'});
  }

  if(typeof window.applyAccess==='function'){
    var originalApplyAccess=window.applyAccess;
    window.applyAccess=function(role){
      originalApplyAccess(role);
      if(role==='graphic')showCagatayMenus();
    };
  }

  fetch('/api/session').then(function(r){return r.ok?r.json():null}).then(function(session){
    if(session&&session.role==='graphic'){
      showCagatayMenus();
      var agendaButton=document.querySelector('.menu button[data-page="agenda"]');
      if(agendaButton)agendaButton.title='Çağatay Ajandası — Ali ajandasından tamamen bağımsız';
    }
  }).catch(function(){});

  setInterval(function(){
    try{
      if(typeof currentAccessRole!=='undefined'&&currentAccessRole==='graphic'&&typeof pollAgendaReminders==='function')pollAgendaReminders();
    }catch(_){ }
  },15000);
})();
</script>`;

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const role=await sessionRole(request,env);

    if(role==='graphic'&&url.pathname.startsWith('/api/agenda')){
      try{return await cagatayAgendaApi(request,env)}catch(error){
        console.error('Çağatay ajanda hatası:',error);
        return json({error:error?.message||String(error)},500);
      }
    }

    const response=await worker.fetch(request,env,ctx);
    const contentType=response.headers.get('content-type')||'';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('Çağatay Ajandası — Ali ajandasından tamamen bağımsız'))html=html.replace('</body>',cagatayAgendaUiPatch+'\n</body>');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
