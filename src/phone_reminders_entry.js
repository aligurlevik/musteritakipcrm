import worker from './quick_request_vertical_compact.js';
import {pushApi,pushHealth,deliverDueReminders,sendPush,sendWakePush} from './phone_reminders.js';
import {applyCrmBranding} from './crm_branding.js';
import {nativeAlarmApi} from './native_alarm_api.js';

async function sendBackgroundReminder(device,data,vapid){
  try{
    const primary=await sendPush(device,data,vapid);
    if(primary.ok||primary.status===404||primary.status===410)return primary;
    try{
      const fallback=await sendWakePush(device,data,vapid);
      return fallback.ok?fallback:primary;
    }catch(_){return primary}
  }catch(primaryError){
    try{return await sendWakePush(device,data,vapid)}catch(_){throw primaryError}
  }
}

async function injectPlannerPhoneAlarm(response){
  if(!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('id="plannerPhoneAlarmIntegration"')){
    const integration=`
<script id="plannerPhoneAlarmIntegration" src="/phone-reminders.js"></script>
<script src="/phone-notification-controls.js"></script>
<style>
#nativeAlarmPair{display:none!important}
#mobileNotifyBtn{background:#173f63!important;color:#fff!important}
#mobileNotifyStatus{margin:8px 12px 0!important}
</style>`;
    html=html.replace('</body>',integration+'\n</body>');
  }
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/native-alarm/')){
      try{return await nativeAlarmApi(request,env)}catch(error){console.error('Native alarm API failed',error?.name);return new Response(JSON.stringify({error:'Yerel alarm servisi kullanılamıyor.'}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
    }
    if(path==='/api/push/health'&&request.method==='GET'){
      try{return new Response(JSON.stringify(await pushHealth(env)),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}catch(error){return new Response(JSON.stringify({ok:false,error:String(error?.message||error)}),{status:500,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
    }
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
    let response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&['/planlama','/planlama/','/planlama.html'].includes(path))response=await injectPlannerPhoneAlarm(response);
    return applyCrmBranding(response,request);
  },
  async scheduled(controller,env){await deliverDueReminders(env,{now:controller.scheduledTime||Date.now(),send:sendBackgroundReminder})}
};
