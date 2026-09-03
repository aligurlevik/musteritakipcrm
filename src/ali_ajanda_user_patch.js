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
  body.ali-ajanda-only .side{display:none!important}
  body.ali-ajanda-only .app{display:block!important;min-height:100vh!important}
  body.ali-ajanda-only .main{width:100%!important;max-width:none!important;padding:18px!important}
  body.ali-ajanda-only .top{display:none!important}
  body.ali-ajanda-only .section{display:none!important}
  body.ali-ajanda-only #agenda{display:block!important;width:100%!important}
  @media(max-width:820px){
    body.ali-ajanda-only .main{padding:10px!important}
    body.ali-ajanda-only #agenda .agenda-overview{grid-template-columns:1fr!important;gap:12px!important}
    body.ali-ajanda-only #agenda .done-panel,
    body.ali-ajanda-only #agenda .month-calendar{width:100%!important;max-width:none!important}
    body.ali-ajanda-only #agenda .month-calendar{overflow-x:auto!important}
    body.ali-ajanda-only #agenda .month-grid,
    body.ali-ajanda-only #agenda .month-weekdays{min-width:640px!important}
  }
</style>
<script>
(function(){
  function ensureLoginOption(){
    var select=document.getElementById('loginUser');
    if(!select)return;
    if(!Array.from(select.options).some(function(o){return o.value==='Ali Ajanda'||o.textContent==='Ali Ajanda'})){
      var opt=document.createElement('option');opt.value='Ali Ajanda';opt.textContent='Ali Ajanda';select.appendChild(opt);
    }
  }

  function activateAliAgenda(){
    document.body.classList.add('ali-ajanda-only');
    try{window.currentAccessRole='ali_agenda'}catch(_){ }
    try{if(typeof currentAccessRole!=='undefined')currentAccessRole='ali_agenda'}catch(_){ }
    document.querySelectorAll('.section').forEach(function(s){s.classList.remove('active')});
    var agenda=document.getElementById('agenda');if(agenda)agenda.classList.add('active');
    var title=document.getElementById('title');if(title)title.textContent='Ajanda';
    setTimeout(function(){try{if(typeof showAgendaMonth==='function')showAgendaMonth();else if(typeof loadAgenda==='function')loadAgenda()}catch(_){ }},0);
  }

  function syncSession(){
    fetch('/api/session').then(function(r){return r.ok?r.json():null}).then(function(s){
      if(s&&s.role==='ali_agenda')activateAliAgenda();
      else document.body.classList.remove('ali-ajanda-only');
    }).catch(function(){});
  }

  ensureLoginOption();
  document.addEventListener('DOMContentLoaded',function(){ensureLoginOption();syncSession()});
  window.addEventListener('load',function(){ensureLoginOption();syncSession()});

  if(typeof window.applyAccess==='function'&&!window.applyAccess.__aliAgendaWrapped){
    var oldApply=window.applyAccess;
    var wrapped=function(role){
      if(role==='ali_agenda'){activateAliAgenda();return;}
      document.body.classList.remove('ali-ajanda-only');
      return oldApply.apply(this,arguments);
    };
    wrapped.__aliAgendaWrapped=true;
    window.applyAccess=wrapped;
  }
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
      if(!html.includes('ali-ajanda-only'))html=html.replace('</body>',aliAgendaUiPatch+'\n</body>');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
