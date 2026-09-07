(function(){
  function isiOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1}
  function isStandalone(){return window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
  function flash(text){
    let el=document.getElementById('mobileNotifyMsg');
    if(!el){el=document.createElement('div');el.id='mobileNotifyMsg';el.style.cssText='position:fixed;left:12px;right:12px;bottom:18px;z-index:9999;background:#102f4d;color:#fff;padding:12px 14px;border-radius:10px;font-weight:900;text-align:center;box-shadow:0 8px 24px #0005';document.body.appendChild(el)}
    el.textContent=text;el.style.display='block';clearTimeout(window.__notifyMsgTimer);window.__notifyMsgTimer=setTimeout(()=>el.style.display='none',4200)
  }
  function label(btn){
    if(!('Notification' in window)){btn.textContent='🔔 Bildirim';return}
    if(Notification.permission==='granted')btn.textContent='✓ Bildirim Açık';
    else if(Notification.permission==='denied')btn.textContent='🔕 Bildirim Kapalı';
    else btn.textContent='🔔 Bildirimlere İzin Ver';
  }
  async function ask(){
    const btn=document.getElementById('mobileNotifyBtn');
    if(!('Notification' in window)){
      if(isiOS()&&!isStandalone())flash('iPhone’da bildirim için Safari paylaş menüsünden “Ana Ekrana Ekle” yapıp ajandayı ana ekrandan açın.');
      else flash('Bu tarayıcı bildirim iznini desteklemiyor.');
      return;
    }
    if(isiOS()&&!isStandalone()){
      flash('iPhone’da dışarıdayken bildirim alabilmek için önce Safari → Paylaş → Ana Ekrana Ekle yapın, sonra ajandayı ana ekrandan açın.');
      return;
    }
    try{
      const p=await Notification.requestPermission();label(btn);
      if(p==='granted'){
        flash('Bildirim izni açıldı.');
        try{new Notification('Ajanda bildirimleri açık',{body:'Hatırlatmalar için izin verildi.'})}catch(_){ }
      }else if(p==='denied')flash('Bildirim izni kapalı. Telefon ayarlarından tekrar açabilirsiniz.');
      else flash('Bildirim izni henüz verilmedi.');
    }catch(_){flash('Bildirim izni açılamadı.')}
  }
  function init(){
    if(document.getElementById('mobileNotifyBtn'))return;
    const host=document.querySelector('.mobileTopActions')||document.querySelector('.toprow');
    if(!host)return;
    const style=document.createElement('style');style.textContent='#mobileNotifyBtn{border:0;border-radius:10px;padding:9px 8px;background:#fff;color:#123f68;font-size:12px;font-weight:950;white-space:nowrap;box-shadow:0 1px 4px #0002}@media(max-width:430px){#mobileNotifyBtn{padding:8px 6px;font-size:11px}}';document.head.appendChild(style);
    const btn=document.createElement('button');btn.id='mobileNotifyBtn';btn.type='button';btn.onclick=ask;label(btn);
    host.insertBefore(btn,host.firstChild);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  setTimeout(init,250);
})();
