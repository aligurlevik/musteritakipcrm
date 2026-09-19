(function(){
  'use strict';
  if(window.crmReminders)return;
  const PREF='crm_notifications_enabled',nativeFetch=window.fetch.bind(window);
  const status={connected:false,busy:false,error:'',deviceId:''};
  let registration=null,connecting=null,audio=null,soundTimer=null,soundStop=null,current=null;
  const seen=new Set(),queue=[];
  const enabled=()=>localStorage.getItem(PREF)!=='0';
  const supported=()=>window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
  function changed(){window.dispatchEvent(new Event('crm-reminders-state'))}
  async function api(path,body){
    const response=await nativeFetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    let result={};try{result=await response.json()}catch(_){}
    if(!response.ok)throw new Error(response.status===401?'Önce ajandaya giriş yapın.':result.error||'Telefon bildirimi kurulamadı. Tekrar deneyin.');
    return result;
  }
  function bytes(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
  function sameKey(key,expected){if(!key)return false;const a=new Uint8Array(key),b=bytes(expected);return a.length===b.length&&a.every((value,i)=>value===b[i])}
  function connect(){
    if(connecting)return connecting;
    if(!supported()||Notification.permission!=='granted'||!enabled())return Promise.resolve(false);
    status.busy=true;status.error='';changed();
    connecting=(async()=>{
      try{
        const config=await api('/api/push/config');
        await navigator.serviceWorker.register('/agenda-sw.js',{scope:'/',updateViaCache:'none'});
        registration=await navigator.serviceWorker.ready;
        let subscription=await registration.pushManager.getSubscription();
        if(subscription&&!sameKey(subscription.options?.applicationServerKey,config.publicKey)){await subscription.unsubscribe();subscription=null}
        if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(config.publicKey)});
        const result=await api('/api/push/subscribe',subscription.toJSON());
        status.deviceId=result.deviceId;status.connected=true;return true;
      }catch(error){status.connected=false;status.error=error.message||'Telefon bildirimi kurulamadı.';return false}
      finally{status.busy=false;connecting=null;changed()}
    })();return connecting;
  }
  async function disable(){
    if(connecting)await connecting;
    const reg=registration||await navigator.serviceWorker?.getRegistration('/');
    const subscription=await reg?.pushManager?.getSubscription();
    if(subscription){await api('/api/push/unsubscribe',{endpoint:subscription.endpoint});await subscription.unsubscribe()}
    status.connected=false;status.deviceId='';localStorage.setItem(PREF,'0');changed();
  }
  function unlockAudio(){try{if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)audio=new Audio()}if(audio?.state==='suspended')audio.resume().catch(()=>{})}catch(_){}}
  function stopSound(){clearInterval(soundTimer);clearTimeout(soundStop);soundTimer=null;soundStop=null;try{navigator.vibrate?.(0)}catch(_){}}
  function tones(){
    if(document.hidden||!audio||audio.state!=='running')return;
    try{for(let i=0;i<3;i++){
      const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+i*.38;
      oscillator.connect(gain);gain.connect(audio.destination);oscillator.frequency.value=i===1?1040:880;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.12,start+.02);gain.gain.setValueAtTime(.12,start+.20);gain.gain.linearRampToValueAtTime(0,start+.26);
      oscillator.start(start);oscillator.stop(start+.28);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
    }}catch(_){}
  }
  function startSound(){stopSound();unlockAudio();tones();soundTimer=setInterval(tones,3000);soundStop=setTimeout(stopSound,60000);try{navigator.vibrate?.([250,100,250])}catch(_){}}
  function ensurePopup(){
    let popup=document.getElementById('crmPhoneAlarm');if(popup)return popup;
    const style=document.createElement('style');style.textContent='#crmPhoneAlarm{position:fixed;inset:0;z-index:9998;display:none;align-items:center;justify-content:center;padding:20px;background:#102f4da6}#crmPhoneAlarm.show{display:flex}#crmPhoneAlarm .crmAlarmBox{width:min(500px,100%);border:4px solid #eea800;border-radius:20px;padding:22px;background:#fff4c2;box-shadow:0 20px 65px #0006}#crmPhoneAlarm .crmAlarmLabel{font-size:15px;font-weight:900;color:#8c4b00;margin-bottom:12px}#crmPhoneAlarm h2{font-size:26px;color:#173f63;margin:0 0 14px;overflow-wrap:anywhere}#crmPhoneAlarm .crmAlarmText{font-size:20px;line-height:1.45;white-space:pre-wrap;max-height:40vh;overflow:auto;overflow-wrap:anywhere}#crmPhoneAlarm button{width:100%;border:0;border-radius:12px;padding:15px;background:#173f63;color:white;font-size:18px;font-weight:900;margin-top:20px}';document.head.appendChild(style);
    popup=document.createElement('div');popup.id='crmPhoneAlarm';popup.setAttribute('role','alertdialog');popup.setAttribute('aria-modal','true');popup.setAttribute('aria-labelledby','crmAlarmTitle');popup.setAttribute('aria-describedby','crmAlarmBody');
    popup.innerHTML='<div class="crmAlarmBox"><div class="crmAlarmLabel">🔔 AJANDA ALARMI</div><h2 id="crmAlarmTitle"></h2><div id="crmAlarmBody" class="crmAlarmText"></div><button type="button">✓ Tamam — Sesi durdur</button></div>';
    popup.querySelector('button').onclick=dismiss;document.body.appendChild(popup);return popup;
  }
  function showNext(){if(current||!queue.length||document.hidden)return;current=queue.shift();const popup=ensurePopup();document.getElementById('crmAlarmTitle').textContent=current.title||'Ajanda hatırlatması';document.getElementById('crmAlarmBody').textContent=current.body||'';popup.classList.add('show');if(current.sound!==false)startSound();popup.querySelector('button').focus()}
  function present(data,{sound=true}={}){if(document.hidden)return;const key=data.tag||data.id+'|'+data.remind_at;if(seen.has(key))return;seen.add(key);queue.push({...data,sound});showNext()}
  function dismiss(){stopSound();document.getElementById('crmPhoneAlarm')?.classList.remove('show');current=null;showNext()}
  function payload(note){const title=String(note.title||'').trim(),body=String(note.note||'').trim();return {title:(title||body.split('\n')[0]||'Ajanda hatırlatması').slice(0,120),body:body||title,tag:'agenda-'+note.id+'-'+note.remind_at,id:Number(note.id),remind_at:note.remind_at,url:'/notlar-v2.html?page='+(Number(note.notebook_no)||1)+'&reminder='+note.id}}
  async function fire(note){
    if(document.hidden)return;const data=payload(note),alreadySeen=seen.has(data.tag);present(data);
    if(alreadySeen||!enabled()||!supported()||Notification.permission!=='granted')return;
    try{const reg=registration||await navigator.serviceWorker.getRegistration('/');if(!reg)return;
      await reg.showNotification(data.title,{body:data.body.slice(0,650),tag:data.tag,icon:'/agenda-icon-192.png',silent:audio?.state==='running',requireInteraction:true,renotify:false,data:{url:data.url}});
      if(status.deviceId)await api('/api/push/ack',{deviceId:status.deviceId,id:data.id,remind_at:data.remind_at});
    }catch(_){}
  }
  function time(value){const s=String(value||'').trim();return Date.parse(s.replace(' ','T')+(/(?:Z|[+-]\d{2}:?\d{2})$/.test(s)?'':'+03:00'))}
  async function enable(){unlockAudio();if(!supported())throw new Error('Bu tarayıcı telefon bildirimlerini desteklemiyor.');const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(permission!=='granted'){changed();throw new Error(permission==='denied'?'Telefon ayarlarından bu site için bildirim iznini açın.':'Bildirim izni verilmedi.')}localStorage.setItem(PREF,'1');if(!await connect())throw new Error(status.error||'Telefon bildirimi kurulamadı.')}
  async function test(){unlockAudio();try{if(audio?.state==='suspended')await audio.resume()}catch(_){}tones();if(!status.connected&&!await connect())throw new Error(status.error||'Önce bildirimleri açın.');return api('/api/push/test',{deviceId:status.deviceId})}
  window.crmReminders={status,enabled,supported,connect,enable,disable,fire,present,dismiss,time,test,unlockAudio};
  window.fetch=async function(input,init){let path='';try{path=new URL(typeof input==='string'?input:input.url,location.href).pathname}catch(_){}if(path==='/api/logout')try{await disable()}catch(_){}const response=await nativeFetch(input,init);if(path==='/api/login'&&response.ok)setTimeout(()=>{connect();openLinkedReminder()},0);return response};
  if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='CRM_REMINDER'&&enabled())present(event.data.reminder)});
  document.addEventListener('pointerdown',unlockAudio,{passive:true});document.addEventListener('keydown',unlockAudio);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSound();else{if(current&&current.sound!==false)startSound();showNext();connect()}});
  window.addEventListener('pageshow',connect);window.addEventListener('storage',event=>{if(event.key===PREF){if(!enabled()){status.connected=false;stopSound()}else connect();changed()}});
  let linkedOpened=false;
  async function openLinkedReminder(){const params=new URLSearchParams(location.search),id=Number(params.get('reminder'));if(!id||linkedOpened)return;try{const items=await api('/api/notes-v3?scope=all&notebook='+Math.max(1,Math.min(3,Number(params.get('page'))||1)));const note=items.find(x=>Number(x.id)===id);if(note){linkedOpened=true;present(payload(note),{sound:false})}}catch(_){}}
  function init(){connect();openLinkedReminder()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
