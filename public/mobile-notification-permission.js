(function(){
  const PREF='crm_notifications_enabled';
  const NativeNotification=window.Notification;
  function isiOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1}
  function isStandalone(){return window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
  function enabled(){return localStorage.getItem(PREF)!=='0'}
  function flash(text){
    let el=document.getElementById('mobileNotifyMsg');
    if(!el){el=document.createElement('div');el.id='mobileNotifyMsg';el.style.cssText='position:fixed;left:12px;right:12px;bottom:18px;z-index:9999;background:#102f4d;color:#fff;padding:12px 14px;border-radius:10px;font-weight:900;text-align:center;box-shadow:0 8px 24px #0005';document.body.appendChild(el)}
    el.textContent=text;el.style.display='block';clearTimeout(window.__notifyMsgTimer);window.__notifyMsgTimer=setTimeout(()=>el.style.display='none',4200)
  }
  function ensureStatus(){
    let el=document.getElementById('mobileNotifyStatus');
    if(el)return el;
    el=document.createElement('div');el.id='mobileNotifyStatus';
    el.style.cssText='margin:7px 9px 0;padding:9px 10px;border-radius:9px;text-align:center;font-size:13px;font-weight:950;border:2px solid #b8c9db;background:#eef5fb;color:#173f63';
    const tabs=document.querySelector('.tabs');
    if(tabs)tabs.insertAdjacentElement('afterend',el);else document.querySelector('.top')?.insertAdjacentElement('afterend',el);
    return el;
  }
  function setStatus(text,mode){
    const el=ensureStatus();if(!el)return;el.textContent=text;
    if(mode==='ok'){el.style.background='#dcfce7';el.style.borderColor='#16a34a';el.style.color='#166534'}
    else if(mode==='bad'){el.style.background='#fee2e2';el.style.borderColor='#dc2626';el.style.color='#991b1b'}
    else if(mode==='warn'){el.style.background='#fff4c2';el.style.borderColor='#d6a700';el.style.color='#6c5200'}
    else{el.style.background='#eef5fb';el.style.borderColor='#b8c9db';el.style.color='#173f63'}
  }
  function updateState(btn){
    if(!('Notification' in window)){
      btn.textContent='🔔 Bildirim';
      if(isiOS()&&!isStandalone())setStatus('📱 BİLDİRİM İÇİN: ANA EKRANA EKLE','warn');
      else setStatus('❌ BİLDİRİM DESTEKLENMİYOR','bad');
      return;
    }
    if(isiOS()&&!isStandalone()){
      btn.textContent='📱 Ana Ekrana Ekle';setStatus('📱 BİLDİRİM İÇİN: ANA EKRANA EKLE','warn');return;
    }
    if(Notification.permission==='denied'){
      btn.textContent='❌ Bildirim İzni Kapalı';setStatus('❌ TELEFON BİLDİRİM İZNİ KAPALI','bad');return;
    }
    if(Notification.permission==='granted'){
      if(enabled()){
        btn.textContent='✅ Bildirim Açık';setStatus('✅ BİLDİRİMLER AÇIK — KAPATMAK İÇİN BAS','ok');
      }else{
        btn.textContent='🔕 Bildirim Kapalı';setStatus('🔕 BİLDİRİMLER KAPALI — AÇMAK İÇİN BAS','bad');
      }
      return;
    }
    btn.textContent='🔔 Bildirimi Aç';setStatus('🔔 BİLDİRİM İZNİ BEKLİYOR','info');
  }
  async function toggle(){
    const btn=document.getElementById('mobileNotifyBtn');
    if(!('Notification' in window)){
      updateState(btn);flash(isiOS()&&!isStandalone()?'iPhone’da Safari → Paylaş → Ana Ekrana Ekle yapın.':'Bu tarayıcı bildirimleri desteklemiyor.');return;
    }
    if(isiOS()&&!isStandalone()){
      updateState(btn);flash('Safari → Paylaş → Ana Ekrana Ekle yapın. Sonra ajandayı ana ekrandaki simgeden açın.');return;
    }
    if(Notification.permission==='granted'){
      localStorage.setItem(PREF,enabled()?'0':'1');updateState(btn);flash(enabled()?'✅ Ajanda bildirimleri açıldı.':'🔕 Ajanda bildirimleri kapatıldı.');return;
    }
    if(Notification.permission==='denied'){
      updateState(btn);flash('Telefon bildirim izni kapalı. iPhone Ayarlar bölümünden bu site/uygulama için bildirim iznini açın.');return;
    }
    try{
      const p=await Notification.requestPermission();
      if(p==='granted'){localStorage.setItem(PREF,'1');updateState(btn);flash('✅ Bildirimler açıldı.');try{new NativeNotification('Ajanda bildirimleri açık',{body:'Hatırlatmalar için izin verildi.'})}catch(_){}}
      else{updateState(btn);flash(p==='denied'?'❌ Bildirim izni verilmedi.':'Bildirim izni henüz verilmedi.')}
    }catch(_){updateState(btn);flash('Bildirim izni açılamadı.')}
  }
  function installNotificationGuard(){
    if(!NativeNotification||window.__crmNotificationGuard)return;
    try{
      function GuardedNotification(title,options){
        if(!enabled())return {close:function(){}};
        return new NativeNotification(title,options);
      }
      Object.defineProperty(GuardedNotification,'permission',{get:function(){return NativeNotification.permission}});
      GuardedNotification.requestPermission=function(){return NativeNotification.requestPermission.apply(NativeNotification,arguments)};
      window.Notification=GuardedNotification;window.__crmNotificationGuard=true;
    }catch(_){ }
  }
  function init(){
    installNotificationGuard();
    const host=document.querySelector('.mobileTopActions')||document.querySelector('.toprow');if(!host)return;
    let btn=document.getElementById('mobileNotifyBtn');
    if(!btn){
      const style=document.createElement('style');style.textContent='#mobileNotifyBtn{border:0;border-radius:10px;padding:9px 8px;background:#fff;color:#123f68;font-size:12px;font-weight:950;white-space:nowrap;box-shadow:0 1px 4px #0002}@media(max-width:430px){#mobileNotifyBtn{padding:8px 6px;font-size:11px}}';document.head.appendChild(style);
      btn=document.createElement('button');btn.id='mobileNotifyBtn';btn.type='button';btn.onclick=toggle;host.insertBefore(btn,host.firstChild);
    }
    updateState(btn);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  setTimeout(init,250);window.addEventListener('pageshow',()=>setTimeout(init,50));
})();
