(function(){
'use strict';
if(window.__agendaAlarmStatus)return;window.__agendaAlarmStatus=true;
function init(){
 const host=document.getElementById('agendaDays');if(!host)return;
 const box=document.createElement('div');box.id='agendaAlarmConnection';box.style.cssText='display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 12px;margin:6px 0;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font-weight:700';
 const status=document.createElement('span');status.setAttribute('role','status');status.textContent='Alarm bağlantısı kontrol ediliyor…';
 const button=document.createElement('button');button.type='button';button.textContent='Bağlantıyı kontrol et';button.className='btn';
 box.append(status,button);host.parentNode.insertBefore(box,host);
 let busy=false;
 async function check(){
 if(busy)return;busy=true;button.disabled=true;
 try{
 const r=await fetch('/api/native-alarm/status',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('status');
 const d=await r.json();
 status.textContent=d.online?'🟢 Windows alarm bağlantısı aktif':d.installed?'🔴 Windows alarm bağlantısı kesik':'🔴 Windows alarm cihazı bağlı değil';
 status.style.color=d.online?'#166534':'#b91c1c';
 }catch(e){status.textContent='⚪ Alarm bağlantısı doğrulanamadı';status.style.color='#475569';}
 finally{busy=false;button.disabled=false;}
 }
 button.addEventListener('click',check);check();
 setInterval(()=>{if(!document.hidden&&box.getClientRects().length)check()},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&box.getClientRects().length)check()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();