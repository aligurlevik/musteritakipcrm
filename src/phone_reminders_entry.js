import worker from './quick_request_page_clean_edit_v2.js';
import {pushApi,deliverDueReminders} from './phone_reminders.js';

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/push/')){
      try{return await pushApi(request,env)}catch(error){console.error('Phone reminder API failed',error?.name);return new Response(JSON.stringify({error:'Telefon bildirimi kurulamadı. Tekrar deneyin.'}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
    }
    if(['/agenda-sw.js','/agenda.webmanifest','/phone-reminders.js','/phone-notification-controls.js'].includes(path)){
      const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
      headers.set('cache-control','no-cache');
      if(path==='/agenda-sw.js'){headers.set('content-type','application/javascript');headers.set('service-worker-allowed','/')}
      if(path==='/agenda.webmanifest')headers.set('content-type','application/manifest+json');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }
    return worker.fetch(request,env,ctx);
  },
  async scheduled(controller,env){await deliverDueReminders(env,{now:controller.scheduledTime||Date.now()})}
};
