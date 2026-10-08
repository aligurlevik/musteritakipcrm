import worker from './portfolio_company_link_entry.js';

function addPhoneAlarmButton(html){
  if(html.includes('data-phone-alarm-button'))return html;
  const ui=`<style data-phone-alarm-button>#phoneAlarmBtn{position:fixed;right:18px;bottom:18px;z-index:99990;border:0;border-radius:12px;padding:12px 16px;background:#16a34a;color:white;font-weight:900;cursor:pointer;box-shadow:0 8px 24px #0003}#phoneAlarmBox{display:none;position:fixed;inset:0;z-index:99999;background:#0008;align-items:center;justify-content:center}#phoneAlarmBox.open{display:flex}#phoneAlarmCard{width:min(430px,92vw);background:white;border-radius:16px;padding:24px;text-align:center}#phoneAlarmCode{font-size:42px;font-weight:900;letter-spacing:8px;margin:18px 0}</style><button id="phoneAlarmBtn" type="button">📱 Telefon Alarmını Bağla</button><div id="phoneAlarmBox"><div id="phoneAlarmCard"><h2>Telefon Alarmını Bağla</h2><p>Bu 6 haneli kodu telefondaki CRM Alarm uygulamasına girin.</p><div id="phoneAlarmCode">------</div><button class="btn primary" id="phoneAlarmNew" type="button">Yeni Kod</button> <button class="btn" id="phoneAlarmClose" type="button">Kapat</button></div></div><script data-phone-alarm-button>(function(){var box=document.getElementById('phoneAlarmBox'),out=document.getElementById('phoneAlarmCode');async function load(){out.textContent='......';try{var r=await fetch('/api/native-alarm/code',{method:'POST'}),j=await r.json();if(!r.ok)throw new Error(j.error||'Kod alınamadı');out.textContent=j.code||'HATA'}catch(e){out.textContent='HATA';alert('Eşleştirme kodu alınamadı: '+e.message)}}document.getElementById('phoneAlarmBtn').onclick=function(){box.classList.add('open');load()};document.getElementById('phoneAlarmNew').onclick=load;document.getElementById('phoneAlarmClose').onclick=function(){box.classList.remove('open')}})();</script>`;
  return html.replace(/<\/body>/i,ui+'</body>');
}
function rebuild(response,html){var headers=new Headers(response.headers);['content-length','content-encoding','etag'].forEach(function(n){headers.delete(n)});headers.set('cache-control','no-store');return new Response(html,{status:response.status,statusText:response.statusText,headers:headers})}

export default{
  async fetch(request,env,ctx){
    var url=new URL(request.url),path=url.pathname;
    var response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&(path==='/'||path==='/index.html'||path==='/safe-crm'||path==='/safe-crm/')&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      return rebuild(response,addPhoneAlarmButton(await response.text()));
    }
    return response;
  },
  async scheduled(controller,env,ctx){if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx)}
};
