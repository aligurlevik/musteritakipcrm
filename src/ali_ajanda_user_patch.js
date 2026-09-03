import worker from './agenda_hide_customer_delete_patch.js';

const enc = new TextEncoder();

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function sessionToken(env, role) {
  const day = new Date().toISOString().slice(0,10);
  return role + '.' + day + '.' + await hmac(env.SESSION_SECRET || 'change-me', role+'.'+day);
}

async function hasAliAgendaSession(request, env) {
  const cookie=request.headers.get('Cookie')||'';
  const m=cookie.match(/crm_session=([^;]+)/);
  if(!m)return false;
  return m[1]===await sessionToken(env,'ali_agenda');
}

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});
}

async function authenticateAsAli(request,env,ctx){
  let b={};
  try{b=await request.clone().json()}catch(_){ }
  const aliRequest=new Request(request.url,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({user:'Ali',password:String(b.password||'')})
  });
  return worker.fetch(aliRequest,env,ctx);
}

async function forwardAgendaAsAli(request,env,ctx){
  const headers=new Headers(request.headers);
  const adminToken=await sessionToken(env,'admin');
  const oldCookie=headers.get('Cookie')||'';
  const cleaned=oldCookie.replace(/(?:^|;\s*)crm_session=[^;]*/g,'').replace(/^;\s*|;\s*$/g,'');
  headers.set('Cookie',(cleaned?cleaned+'; ':'')+'crm_session='+adminToken);
  const forwarded=new Request(request,{headers});
  return worker.fetch(forwarded,env,ctx);
}

const aliAgendaUiPatch=`
<style>
  #aliAgendaPhoneRoot{display:none}
  body.ali-ajanda-only{margin:0!important;background:#f3f6fb!important;color:#0f172a!important;overflow-x:hidden!important}
  body.ali-ajanda-only>.app{display:none!important}
  body.ali-ajanda-only>#aliAgendaPhoneRoot{display:block!important;min-height:100vh!important}
  .aa-shell{max-width:720px;margin:0 auto;padding:12px 12px 28px;font-family:Segoe UI,Arial,sans-serif}
  .aa-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
  .aa-head h1{font-size:24px;margin:0;color:#0f172a}.aa-head small{display:block;color:#64748b;margin-top:2px}
  .aa-logout{border:0;background:#e2e8f0;color:#334155;border-radius:10px;padding:9px 11px;font-weight:800}
  .aa-card{background:#fff;border:1px solid #dbe2ea;border-radius:16px;padding:12px;box-shadow:0 4px 16px #0f172a0d;margin-bottom:12px}
  .aa-monthbar{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center}
  .aa-monthbar button{border:0;border-radius:10px;background:#eaf0ff;color:#1d4ed8;font-weight:900;padding:10px 11px}
  .aa-monthtitle{text-align:center;font-size:17px;font-weight:1000;color:#1e3a8a}
  .aa-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin-top:10px}.aa-week div{text-align:center;font-size:11px;font-weight:900;color:#64748b;padding:4px 0}
  .aa-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
  .aa-day{position:relative;min-width:0;min-height:52px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;padding:5px 3px;text-align:left;color:#0f172a;overflow:hidden}
  .aa-day.empty{visibility:hidden}.aa-day.today{border-color:#22c55e;background:#f0fdf4}.aa-day.selected{border:2px solid #2563eb;background:#dbeafe}.aa-daynum{font-weight:1000;font-size:13px}.aa-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#2563eb;margin:1px 2px}.aa-dot.done{background:#16a34a}
  .aa-selected-title{font-size:17px;font-weight:1000;color:#065f46;margin-bottom:9px}
  .aa-note-list{display:grid;gap:8px}.aa-note{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:start;border-left:4px solid #2563eb;background:#f8fafc;padding:10px;border-radius:10px}.aa-note.done{opacity:.65;border-left-color:#16a34a}.aa-note-text{white-space:pre-wrap;word-break:break-word;font-size:14px}.aa-note-meta{font-size:11px;color:#b45309;margin-top:4px}.aa-note img{max-width:80px;max-height:70px;border-radius:7px;margin-top:6px}.aa-check{width:22px;height:22px;margin-top:1px}.aa-del{border:0;border-radius:8px;background:#dc2626;color:#fff;font-weight:900;padding:7px 9px}
  .aa-empty{padding:12px;color:#64748b;text-align:center}
  .aa-add{display:grid;gap:8px;margin-top:12px;border-top:1px dashed #cbd5e1;padding-top:12px}.aa-add textarea{width:100%;min-height:78px;resize:vertical;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font:inherit}.aa-time-row{display:grid;grid-template-columns:1fr 78px 78px;gap:7px}.aa-time-row input{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:10px}.aa-addbtn{border:0;border-radius:10px;background:#059669;color:#fff;font-weight:1000;padding:11px 14px}.aa-msg{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:9999;background:#0f172a;color:#fff;border-radius:10px;padding:10px 14px;font-weight:800;display:none;max-width:88vw;text-align:center}
  @media(max-width:420px){.aa-shell{padding:8px 8px 24px}.aa-card{padding:9px}.aa-day{min-height:48px;padding:4px 2px}.aa-monthbar button{padding:9px 8px}.aa-monthtitle{font-size:15px}.aa-note{grid-template-columns:auto minmax(0,1fr) auto;gap:7px;padding:8px}.aa-del{padding:6px 7px}.aa-time-row{grid-template-columns:1fr 68px 68px}}
</style>
<div id="aliAgendaPhoneRoot">
  <div class="aa-shell">
    <div class="aa-head"><div><h1>Ali Ajanda</h1><small>Ali hesabındaki ajandayla aynı ve senkron</small></div><button class="aa-logout" onclick="aliAgendaLogout()">Çıkış</button></div>
    <div class="aa-card">
      <div class="aa-monthbar"><button onclick="aaChangeMonth(-1)">← Önceki</button><div id="aaMonthTitle" class="aa-monthtitle"></div><button onclick="aaChangeMonth(1)">Sonraki →</button></div>
      <div class="aa-week"><div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div></div>
      <div id="aaGrid" class="aa-grid"></div>
    </div>
    <div class="aa-card">
      <div id="aaSelectedTitle" class="aa-selected-title"></div>
      <div id="aaNotes" class="aa-note-list"></div>
      <div class="aa-add">
        <textarea id="aaNewNote" placeholder="Notunu buraya yaz..."></textarea>
        <div class="aa-time-row"><input id="aaNoteDate" type="date"><input id="aaHour" type="number" min="0" max="23" placeholder="Saat"><input id="aaMinute" type="number" min="0" max="59" placeholder="Dk"></div>
        <button class="aa-addbtn" onclick="aaAddNote()">Notu Ekle</button>
      </div>
    </div>
  </div>
  <div id="aaMsg" class="aa-msg"></div>
</div>
<script>
(function(){
  var aaState={selected:new Date(),month:new Date(),items:[],active:false};
  var trMonths=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var trDays=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  function pad(n){return String(n).padStart(2,'0')}
  function key(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function msg(text){var el=document.getElementById('aaMsg');if(!el)return;el.textContent=text;el.style.display='block';clearTimeout(window.__aaMsgTimer);window.__aaMsgTimer=setTimeout(function(){el.style.display='none'},2200)}
  async function api(path,opts){var r=await fetch(path,Object.assign({headers:{'content-type':'application/json'}},opts||{}));var d={};try{d=await r.json()}catch(_){ }if(!r.ok)throw new Error(d.error||'İşlem başarısız');return d}
  function monthKey(){return aaState.month.getFullYear()+'-'+pad(aaState.month.getMonth()+1)}
  function formatDate(d){return d.getDate()+' '+trMonths[d.getMonth()]+' '+d.getFullYear()+' '+trDays[d.getDay()]}
  function render(){
    document.getElementById('aaMonthTitle').textContent=trMonths[aaState.month.getMonth()]+' '+aaState.month.getFullYear();
    document.getElementById('aaSelectedTitle').textContent=formatDate(aaState.selected);
    document.getElementById('aaNoteDate').value=key(aaState.selected);
    var y=aaState.month.getFullYear(),m=aaState.month.getMonth(),days=new Date(y,m+1,0).getDate(),offset=(new Date(y,m,1).getDay()+6)%7,html='';
    for(var i=0;i<offset;i++)html+='<div class="aa-day empty"></div>';
    var today=key(new Date()),selected=key(aaState.selected);
    for(var day=1;day<=days;day++){
      var dk=y+'-'+pad(m+1)+'-'+pad(day),its=aaState.items.filter(function(x){return x.entry_date===dk}),dots=its.slice(0,4).map(function(x){return '<span class="aa-dot '+(x.entry_status==='Yapıldı'?'done':'')+'"></span>'}).join('');
      html+='<button class="aa-day '+(dk===today?'today ':'')+(dk===selected?'selected':'')+'" onclick="aaSelectDate(\''+dk+'\')"><div class="aa-daynum">'+day+'</div><div>'+dots+'</div></button>';
    }
    document.getElementById('aaGrid').innerHTML=html;
    var list=aaState.items.filter(function(x){return x.entry_date===selected}).sort(function(a,b){return Number(a.entry_status==='Yapıldı')-Number(b.entry_status==='Yapıldı')||Number(a.id)-Number(b.id)});
    document.getElementById('aaNotes').innerHTML=list.length?list.map(function(x){var meta=x.remind_at?'⏰ '+new Date(x.remind_at).toLocaleString('tr-TR'):'';var img=x.image_data?'<img src="'+x.image_data+'" alt="Not resmi">':'';return '<div class="aa-note '+(x.entry_status==='Yapıldı'?'done':'')+'"><input class="aa-check" type="checkbox" '+(x.entry_status==='Yapıldı'?'checked':'')+' onchange="aaToggle('+x.id+',this.checked)"><div><div class="aa-note-text">'+esc(x.note)+'</div>'+(meta?'<div class="aa-note-meta">'+esc(meta)+'</div>':'')+img+'</div><button class="aa-del" onclick="aaDelete('+x.id+')">SİL</button></div>'}).join(''):'<div class="aa-empty">Bu gün için not yok.</div>';
  }
  async function load(){
    try{
      var today=key(new Date());
      await api('/api/agenda/rollover',{method:'POST',body:JSON.stringify({today:today})});
      aaState.items=await api('/api/agenda?month='+monthKey());
      render();
    }catch(e){msg(e.message)}
  }
  window.aaSelectDate=function(date){var p=date.split('-').map(Number);aaState.selected=new Date(p[0],p[1]-1,p[2],12);aaState.month=new Date(p[0],p[1]-1,1,12);render()};
  window.aaChangeMonth=function(delta){aaState.month=new Date(aaState.month.getFullYear(),aaState.month.getMonth()+delta,1,12);aaState.selected=new Date(aaState.month.getFullYear(),aaState.month.getMonth(),1,12);load()};
  window.aaAddNote=async function(){try{var note=document.getElementById('aaNewNote').value.trim(),date=document.getElementById('aaNoteDate').value||key(aaState.selected),h=String(document.getElementById('aaHour').value||'').trim(),mi=String(document.getElementById('aaMinute').value||'').trim();if(!note)return msg('Not yazmalısın.');if(h!==''&&(Number(h)<0||Number(h)>23))return msg('Saat 0-23 olmalı.');if(mi!==''&&(Number(mi)<0||Number(mi)>59))return msg('Dakika 0-59 olmalı.');var remind=h!==''?date+'T'+pad(Number(h))+':'+pad(Number(mi||0)):'';await api('/api/agenda',{method:'POST',body:JSON.stringify({entry_date:date,note:note,remind_at:remind})});document.getElementById('aaNewNote').value='';document.getElementById('aaHour').value='';document.getElementById('aaMinute').value='';var p=date.split('-').map(Number);aaState.selected=new Date(p[0],p[1]-1,p[2],12);aaState.month=new Date(p[0],p[1]-1,1,12);await load();msg('Not eklendi.')}catch(e){msg(e.message)}};
  window.aaDelete=async function(id){try{await api('/api/agenda/'+id,{method:'DELETE'});await load();msg('Not silindi.')}catch(e){msg(e.message)}};
  window.aaToggle=async function(id,done){try{await api('/api/agenda/'+id+(done?'/task-done':'/task-undo'),{method:'POST',body:done?JSON.stringify({completed_date:key(new Date())}):'{}'});await load()}catch(e){msg(e.message)}};
  window.aliAgendaLogout=async function(){try{await fetch('/api/logout');location.reload()}catch(_){location.reload()}};
  function ensureLoginOption(){var select=document.getElementById('loginUser');if(!select)return;if(!Array.from(select.options).some(function(o){return o.value==='Ali Ajanda'})){var opt=document.createElement('option');opt.value='Ali Ajanda';opt.textContent='Ali Ajanda';select.appendChild(opt)}}
  function activate(){if(aaState.active)return;aaState.active=true;document.body.classList.add('ali-ajanda-only');aaState.selected=new Date();aaState.month=new Date(aaState.selected.getFullYear(),aaState.selected.getMonth(),1,12);load()}
  function deactivate(){aaState.active=false;document.body.classList.remove('ali-ajanda-only')}
  function sync(){fetch('/api/session').then(function(r){return r.ok?r.json():null}).then(function(s){if(s&&s.role==='ali_agenda')activate();else deactivate()}).catch(function(){})}
  ensureLoginOption();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){ensureLoginOption();sync()});else sync();
  window.addEventListener('load',function(){ensureLoginOption();sync()});
  if(typeof window.applyAccess==='function'&&!window.applyAccess.__aliAgendaDedicated){var oldApply=window.applyAccess;var wrapped=function(role){if(role==='ali_agenda'){activate();return;}deactivate();return oldApply.apply(this,arguments)};wrapped.__aliAgendaDedicated=true;window.applyAccess=wrapped}
})();
</script>`;

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    if(url.pathname==='/api/login'&&request.method==='POST'){
      let b={};try{b=await request.clone().json()}catch(_){ }
      if(b.user==='Ali Ajanda'){
        const auth=await authenticateAsAli(request,env,ctx);
        if(!auth.ok)return auth;
        const token=await sessionToken(env,'ali_agenda');
        return json({ok:true,role:'ali_agenda',user:'Ali Ajanda'},200,{'set-cookie':`crm_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`});
      }
    }

    const aliAgenda=await hasAliAgendaSession(request,env);
    if(aliAgenda){
      if(url.pathname==='/api/session')return json({ok:true,role:'ali_agenda',user:'Ali Ajanda'});
      if(url.pathname==='/api/logout')return worker.fetch(request,env,ctx);
      if(url.pathname.startsWith('/api/agenda'))return forwardAgendaAsAli(request,env,ctx);
      if(url.pathname.startsWith('/api/'))return json({error:'Ali Ajanda kullanıcısı yalnızca Ajanda bölümünü kullanabilir.'},403);
    }

    const response=await worker.fetch(request,env,ctx);
    const contentType=response.headers.get('content-type')||'';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('aliAgendaPhoneRoot'))html=html.replace('</body>',aliAgendaUiPatch+'\n</body>');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
