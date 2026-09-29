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

  // Windows'ta ses yok; fakat görsel uyarı kapatılmaz.
  if(isWindows&&!html.includes('id="crmSilentDesktopAlarm"')){
    const silentDesktop=`<script id="crmSilentDesktopAlarm">
(function(){
  function silence(){
    try{window.unlockReminderAudio=function(){}}catch(_){}
    try{window.playReminderSound=function(){}}catch(_){}
    try{
      if(window.reminderAudioContext&&typeof window.reminderAudioContext.close==='function'){
        window.reminderAudioContext.close().catch(function(){});
        window.reminderAudioContext=null;
      }
    }catch(_){}
    try{
      window.showDesktopReminder=function(title,body,tag){
        if(!('Notification' in window)||Notification.permission!=='granted')return;
        var notice=new Notification(title,{body:body,tag:tag,requireInteraction:true,renotify:false,silent:true});
        notice.onclick=function(){try{window.focus()}catch(_){};try{notice.close()}catch(_){}};
      };
    }catch(_){}
  }
  silence();
  window.addEventListener('load',silence,{once:true});
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
