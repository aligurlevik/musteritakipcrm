const iconVersion='20260918-2';

export async function applyCrmBranding(response,request){
  if(request&&request.method!=='GET')return response;
  if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  const requestUrl=request?new URL(request.url):null;
  const path=requestUrl?requestUrl.pathname:'';
  const onMainCrm=['/','/index.html'].includes(path);
  const userAgent=request?.headers.get('user-agent')||'';
  const isWindows=/Windows/i.test(userAgent);

  html=html.replace(/<link\b[^>]*\brel\s*=\s*(?:"(?:shortcut\s+)?icon"|'(?:shortcut\s+)?icon'|"apple-touch-icon"|'apple-touch-icon')[^>]*>/gi,'');
  if(onMainCrm)html=html.replace(/<link\b[^>]*\brel\s*=\s*["']manifest["'][^>]*>/gi,'<link rel="manifest" href="/crm.webmanifest">');
  const icons=`<link rel="icon" type="image/png" sizes="192x192" href="/agenda-icon-192.png?v=${iconVersion}">
<link rel="icon" type="image/png" sizes="512x512" href="/agenda-icon-512.png?v=${iconVersion}">
<link rel="apple-touch-icon" sizes="192x192" href="/agenda-icon-192.png?v=${iconVersion}">`;
  const manifest=/<link\b[^>]*\brel\s*=\s*["']manifest["']/i.test(html)?'':'<link rel="manifest" href="/crm.webmanifest">';
  html=html.replace(/<\/head>/i,icons+'\n'+manifest+'\n</head>');
  html=html.replace('<div class="logo">CRM Müşteri Takip</div>','<div class="logo crmBrand"><img src="/notes-logo-ag-v1.webp" width="48" height="48" alt="AG"><span>CRM Müşteri Takip</span></div>');
  if(html.includes('class="logo crmBrand"')&&!html.includes('id="crmBrandStyle"'))html=html.replace(/<\/head>/i,'<style id="crmBrandStyle">.crmBrand{display:flex;align-items:center;gap:10px}.crmBrand img{display:block;width:48px;height:48px;flex:0 0 48px;object-fit:contain}</style>\n</head>');

  // Ana CRM menüsüne gerçek Müşteri Portföyü panosunu ekle.
  if(onMainCrm&&!html.includes('data-portfolio-nav="1"')){
    const portfolioButton='<button type="button" data-portfolio-nav="1" onclick="location.href=\'/musteri-portfoyu.html\'">📊 Müşteri Portföyü</button>';
    const customerButton='<button data-page="customers" data-result="">Müşteriler</button>';
    if(html.includes(customerButton))html=html.replace(customerButton,customerButton+portfolioButton);
    else html=html.replace(/(<div class="menu">)/i,'$1'+portfolioButton);
  }

  // Portföy sayfasındaki + Yeni Müşteri düğmesi doğrudan müşteri ekleme formunu açsın.
  if(path==='/musteri-portfoyu.html'&&!html.includes('id="crmPortfolioNavigationFix"')){
    const portfolioNavFix=`<script id="crmPortfolioNavigationFix">
(function(){
  document.addEventListener('click',function(event){
    var link=event.target&&event.target.closest?event.target.closest('a[href]'):null;
    if(!link)return;
    var text=(link.textContent||'').trim();
    if(text.indexOf('Yeni Müşteri')!==-1){
      event.preventDefault();
      location.href='/?page=customers&newCustomer=1';
    }
  },true);
})();
</script>`;
    html=html.replace(/<\/body>/i,portfolioNavFix+'\n</body>');
  }

  // URL ile istenen CRM bölümünü gerçekten aç; yeniCustomer=1 ise formu da aç.
  if(onMainCrm&&requestUrl&&!html.includes('id="crmQueryNavigationFix"')){
    const requestedPage=requestUrl.searchParams.get('page')||'';
    const shouldOpenCustomer=requestUrl.searchParams.get('newCustomer')==='1';
    if(requestedPage||shouldOpenCustomer){
      const queryNavFix=`<script id="crmQueryNavigationFix">
(function(){
  var requestedPage=${JSON.stringify(requestedPage)};
  var openNewCustomer=${shouldOpenCustomer?'true':'false'};
  var tries=0;
  function go(){
    tries++;
    var login=document.getElementById('login');
    if(login&&login.classList.contains('show')){if(tries<80)setTimeout(go,250);return;}
    if(requestedPage){
      var pageButton=document.querySelector('.menu button[data-page="'+requestedPage+'"]');
      if(pageButton)pageButton.click();
    }
    if(openNewCustomer){
      if(typeof window.openCustomer==='function'){
        try{window.openCustomer();history.replaceState(null,'','/');return}catch(_){}
      }
      if(tries<80){setTimeout(go,250);return;}
    }
    try{history.replaceState(null,'','/')}catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(go,100)},{once:true});else setTimeout(go,100);
})();
</script>`;
      html=html.replace(/<\/body>/i,queryNavFix+'\n</body>');
    }
  }

  // Ana Ajanda üst şeridi temiz kalsın; aç/kapat/test düğmeleri görünmesin.
  if(onMainCrm){
    html=html.replace('<button class="btn green" onclick="enableNotifications()">🔔 Masaüstü Bildirimini Aç</button>','');
    const cleanStyle=`<style id="crmAgendaAlarmCleanStyle">
#agendaMonthControls #mobileNotifyBtn,#agendaMonthControls #mobileNotifyStatus,#agendaMonthControls #mobileNotifyTest,#agendaMonthControls #nativeAlarmPair{display:none!important}
</style>`;
    html=html.replace(/<\/head>/i,cleanStyle+'\n</head>');
  }

  // Telefon ve bilgisayar uyarı kanalı kullanıcı kapatmadan sürekli açık kabul edilir.
  // Önceki sürüm Windows'ta reminders.disable() çağırdığı için bilgisayar uyarısını kapatıyordu.
  if(!html.includes('id="crmPermanentAlarmPolicy"')){
    const permanentPolicy=`<script id="crmPermanentAlarmPolicy">
(function(){
  var pref='crm_notifications_enabled';
  try{localStorage.setItem(pref,'1')}catch(_){}

  function cleanAgendaControls(){
    var host=document.getElementById('agendaMonthControls');
    if(!host)return;
    ['mobileNotifyBtn','mobileNotifyStatus','mobileNotifyTest','nativeAlarmPair'].forEach(function(id){
      var el=document.getElementById(id);if(el&&host.contains(el))el.remove();
    });
  }

  var tries=0;
  function enforce(){
    cleanAgendaControls();
    try{localStorage.setItem(pref,'1')}catch(_){}
    var reminders=window.crmReminders;
    if(!reminders){if(++tries<40)setTimeout(enforce,500);return}
    try{
      if('Notification' in window&&Notification.permission==='granted'&&!reminders.status.connected&&!reminders.status.busy){
        Promise.resolve(reminders.connect()).catch(function(){});
      }
    }catch(_){}
  }

  function start(){
    enforce();
    cleanAgendaControls();
    try{new MutationObserver(cleanAgendaControls).observe(document.documentElement,{childList:true,subtree:true})}catch(_){}
    window.addEventListener('pageshow',enforce);
    window.addEventListener('focus',enforce);
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')enforce()});
    setInterval(enforce,15000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;
    html=html.replace(/<\/body>/i,permanentPolicy+'\n</body>');
  }

  // Windows'ta telefonun sesli alarm ayarını kullanma: bildirim görünür kalır,
  // fakat Web Audio, titreşim ve işletim sistemi bildirim sesi kapatılır.
  if(isWindows&&!html.includes('id="crmSilentDesktopWorker"')){
    const silentWorker=`<script id="crmSilentDesktopWorker">
(function(){
  window.CRM_SILENT_DESKTOP=true;
  if(!('serviceWorker' in navigator))return;
  try{
    var rawRegister=navigator.serviceWorker.register.bind(navigator.serviceWorker);
    var silentUrl='/agenda-sw-silent.js?v=20261013-3';
    navigator.serviceWorker.register=function(url,options){
      return rawRegister(url==='/agenda-sw.js'?silentUrl:url,options);
    };
    rawRegister(silentUrl,{scope:'/',updateViaCache:'none'}).catch(function(){});
  }catch(_){}
  // Eski sesli worker bir mesajı tam geçiş anında gönderirse telefon alarm
  // dinleyicisine ulaşmadan kes. Ekran uyarısını sayfanın kendi alarm taraması açar.
  if(!window.__crmSilentDesktopMessageGuard){
    window.__crmSilentDesktopMessageGuard=true;
    navigator.serviceWorker.addEventListener('message',function(event){
      if(!event.data||event.data.type!=='CRM_REMINDER')return;
      try{event.stopImmediatePropagation()}catch(_){}
      try{event.stopPropagation()}catch(_){}
    },true);
  }
  try{
    var proto=window.ServiceWorkerRegistration&&window.ServiceWorkerRegistration.prototype;
    if(proto&&typeof proto.showNotification==='function'&&!proto.showNotification.__crmSilentDesktop){
      var rawShow=proto.showNotification;
      var silentShow=function(title,options){
        var safe=Object.assign({},options||{},{silent:true,renotify:false});
        try{delete safe.vibrate}catch(_){}
        return rawShow.call(this,title,safe);
      };
      silentShow.__crmSilentDesktop=true;
      proto.showNotification=silentShow;
    }
  }catch(_){}
})();
</script>`;
    // Bayrak, ortak telefon alarm dosyası çalışmadan önce yerleşsin. Böylece eski
    // bir worker sayfa açılırken mesaj gönderse bile Windows'ta ses başlayamaz.
    html=html.replace(/\/phone-reminders\.js(?:\?v=[^"']+)?/g,'/phone-reminders.js?v=20261013-desktop-silent3');
    const phoneReminderScript=/<script\b[^>]*\bsrc\s*=\s*["']\/phone-reminders\.js[^"']*["'][^>]*><\/script>/i;
    html=phoneReminderScript.test(html)
      ?html.replace(phoneReminderScript,silentWorker+'\n$&')
      :html.replace(/<\/head>/i,silentWorker+'\n</head>');
  }

  // Windows'ta ses yok; ekrandaki büyük görsel uyarı ve sessiz sistem bildirimi kalır.
  if(isWindows&&!html.includes('id="crmSilentDesktopAlarm"')){
    const silentDesktop=`<script id="crmSilentDesktopAlarm">
(function(){
  function noteParts(note){
    var saved=String(note&&note.title||'').trim();
    var raw=String(note&&note.note||'').replace(/\\r\\n/g,'\\n').trim();
    if(saved){
      var savedLines=raw.split('\\n'),detail=raw;
      if((savedLines[0]||'').trim()===saved)detail=savedLines.slice(1).join('\\n').trim();
      if(detail===saved)detail='';
      return {title:saved,detail:detail};
    }
    var lines=raw.split('\\n'),title=(lines.shift()||'').trim();
    return {title:title||'Ajanda hatırlatması',detail:lines.join('\\n').trim()};
  }
  function visualPayload(note){
    var notebook=Math.max(1,Math.min(3,Number(note&&note.notebook_no)||1));
    if(notebook>1)return {title:'🔒 Özel not hatırlatıcısı',body:'İçeriği görmek için Not '+notebook+' özel şifresini girin.',tag:'agenda-'+note.id+'-'+note.remind_at,id:Number(note.id),remind_at:note.remind_at,url:'/notlar-v2.html?page='+notebook+'&reminder='+note.id};
    var parts=noteParts(note),body=parts.detail||String(note&&note.note||'').trim()||parts.title;
    return {title:parts.title.slice(0,120),body:body,tag:'agenda-'+note.id+'-'+note.remind_at,id:Number(note.id),remind_at:note.remind_at,url:'/notlar-v2.html?page='+notebook+'&reminder='+note.id};
  }
  function ensureAgendaAlarmStyle(){
    if(document.getElementById('crmSilentAgendaAlarmStyle'))return;
    var style=document.createElement('style');style.id='crmSilentAgendaAlarmStyle';
    style.textContent='#agendaReminderNote.crmAgendaAlarmCard{padding:0!important;overflow:hidden;background:#fffaf0!important;border:2px solid #ffad57!important}.crmAgendaAlarmTitle{display:block;width:100%;border:0;border-bottom:1px solid #fed7aa;background:#fff7ed;color:#111827;text-align:left;padding:15px 17px;font-size:20px;font-weight:950;cursor:pointer}.crmAgendaAlarmTitle:hover,.crmAgendaAlarmTitle:focus{background:#ffedd5;outline:3px solid #fdba74;outline-offset:-3px}.crmAgendaAlarmDetail{padding:14px 17px 16px;white-space:pre-wrap;line-height:1.55;font-size:17px;color:#1f2937;max-height:36vh;overflow:auto}.crmAgendaAlarmDetail.empty{color:#64748b;font-style:italic}.crmAgendaAlarmHint{padding:0 17px 12px;color:#92400e;font-size:11px;font-weight:850}';
    document.head.appendChild(style);
  }
  function renderAgendaAlarm(note){
    var card=document.getElementById('agendaReminderNote');if(!card)return;
    ensureAgendaAlarmStyle();
    var parts=noteParts(note),title=document.createElement('button'),detail=document.createElement('div'),hint=document.createElement('div');
    card.replaceChildren();card.classList.add('crmAgendaAlarmCard');
    title.type='button';title.className='crmAgendaAlarmTitle';title.textContent=parts.title;title.setAttribute('aria-label','Notu aç: '+parts.title);
    detail.className='crmAgendaAlarmDetail'+(parts.detail?'':' empty');detail.textContent=parts.detail||'Bu başlık için açıklama eklenmemiş.';
    hint.className='crmAgendaAlarmHint';hint.textContent='Başlığa basarak notun tamamını açabilirsiniz.';
    title.onclick=function(event){
      event.preventDefault();event.stopPropagation();
      detail.hidden=false;
      if(typeof window.openAgendaTitleDetail==='function')window.openAgendaTitleDetail(Number(note&&note.id),note);
      else try{detail.scrollIntoView({block:'nearest'})}catch(_){}
    };
    card.append(title,detail,hint);
  }
  function stopLegacyAudio(){
    try{navigator.vibrate&&navigator.vibrate(0)}catch(_){}
    try{
      if(typeof reminderAudioContext!=='undefined'&&reminderAudioContext&&typeof reminderAudioContext.close==='function'){
        var legacyContext=reminderAudioContext;reminderAudioContext=null;legacyContext.close().catch(function(){});
      }
    }catch(_){}
    try{
      if(window.reminderAudioContext&&typeof window.reminderAudioContext.close==='function'){
        var windowContext=window.reminderAudioContext;window.reminderAudioContext=null;windowContext.close().catch(function(){});
      }
    }catch(_){}
  }
  function installLegacySilence(){
    try{if(typeof unlockReminderAudio==='function')unlockReminderAudio=function(){}}catch(_){}
    try{if(typeof playReminderSound==='function')playReminderSound=function(){stopLegacyAudio()}}catch(_){}
    // Windows'ta işletim sistemi bildirimi yerine ekrandaki büyük CRM penceresi kullanılır.
    try{if(typeof showDesktopReminder==='function')showDesktopReminder=function(){}}catch(_){}
    try{
      if(typeof showAgendaReminder==='function'&&!showAgendaReminder.__crmSilentDesktop){
        var silentShowAgenda=function(note){
          stopLegacyAudio();
          try{if(typeof activeAgendaReminder!=='undefined')activeAgendaReminder=note}catch(_){}
          var date=document.getElementById('agendaReminderDate');
          if(date){
            var when=new Date(note&&note.remind_at||'');
            date.textContent=Number.isNaN(when.getTime())?'Şimdi':when.toLocaleString('tr-TR');
          }
          renderAgendaAlarm(note||{});
          try{if(typeof openM==='function')openM('agendaReminderPopup');else document.getElementById('agendaReminderPopup')?.classList.add('show')}catch(_){}
          try{if(typeof bringCrmToFront==='function')bringCrmToFront()}catch(_){}
        };
        silentShowAgenda.__crmSilentDesktop=true;
        showAgendaReminder=silentShowAgenda;
        try{window.showAgendaReminder=silentShowAgenda}catch(_){}
      }
    }catch(_){}
  }
  function labelSilentControls(){
    var test=document.getElementById('mobileNotifyTest');
    if(test&&test.textContent!=='👁 GÖRSEL UYARI TESTİ')test.textContent='👁 GÖRSEL UYARI TESTİ';
    var visualTest=document.getElementById('agendaVisualTest');
    if(visualTest&&visualTest.textContent!=='GÖRSEL TEST')visualTest.textContent='GÖRSEL TEST';
    var visualState=document.getElementById('agendaVisualState');
    if(visualState&&visualState.textContent!=='Sessiz görsel uyarı hazır')visualState.textContent='Sessiz görsel uyarı hazır';
    var button=document.getElementById('mobileNotifyBtn');
    if(button&&/SESLİ UYARI AÇIK/.test(button.textContent||''))button.textContent='✅ SESSİZ UYARI AÇIK';
    var status=document.getElementById('mobileNotifyStatus');
    if(status&&/SESLİ AJANDA UYARISI AÇIK/.test(status.textContent||''))status.textContent='✅ BİLGİSAYARDA SESSİZ GÖRSEL UYARI — SES YOK';
    if(status&&/AJANDA SAATİNDE SESLİ UYARI VERİLİR/.test(status.textContent||''))status.textContent='👁 AJANDA SAATİNDE SESSİZ GÖRSEL UYARI VERİLİR';
    var visualText=document.getElementById('agendaVisualText');
    if(visualText&&visualText.textContent==='Sesli ajanda uyarısı açıldı.')visualText.textContent='Sessiz görsel ajanda uyarısı açıldı. Ses yok.';
    var flash=document.getElementById('mobileNotifyMsg');
    if(flash&&/^✅ Sesli Ajanda uyarısı açıldı\.?$/.test(flash.textContent||''))flash.textContent='✅ Sessiz görsel Ajanda uyarısı açıldı. Ses yok.';
    if(flash&&/^✅ Sesli test gönderildi\./.test(flash.textContent||''))flash.textContent='✅ Sessiz görsel test gönderildi. Ses yok.';
    var closeButton=document.querySelector('#crmPhoneAlarm button');
    if(closeButton&&closeButton.textContent!=='✓ Tamam — Kapat')closeButton.textContent='✓ Tamam — Kapat';
  }
  function silence(){
    installLegacySilence();
    stopLegacyAudio();
    try{
      var reminders=window.crmReminders;
      if(reminders&&!reminders.__silentDesktop){
        reminders.__silentDesktop=true;
        reminders.fire=async function(note){
          if(document.hidden)return;
          var data=visualPayload(note);
          reminders.present(data,{sound:false});
          labelSilentControls();
          if(reminders.status&&reminders.status.deviceId){
            try{await fetch('/api/push/ack',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({deviceId:reminders.status.deviceId,id:data.id,remind_at:data.remind_at})})}catch(_){}
          }
        };
      }
    }catch(_){}
    try{
      window.showDesktopReminder=function(){};
    }catch(_){}
    labelSilentControls();
  }
  silence();
  try{new MutationObserver(labelSilentControls).observe(document.documentElement,{childList:true,subtree:true,characterData:true})}catch(_){}
  window.addEventListener('load',silence,{once:true});
  window.addEventListener('crm-reminders-state',silence);
  setTimeout(silence,0);
  setTimeout(silence,500);
  setTimeout(silence,2000);
})();
</script>`;
    html=html.replace(/<\/body>/i,silentDesktop+'\n</body>');
  }

  // Bağımsız Windows EXE de çalışmaya devam eder; normalken üstte yer kaplamaz.
  // Yalnızca EXE kapalı/kurulu değilse uyarı görünür.
  if(isWindows&&onMainCrm&&!html.includes('id="crmWindowsAlarmStatusScript"')){
    const windowsStatus=`<script id="crmWindowsAlarmStatusScript">
(function(){
  var timer=null;
  function hide(button){if(button)button.style.display='none'}
  function paint(button,state,text){
    if(!button)return;
    button.style.display='inline-flex';button.style.alignItems='center';button.style.gap='5px';
    button.textContent=text;
    button.style.border='1px solid';button.style.borderRadius='9px';button.style.padding='8px 11px';
    button.style.fontWeight='900';button.style.cursor='pointer';
    if(state==='bad'){
      button.style.background='#fee2e2';button.style.color='#991b1b';button.style.borderColor='#fca5a5';
    }else{
      button.style.background='#fef3c7';button.style.color='#92400e';button.style.borderColor='#fcd34d';
    }
  }
  function ensureButton(){
    var agenda=document.getElementById('agenda');if(!agenda)return null;
    var button=document.getElementById('crmWindowsAlarmStatus');if(button)return button;
    button=document.createElement('button');button.type='button';button.id='crmWindowsAlarmStatus';button.className='btn';
    button.style.display='none';button.onclick=function(){location.href='/windows-alarm.html'};
    var toolbar=agenda.querySelector('.toolbar');if(toolbar)toolbar.appendChild(button);else agenda.insertBefore(button,agenda.firstChild);
    return button;
  }
  async function check(){
    var button=ensureButton();if(!button)return;
    try{
      var response=await fetch('/api/native-alarm/status',{credentials:'same-origin',cache:'no-store'});
      var data={};try{data=await response.json()}catch(_){}
      if(response.status===401||!response.ok){hide(button);return}
      if(!data.installed){paint(button,'warn','🟠 Windows alarmı kurulu değil');button.title='Kurmak için tıklayın.'}
      else if(data.online){hide(button)}
      else{paint(button,'bad','🔴 Windows alarmı çalışmıyor');button.title='Alarm servisini düzeltmek için tıklayın.'}
    }catch(_){hide(button)}
  }
  function start(){
    ensureButton();check();if(timer)clearInterval(timer);timer=setInterval(check,10000);
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')check()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;
    html=html.replace(/<\/body>/i,windowsStatus+'\n</body>');
  }

  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
