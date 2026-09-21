import worker from './private_notebook_guard.js';
import {pushApi,deliverDueReminders} from './phone_reminders.js';
import {applyCrmBranding} from './crm_branding.js';

const reminderUiVersion='20260921-1';

async function injectPhoneReminderUi(response,request){
  if(request.method!=='GET'||!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  const isNotesPage=html.includes('<title>Notlarım</title>')||html.includes('id="alarmPopup"')||html.includes('notesBrandTitle');
  if(isNotesPage){
    html=html.replace(/<script\b[^>]*src=["']\/phone-reminders\.js[^"']*["'][^>]*><\/script>/gi,'');
    html=html.replace(/<script\b[^>]*src=["']\/phone-notification-controls\.js[^"']*["'][^>]*><\/script>/gi,'');
    const scripts=`<script src="/phone-reminders.js?v=${reminderUiVersion}"></script>
<script src="/phone-notification-controls.js?v=${reminderUiVersion}"></script>`;
    html=html.replace(/<\/body>/i,scripts+'\n</body>');
  }
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/push/')){
      try{return await pushApi(request,env)}catch(error){console.error('Phone reminder API failed',error?.name);return new Response(JSON.stringify({error:'Telefon bildirimi kurulamadı. Tekrar deneyin.'}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
    }
    if(['/agenda-sw.js','/agenda.webmanifest','/crm.webmanifest','/agenda-icon-192.png','/agenda-icon-512.png','/phone-reminders.js','/phone-notification-controls.js','/note-color-palette.js'].includes(path)){
      const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
      headers.set('cache-control','no-cache');
      if(path==='/agenda-sw.js'){headers.set('content-type','application/javascript');headers.set('service-worker-allowed','/')}
      if(path.endsWith('.webmanifest'))headers.set('content-type','application/manifest+json');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }
    const response=await worker.fetch(request,env,ctx);
    return injectPhoneReminderUi(await applyCrmBranding(response,request),request);
  },
  async scheduled(controller,env){await deliverDueReminders(env,{now:controller.scheduledTime||Date.now()})}
};
