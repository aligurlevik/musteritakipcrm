(function(){
  const reminders=window.crmReminders;if(!reminders)return;
  const isiOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  const onPlanner=()=>['/planlama','/planlama/','/planlama.html'].includes(location.pathname);
  const onMainAgenda=()=>!!document.getElementById('agendaMonthControls');
  const onAgendaAlarmPage=()=>onPlanner()||onMainAgenda();
  let working=false;
  function flash(text){let el=document.getElementById('mobileNotifyMsg');if(!el){el=document.createElement('div');el.id='mobileNotifyMsg';el.style.cssText='position:fixed;left:12px;right:12px;bottom:90px;z-index:10001;background:#102f4d;color:#fff;padding:12px 14px;border-radius:10px;font-weight:900;text-align:center;box-shadow:0 8px 24px #0005';document.body.appendChild(el)}el.textContent=text;el.style.display='block';clearTimeout(window.__notifyMsgTimer);window.__notifyMsgTimer=setTimeout(()=>el.style.display='none',6500)}
  function visualPayload(note){
    const notebook=Math.max(1,Math.min(3,Number(note?.notebook_no)||1));
    if(notebook>1)return {title:'🔒 Özel not hatırlatıcısı',body:'İçeriği görmek için Not '+notebook+' özel şifresini girin.',tag:'agenda-'+note.id+'-'+note.remind_at,id:Number(note.id),remind_at:note.remind_at,url:'/notlar-v2.html?page='+notebook+'&reminder='+note.id};
    const title=String(note?.title||'').trim(),body=String(note?.note||'').trim();
    return {title:(title||body.split('\n')[0]||'Ajanda hatırlatması').slice(0,120),body:body||title,tag:'agenda-'+note.id+'-'+note.remind_at,id:Number(note.id),remind_at:note.remind_at,url:'/notlar-v2.html?page='+notebook+'&reminder='+note.id};
  }
  function installVisualOnly(){
    if(reminders.__visualOnly)return;
    reminders.__visualOnly=true;
    reminders.fire=async function(note){
      if(document.hidden)return;
      const data=visualPayload(note);
      reminders.present(data,{sound:false});
      if(reminders.status.deviceId){
        try{await fetch('/api/push/ack',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({deviceId:reminders.status.deviceId,id:data.id,remind_at:data.remind_at})})}catch(_){}
      }
    };
  }
  async function ensureSilentWorker(){
    if(!('serviceWorker'in navigator))return null;
    try{return await navigator.serviceWorker.register('/agenda-sw-silent.js',{scope:'/',updateViaCache:'none'})}catch(_){return navigator.serviceWorker.getRegistration('/')}
  }
  function update(){
    const btn=document.getElementById('mobileNotifyBtn'),status=document.getElementById('mobileNotifyStatus'),test=document.getElementById('mobileNotifyTest');if(!btn||!status)return;
    let text='',mode='warn';btn.disabled=working||reminders.status.busy;
    if(isiOS()&&!standalone()){btn.textContent='📱 Ana Ekrana Ekle';text='📱 BİLDİRİM İÇİN: ANA EKRANA EKLE'}
    else if(!reminders.supported()){btn.textContent=onAgendaAlarmPage()?'📱 Telefon Alarmı':'🔔 Bildirim';text='Telefon bildirimi için güncel Chrome veya Safari kullanın.'}
    else if(Notification.permission==='denied'){btn.textContent='❌ BİLDİRİM İZNİ KAPALI';text='❌ TELEFON AYARLARINDAN BİLDİRİM İZNİNİ AÇIN';mode='bad'}
    else if(reminders.status.busy){btn.textContent='⏳ BAĞLANIYOR';text='⏳ TELEFON BİLDİRİMLERİ KURULUYOR'}
    else if(reminders.enabled()&&reminders.status.connected){btn.textContent=onAgendaAlarmPage()?'✅ TELEFON UYARISI AÇIK':'✅ Bildirim Açık';text='✅ SESSİZ GÖRSEL UYARI AÇIK — SES VE TİTREŞİM YOK';mode='ok'}
    else if(reminders.status.error){btn.textContent=onAgendaAlarmPage()?'📱 TELEFON UYARISINI AÇ':'🔔 Bildirimi Aç';text=reminders.status.error}
    else if(!reminders.enabled()){btn.textContent=onAgendaAlarmPage()?'📱 TELEFON UYARISINI AÇ':'🔕 Bildirim Kapalı';text='🔕 TELEFON UYARILARI KAPALI — AÇMAK İÇİN BAS';mode='bad'}
    else{btn.textContent=onAgendaAlarmPage()?'📱 TELEFON UYARISINI AÇ':'🔔 Bildirimi Aç';text='👁 AJANDA SAATİNDE SADECE GÖRSEL UYARI GÖSTERİLİR'}
    status.textContent=text;status.dataset.mode=mode;status.disabled=btn.disabled;test.hidden=!(reminders.enabled()&&reminders.status.connected);test.disabled=working;
  }
  async function toggle(){if(working)return;if(isiOS()&&!standalone()){flash('Safari → Paylaş → Ana Ekrana Ekle yapın. Sonra ajandayı ana ekrandaki simgeden açın.');return}working=true;update();try{await ensureSilentWorker();if(reminders.enabled()&&reminders.status.connected){await reminders.disable();flash('🔕 Telefon uyarıları kapatıldı.')}else{await reminders.enable();await ensureSilentWorker();flash('✅ Sessiz görsel Ajanda uyarısı açıldı. Ses ve titreşim yok.')}}catch(error){flash(error.message)}finally{working=false;update()}}
  async function testAlarm(){
    if(working)return;working=true;update();
    try{
      if(Notification.permission!=='granted')await reminders.enable();
      const reg=await ensureSilentWorker()||await navigator.serviceWorker.ready;
      const tag='agenda-visual-test-'+Date.now();
      await reg.showNotification('👁 Ajanda görsel uyarı testi',{body:'Bu uyarı sadece görüntüdür. Ses ve titreşim yok.',tag,icon:'/agenda-icon-192.png',badge:'/notes-logo-ag-v1.png',silent:true,requireInteraction:true,renotify:false,data:{url:'/'}});
      if(reminders.status.deviceId){
        fetch('/api/push/test',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({deviceId:reminders.status.deviceId})}).catch(()=>{});
      }
      flash('✅ Sessiz görsel test gönderildi. Ses/titreşim olmaması normal.');
    }catch(error){flash(error.message)}finally{working=false;update()}
  }
  async function pairNativeAlarm(){if(working)return;working=true;update();try{const r=await fetch('/api/native-alarm/pair-code',{method:'POST',credentials:'same-origin',cache:'no-store'});let d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'Eşleştirme kodu oluşturulamadı.');flash('📱 ALARM UYGULAMASI KODU: '+d.code+' — 10 dakika geçerli.')}catch(error){flash(error.message)}finally{working=false;update()}}
  function init(){
    installVisualOnly();ensureSilentWorker();
    if(document.getElementById('mobileNotifyBtn')){update();return}
    const agendaHost=document.getElementById('agendaMonthControls');
    const host=agendaHost||document.querySelector('.mobileTopActions')||document.querySelector('.top .actions')||document.querySelector('.toprow');if(!host)return;
    const style=document.createElement('style');style.textContent='#mobileNotifyBtn{border:0;border-radius:10px;padding:9px 8px;background:#fff;color:#123f68;font-size:12px;font-weight:950;white-space:nowrap;box-shadow:0 1px 4px #0002}#mobileNotifyStatus{display:block;width:calc(100% - 18px);margin:7px 9px 0;padding:10px;border:2px solid #d6a700;border-radius:10px;background:#fff4c2;color:#6c5200;text-align:center;font-size:13px;font-weight:950}#mobileNotifyStatus[data-mode=ok]{background:#dcfce7;border-color:#16a34a;color:#166534}#mobileNotifyStatus[data-mode=bad]{background:#fee2e2;border-color:#dc2626;color:#991b1b}#mobileNotifyTest,#nativeAlarmPair{display:block;margin:5px 9px;padding:7px 10px;border:1px solid #9db7cf;border-radius:9px;background:#eef5fb;color:#173f63;font-size:12px;font-weight:900}#mobileNotifyTest[hidden]{display:none}#mobileNotifyBtn:disabled,#mobileNotifyStatus:disabled{opacity:.65}#agendaMonthControls #mobileNotifyBtn{background:#2563eb!important;color:#fff!important;border:0!important;border-radius:8px!important;padding:9px 12px!important;font-size:13px!important;box-shadow:none!important}#agendaMonthControls #mobileNotifyTest{display:inline-block;margin:0;padding:9px 12px;border:0;border-radius:8px;background:#0f766e;color:#fff;font-size:13px;font-weight:800}#agendaMonthControls #mobileNotifyTest[hidden]{display:none!important}body[data-ajanda-alarm-fixed="1"] #mobileNotifyBtn{position:fixed!important;right:12px!important;bottom:14px!important;z-index:10000!important;background:#ffd338!important;color:#202124!important;border:2px solid #202124!important;border-radius:14px!important;padding:13px 16px!important;font-size:14px!important;font-weight:950!important;box-shadow:0 8px 26px #0005!important;display:block!important;max-width:calc(100vw - 24px)!important}body[data-ajanda-alarm-fixed="1"] #mobileNotifyTest{position:fixed!important;right:12px!important;bottom:72px!important;z-index:9999!important;margin:0!important;box-shadow:0 6px 20px #0004!important}body[data-ajanda-alarm-fixed="1"] #mobileNotifyStatus{display:none!important}@media(max-width:430px){#mobileNotifyBtn{padding:8px 6px;font-size:11px}body[data-ajanda-alarm-fixed="1"] #mobileNotifyBtn{font-size:13px!important;padding:12px 14px!important}}';document.head.appendChild(style);
    if(onPlanner())document.body.setAttribute('data-ajanda-alarm-fixed','1');
    const btn=document.createElement('button');btn.id='mobileNotifyBtn';btn.type='button';btn.onclick=toggle;
    if(agendaHost){btn.className='btn primary';agendaHost.appendChild(btn)}else host.insertBefore(btn,host.firstChild);
    const status=document.createElement('button');status.id='mobileNotifyStatus';status.type='button';status.onclick=toggle;
    if(agendaHost){status.style.display='none';agendaHost.appendChild(status)}else (document.querySelector('.tabs')||document.querySelector('.top')).insertAdjacentElement('afterend',status);
    const test=document.createElement('button');test.id='mobileNotifyTest';test.type='button';test.textContent=onMainAgenda()?'👁 TELEFON UYARI TESTİ':onPlanner()?'👁 AJANDA UYARI TESTİ':'👁 BİLDİRİM TESTİ';test.onclick=testAlarm;
    if(agendaHost)agendaHost.appendChild(test);else status.insertAdjacentElement('afterend',test);
    if(!onAgendaAlarmPage()){const pair=document.createElement('button');pair.id='nativeAlarmPair';pair.type='button';pair.textContent='📱 GERÇEK ALARM UYGULAMASINI BAĞLA';pair.onclick=pairNativeAlarm;test.insertAdjacentElement('afterend',pair)}
    update();
  }
  window.addEventListener('crm-reminders-state',update);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();window.addEventListener('pageshow',init);
})();
