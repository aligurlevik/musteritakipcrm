import worker from './phone_reminders_entry.js';

const encoder=new TextEncoder();

async function hmacHex(secret,value){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,encoder.encode(value));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function sessionCookie(request){
  const cookie=request.headers.get('cookie')||'';
  const match=cookie.match(/(?:^|;\s*)crm_session=([^;]+)/);
  return match?match[1]:'';
}

async function validRoleToken(request,env,role){
  const token=sessionCookie(request);
  if(!token)return false;
  const day=new Date().toISOString().slice(0,10);
  const expected=role+'.'+day+'.'+await hmacHex(env.SESSION_SECRET||'change-me',role+'.'+day);
  return token===expected;
}

async function withAdminSession(request,env){
  const day=new Date().toISOString().slice(0,10);
  const token='admin.'+day+'.'+await hmacHex(env.SESSION_SECRET||'change-me','admin.'+day);
  const headers=new Headers(request.headers);
  const old=headers.get('cookie')||'';
  const keep=old.split(';').map(x=>x.trim()).filter(x=>x&&!x.startsWith('crm_session=')).join('; ');
  headers.set('cookie',(keep?keep+'; ':'')+'crm_session='+token);
  return new Request(request,{headers});
}

function isPortfolioApi(path){
  return path.startsWith('/api/customers')||path.startsWith('/api/meetings')||path.startsWith('/api/offers');
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname;
    if(isPortfolioApi(path)){
      try{
        if(await validRoleToken(request,env,'graphic')){
          return worker.fetch(await withAdminSession(request,env),env,ctx);
        }
      }catch(error){
        console.error('Portfolio outer access bridge failed',error?.message||error);
      }
    }
    return worker.fetch(request,env,ctx);
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
