const iconVersion='20260918-2';

export async function applyCrmBranding(response,request){
  if(request&&request.method!=='GET')return response;
  if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  html=html.replace(/<link\b[^>]*\brel\s*=\s*(?:"(?:shortcut\s+)?icon"|'(?:shortcut\s+)?icon'|"apple-touch-icon"|'apple-touch-icon')[^>]*>/gi,'');
  if(request&&['/','/index.html'].includes(new URL(request.url).pathname))html=html.replace(/<link\b[^>]*\brel\s*=\s*["']manifest["'][^>]*>/gi,'<link rel="manifest" href="/crm.webmanifest">');
  const icons=`<link rel="icon" type="image/png" sizes="192x192" href="/agenda-icon-192.png?v=${iconVersion}">
<link rel="icon" type="image/png" sizes="512x512" href="/agenda-icon-512.png?v=${iconVersion}">
<link rel="apple-touch-icon" sizes="192x192" href="/agenda-icon-192.png?v=${iconVersion}">`;
  const manifest=/<link\b[^>]*\brel\s*=\s*["']manifest["']/i.test(html)?'':'<link rel="manifest" href="/crm.webmanifest">';
  html=html.replace(/<\/head>/i,icons+'\n'+manifest+'\n</head>');
  html=html.replace('<div class="logo">CRM Müşteri Takip</div>','<div class="logo crmBrand"><img src="/notes-logo-ag-v1.webp" width="48" height="48" alt="AG"><span>CRM Müşteri Takip</span></div>');
  if(html.includes('class="logo crmBrand"')&&!html.includes('id="crmBrandStyle"'))html=html.replace(/<\/head>/i,'<style id="crmBrandStyle">.crmBrand{display:flex;align-items:center;gap:10px}.crmBrand img{display:block;width:48px;height:48px;flex:0 0 48px;object-fit:contain}</style>\n</head>');

  // Windows masaüstünde CRM alarmı tamamen sessiz olsun.
  // Görsel popup ve başlık yanıp-sönmesi devam eder; ses ve bildirim sesi kapalıdır.
  if(request&&/Windows/i.test(request.headers.get('user-agent')||'')&&!html.includes('id="crmSilentDesktopAlarm"')){
    const silentDesktop=`<script id="crmSilentDesktopAlarm">
(function(){
  function silence(){
    try{ window.unlockReminderAudio=function(){}; }catch(_){}
    try{ window.playReminderSound=function(){}; }catch(_){}
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

  // Ana CRM ajandasında bağımsız Windows EXE alarmının gerçekten çalışıp
  // çalışmadığını canlı göster. EXE /reminders isteği attıkça sunucu last_seen
  // alanını güncellediği için tarayıcı kapalı alarm yolunu da doğrudan doğrular.
  if(request&&/Windows/i.test(request.headers.get('user-agent')||'')&&['/','/index.html'].includes(new URL(request.url).pathname)&&!html.includes('id="crmWindowsAlarmStatusScript"')){
    const windowsStatus=`<script id="crmWindowsAlarmStatusScript">
(function(){
  var timer=null;
  function paint(button,state,text){
    if(!button)return;
    button.textContent=text;
    button.style.border='1px solid';
    button.style.borderRadius='9px';
    button.style.padding='9px 12px';
    button.style.fontWeight='900';
    button.style.cursor='pointer';
    if(state==='ok'){
      button.style.background='#dcfce7';button.style.color='#166534';button.style.borderColor='#86efac';
    }else if(state==='bad'){
      button.style.background='#fee2e2';button.style.color='#991b1b';button.style.borderColor='#fca5a5';
    }else if(state==='warn'){
      button.style.background='#fef3c7';button.style.color='#92400e';button.style.borderColor='#fcd34d';
    }else{
      button.style.background='#e2e8f0';button.style.color='#475569';button.style.borderColor='#cbd5e1';
    }
  }
  function ensureButton(){
    var agenda=document.getElementById('agenda');
    if(!agenda)return null;
    var button=document.getElementById('crmWindowsAlarmStatus');
    if(button)return button;
    button=document.createElement('button');
    button.type='button';
    button.id='crmWindowsAlarmStatus';
    button.className='btn';
    button.title='Windows alarm kurulumunu aç';
    button.onclick=function(){location.href='/windows-alarm.html'};
    paint(button,'idle','⚪ Windows alarmı kontrol ediliyor');
    var toolbar=agenda.querySelector('.toolbar');
    if(toolbar)toolbar.appendChild(button);else agenda.insertBefore(button,agenda.firstChild);
    return button;
  }
  async function check(){
    var button=ensureButton();
    if(!button)return;
    try{
      var response=await fetch('/api/native-alarm/status',{credentials:'same-origin',cache:'no-store'});
      var data={};try{data=await response.json()}catch(_){}
      if(response.status===401){paint(button,'idle','⚪ Windows alarmı: giriş bekleniyor');button.title='CRM girişinden sonra durum otomatik kontrol edilir.';return}
      if(!response.ok)throw new Error(data.error||'Durum alınamadı');
      if(!data.installed){
        paint(button,'warn','🟠 Windows alarmı kurulu değil');
        button.title='Kurmak için tıklayın.';
      }else if(data.online){
        paint(button,'ok','🟢 Windows alarmı çalışıyor');
        button.title='Arka plan alarmı aktif. Son bağlantı '+(data.ageSeconds==null?'az önce':data.ageSeconds+' sn önce')+'.';
      }else{
        paint(button,'bad','🔴 Windows alarmı çalışmıyor');
        button.title='EXE eşleştirilmiş ama şu an sunucuya bağlanmıyor. Kurulum sayfasını açmak için tıklayın.';
      }
    }catch(_){
      paint(button,'idle','⚪ Windows alarm durumu alınamadı');
      button.title='Bağlantı düzelince otomatik tekrar kontrol edilir.';
    }
  }
  function start(){
    ensureButton();
    check();
    if(timer)clearInterval(timer);
    timer=setInterval(check,10000);
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
