self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let data={};try{data=event.data?.json()||{}}catch{data.body=event.data?.text()||''}
    const message={...data,title:String(data.title||'Ajanda hatırlatması'),body:String(data.body||'Hatırlatma zamanı geldi.')};
    await self.registration.showNotification('⏰ '+message.title,{
      body:message.body,
      tag:message.tag||'agenda-reminder',
      icon:'/agenda-icon-192.png',
      badge:'/notes-logo-ag-v1.png',
      silent:false,
      vibrate:[500,180,500,180,500,180,900],
      requireInteraction:true,
      renotify:true,
      timestamp:Date.now(),
      data:{url:message.url||'/notlar-v2.html'},
      actions:[{action:'open',title:'Ajandayı Aç'}]
    });
    if(message.deviceId&&message.id&&message.remind_at){
      try{
        await fetch('/api/push/received',{
          method:'POST',
          credentials:'same-origin',
          headers:{'content-type':'application/json'},
          body:JSON.stringify({deviceId:message.deviceId,id:message.id,remind_at:message.remind_at})
        });
      }catch(_){}
    }
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows)client.postMessage({type:'CRM_REMINDER',reminder:message});
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const target=new URL(event.notification.data?.url||'/notlar-v2.html',self.location.origin);
    if(target.origin!==self.location.origin)target.href=self.location.origin+'/notlar-v2.html';
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(new URL(client.url).origin!==target.origin)continue;
      if('navigate'in client)await client.navigate(target.href);
      await client.focus();return;
    }
    await self.clients.openWindow(target.href);
  })());
});
