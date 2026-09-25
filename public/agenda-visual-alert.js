(function(){
  'use strict';
  if(window.__agendaVisualAlertLoaded)return;
  window.__agendaVisualAlertLoaded=true;

  const onNoteEditor=()=>['/yeni-not','/yeni-not/','/yeni-not.html'].includes(location.pathname);
  function cleanNoteEditorOverlays(){
    if(!onNoteEditor())return;
    ['agendaVisualControls','mobileNotifyBtn','mobileNotifyStatus','mobileNotifyTest','nativeAlarmPair','mobileNotifyMsg'].forEach(id=>{
      try{document.getElementById(id)?.remove()}catch(_){ }
    });
    try{document.body?.removeAttribute('data-ajanda-alarm-fixed')}catch(_){ }
  }
  if(onNoteEditor()){
    cleanNoteEditorOverlays();
    try{
      const observer=new MutationObserver(cleanNoteEditorOverlays);
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }catch(_){ }
    setTimeout(cleanNoteEditorOverlays,0);
    setTimeout(cleanNoteEditorOverlays,250);
    setTimeout(cleanNoteEditorOverlays,1000);
    window.addEventListener('pageshow',cleanNoteEditorOverlays);
    return;
  }

  const shown=new Set();
  let currentKey='';

  function ms(value){
    const raw=String(value||'').trim();
    if(!raw)return NaN;
    return new Date(raw.replace(' ','T')).getTime();
  }

  function ensureStyle(){
    if(document.getElementById('agendaVisualAlertStyle'))return;
    const style=document.createElement('style');
    style.id='agendaVisualAlertStyle';
    style.textContent=`
#agendaVisualAlert{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(15,23,42,.72)}
#agendaVisualAlert.show{display:flex}
#agendaVisualAlert .avaBox{width:min(560px,96vw);background:#fff8cc;border:4px solid #f59e0b;border-radius:18px;padding:22px;box-shadow:0 24px 70px #0008;text-align:center}
#agendaVisualAlert .avaLabel{font-size:17px;font-weight:950;color:#92400e;margin-bottom:10px}
#agendaVisualAlert .avaTime{font-size:20px;font-weight:950;color:#0f172a;margin-bottom:12px}
#agendaVisualAlert .avaText{font-size:24px;font-weight:900;line-height:1.35;color:#111827;white-space:pre-wrap;overflow-wrap:anywhere;max-height:42vh;overflow:auto}
#agendaVisualAlert .avaClose{margin-top:18px;border:0;border-radius:10px;padding:13px 22px;background:#0f766e;color:white;font-size:17px;font-weight:950;cursor:pointer}
#agendaVisualControls{position:fixed;left:245px;bottom:12px;z-index:2147482000;display:flex;gap:7px;align-items:center;flex-wrap:wrap}
#agendaVisualControls button{border:0;border-radius:10px;padding:10px 12px;font-weight:950;cursor:pointer;box-shadow:0 4px 14px #0003}
#agendaVisualEnable{background:#facc15;color:#111827}
#agendaVisualTest{background:#0f766e;color:#fff}
#agendaVisualState{background:#fff;border:1px solid #cbd5e1;border-radius:9px;padding:8px 10px;font-size:12px;font-weight:900;color:#334155}
@media(max-width:700px){#agendaVisualControls{left:10px;right:10px;bottom:10px}#agendaVisualControls button{font-size:12px;padding:9px 10px}#agendaVisualState{font-size:11px}.avaText{font-size:21px!important}}
`;
    document.head.appendChild(style);
  }

  function ensureModal(){
    ensureStyle();
    let modal=document.getElementById('agendaVisualAlert');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='agendaVisualAlert';
    modal.innerHTML='<div class="avaBox"><div class="avaLabel">🔔 AJANDA UYARISI</div><div class="avaTime" id="agendaVisualTime"></div><div class="avaText" id="agendaVisualText"></div><button type="button" class="avaClose">TAMAM — KAPAT</button></div>';
    modal.querySelector('.avaClose').onclick=()=>{modal.classList.remove('show');currentKey=''};
    document.body.appendChild(modal);
    return modal;
  }

  function showVisual(item,{force=false}={}){
    const key=String(item?.id||'test')+'|'+String(item?.remind_at||Date.now());
    if(!force&&shown.has(key))return;
    if(!force)shown.add(key);
    currentKey=key;
    const modal=ensureModal();
    const when=ms(item?.remind_at);
    document.getElementById('agendaVisualTime').textContent=Number.isFinite(when)?new Date(when).toLocaleString('tr-TR'):'Şimdi';
    document.getElementById('agendaVisualText').textContent=String(item?.note||item?.title||'Hatırlatma zamanı geldi.');
    modal.classList.add('show');
    try{window.focus()}catch(_){ }
  }

  async function registerSilentWorker(){
    if(!('serviceWorker' in navigator))return null;
    try{
      const reg=await navigator.serviceWorker.register('/agenda-sw-silent.js',{scope:'/',updateViaCache:'none'});
      await navigator.serviceWorker.ready;
      return reg;
    }catch(_){return null}
  }

  function statusText(){
    if(!('Notification' in window))return 'Ekran içi uyarı aktif';
    if(Notification.permission==='denied')return 'Bildirim izni kapalı';
    if(window.crmReminders?.status?.connected)return 'Telefon/masaüstü bildirimi bağlı';
    if(Notification.permission==='granted')return 'Bildirim izni açık';
    return 'Sessiz görsel uyarı hazır';
  }

  function updateControls(){
    const state=document.getElementById('agendaVisualState');
    const button=document.getElementById('agendaVisualEnable');
    if(state)state.textContent=statusText();
    if(button)button.textContent=window.crmReminders?.status?.connected?'✅ UYARI AÇIK':'🔔 UYARIYI AÇ';
  }

  async function enableAlerts(){
    try{
      if('Notification' in window&&Notification.permission!=='granted'){
        const p=await Notification.requestPermission();
        if(p!=='granted')throw new Error('Bildirim izni verilmedi.');
      }
      if(window.crmReminders?.enable)await window.crmReminders.enable();
      await registerSilentWorker();
      updateControls();
      showVisual({id:'enabled',title:'Uyarı sistemi açık',note:'Sessiz görsel uyarı sistemi açıldı.',remind_at:new Date().toISOString()},{force:true});
    }catch(error){
      showVisual({id:'error',title:'Uyarı açılamadı',note:String(error?.message||error),remind_at:new Date().toISOString()},{force:true});
      updateControls();
    }
  }

  async function testAlert(){
    showVisual({id:'test',note:'DENEME UYARISI — Görüntü sistemi çalışıyor.',remind_at:new Date().toISOString()},{force:true});
    if('Notification' in window&&Notification.permission==='granted'){
      try{
        const reg=await registerSilentWorker();
        await reg?.showNotification('🔔 Ajanda deneme uyarısı',{body:'Sessiz görsel bildirim çalışıyor.',tag:'agenda-visual-test-'+Date.now(),icon:'/agenda-icon-192.png',silent:true,requireInteraction:true,renotify:false,data:{url:location.pathname}});
      }catch(_){ }
    }
  }

  function ensureControls(){
    ensureStyle();
    if(document.getElementById('agendaVisualControls'))return;
    const wrap=document.createElement('div');
    wrap.id='agendaVisualControls';
    wrap.innerHTML='<button id="agendaVisualEnable" type="button">🔔 UYARIYI AÇ</button><button id="agendaVisualTest" type="button">TEST</button><span id="agendaVisualState">Sessiz görsel uyarı hazır</span>';
    wrap.querySelector('#agendaVisualEnable').onclick=enableAlerts;
    wrap.querySelector('#agendaVisualTest').onclick=testAlert;
    document.body.appendChild(wrap);
    updateControls();
  }

  async function poll(){
    try{
      const response=await fetch('/api/agenda/reminders',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)return;
      const items=await response.json();
      if(!Array.isArray(items))return;
      const now=Date.now();
      const due=items.filter(item=>{
        const when=ms(item?.remind_at);
        return item?.reminder_status==='Açık'&&Number.isFinite(when)&&when<=now&&now-when<86400000&&!shown.has(String(item.id)+'|'+String(item.remind_at));
      }).sort((a,b)=>String(a.remind_at).localeCompare(String(b.remind_at)));
      if(due.length&&!document.hidden&&!currentKey)showVisual(due[0]);
    }catch(_){ }
  }

  // Ana CRM'deki eski Ajanda uyarısını da sessiz görsele çevir.
  function replaceLegacyAgendaAlert(){
    try{window.showAgendaReminder=function(item){showVisual(item)}}catch(_){ }
  }

  function init(){
    ensureControls();
    ensureModal();
    replaceLegacyAgendaAlert();
    registerSilentWorker();
    poll();
    setInterval(poll,5000);
    setInterval(replaceLegacyAgendaAlert,3000);
    window.addEventListener('crm-reminders-state',updateControls);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();