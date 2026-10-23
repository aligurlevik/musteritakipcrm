(function(){
 'use strict';
 // Use one silent visual policy in both the CRM and the phone agenda.
 window.CRM_SILENT_DESKTOP=true;
 if(navigator.serviceWorker){
  const register=navigator.serviceWorker.register.bind(navigator.serviceWorker);
  navigator.serviceWorker.register=(url,options)=>register(String(url).split('?')[0]==='/agenda-sw.js'?'/agenda-sw-silent.js?v=20261023':url,options);
 }
 try{
  const proto=window.ServiceWorkerRegistration?.prototype;
  if(proto){const raw=proto.showNotification;proto.showNotification=function(title,options){const safe={...options,silent:true,renotify:false};delete safe.vibrate;return raw.call(this,title,safe)}}
 }catch(_){}
 function silenceLegacy(){
  window.unlockReminderAudio=function(){};
  window.playReminderSound=function(){};
 }
 document.addEventListener('DOMContentLoaded',silenceLegacy,{once:true});
 const style=document.createElement('style');
 style.textContent=`
 #agendaReminderPopup,#crmPhoneAlarm,#agendaVisualAlert{padding:0!important;z-index:2147483646!important;background:#fff1a8!important}
 #agendaReminderPopup>.box,#crmPhoneAlarm .crmAlarmBox,#agendaVisualAlert .avaBox{width:100vw!important;max-width:none!important;height:100dvh!important;max-height:100dvh!important;overflow:auto!important;border-radius:0!important;padding:clamp(24px,5vw,80px)!important;background:#fff1a8!important;box-sizing:border-box!important}
 #agendaReminderNote,#crmPhoneAlarm .crmAlarmText,#agendaVisualAlert .avaText{max-height:65vh!important;font-size:clamp(22px,3vw,40px)!important;line-height:1.5!important;overflow:auto!important;white-space:pre-wrap!important}
 .crmAgendaAlarmTitle,#crmAlarmTitle,.note-title,#title{ text-transform:uppercase }
 #crmScratchAlarm{position:fixed;inset:0;z-index:2147483647;background:#fff1a8;padding:clamp(24px,6vw,90px);overflow:auto;color:#17283c}
 #crmScratchAlarm h2{font-size:clamp(24px,4vw,48px)}#crmScratchAlarm p{font-size:clamp(22px,3vw,40px);white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}#crmScratchAlarm button{font-size:22px;padding:16px 30px;cursor:pointer}
 `;
 document.head.appendChild(style);
 const queue=[];let showing=false;
 function next(){
  if(showing||!queue.length)return;showing=true;
  const modal=document.createElement('section');modal.id='crmScratchAlarm';modal.setAttribute('role','alertdialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Not hatırlatması');
  const title=document.createElement('h2');title.textContent='NOT HATIRLATMASI';
  const body=document.createElement('p');body.textContent=queue.shift();
  const close=document.createElement('button');close.textContent='TAMAM — KAPAT';close.onclick=()=>{modal.remove();showing=false;next()};
  modal.append(title,body,close);document.body.appendChild(modal);close.focus();
 }
 window.addEventListener('message',event=>{
  const frame=document.getElementById('desktopNotesFrame');
  if(event.origin!==location.origin||!frame||event.source!==frame.contentWindow||event.data?.type!=='CRM_SCRATCH_ALARM'||typeof event.data.text!=='string')return;
  queue.push(event.data.text.slice(0,51000));next();
 });
})();
