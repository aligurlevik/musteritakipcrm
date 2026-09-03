import worker from './frontend_patch.js';

const deliveryDateTimePatch = String.raw`
<style>
  #g_entry_date_label{display:none!important}
  #g_delivery_time_wrap{display:none!important}
  #g_delivery_quick_box{
    display:grid;gap:5px;min-width:430px;padding:6px 8px;background:#eff6ff;
    border:2px solid #2563eb;border-radius:10px
  }
  .delivery-quick-line{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
  .delivery-quick-label{width:52px;font-size:11px;font-weight:1000;color:#1e3a8a;white-space:nowrap}
  .delivery-quick-btn{
    height:30px;border:1px solid #bfdbfe;border-radius:7px;background:#fff;color:#1e3a8a;
    padding:0 9px;font-size:11px;font-weight:900;cursor:pointer
  }
  .delivery-quick-btn:hover{background:#dbeafe}
  .delivery-quick-btn.active{background:#2563eb;color:#fff;border-color:#2563eb}
  .delivery-quick-summary{
    margin-left:auto;padding:4px 8px;border-radius:7px;background:#dbeafe;color:#1e3a8a;
    font-size:11px;font-weight:1000;white-space:nowrap
  }
  .delivery-custom-fields{display:none;align-items:center;gap:6px;flex-wrap:wrap;padding-left:57px}
  .delivery-custom-fields.open{display:flex}
  #g_delivery_quick_box #g_delivery,#g_delivery_quick_box #g_delivery_time{
    display:block!important;height:30px!important;padding:4px 7px!important;background:#fff!important;
    border:1px solid #93c5fd!important;border-radius:7px!important;font-weight:900!important
  }
  #g_delivery_quick_box #g_delivery{width:132px!important}
  #g_delivery_quick_box #g_delivery_time{width:92px!important}
  @media(max-width:950px){
    #g_delivery_quick_box{min-width:0;width:100%}
    .delivery-quick-summary{width:100%;margin-left:57px}
  }
</style>
<script>
(function(){
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const addDays=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return dateKey(d)};
  const trDate=key=>{if(!key)return 'Tarih yok';const p=String(key).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:key};

  function syncQuickDelivery(){
    const box=document.getElementById('g_delivery_quick_box');
    const date=document.getElementById('g_delivery');
    const time=document.getElementById('g_delivery_time');
    if(!box||!date||!time)return;
    const value=date.value||'';
    box.querySelectorAll('[data-day-offset]').forEach(btn=>btn.classList.toggle('active',value===addDays(Number(btn.dataset.dayOffset))));
    box.querySelectorAll('[data-quick-time]').forEach(btn=>btn.classList.toggle('active',time.value===btn.dataset.quickTime));
    const summary=box.querySelector('.delivery-quick-summary');
    if(summary)summary.textContent='TESLİM: '+trDate(value)+(time.value?' • '+time.value:'');
  }

  function showCustomFields(focusTarget){
    const box=document.getElementById('g_delivery_quick_box');if(!box)return;
    const custom=box.querySelector('.delivery-custom-fields');if(custom)custom.classList.add('open');
    const target=document.getElementById(focusTarget);if(target){target.focus();try{target.showPicker&&target.showPicker()}catch{}}
  }

  function mountQuickDelivery(){
    if(document.getElementById('g_delivery_quick_box')){syncQuickDelivery();return true}
    const date=document.getElementById('g_delivery');
    const time=document.getElementById('g_delivery_time');
    if(!date||!time)return false;
    const oldLabel=document.getElementById('g_entry_date_label');
    const oldTimeWrap=document.getElementById('g_delivery_time_wrap');
    const parent=date.parentNode;if(!parent)return false;

    const box=document.createElement('div');
    box.id='g_delivery_quick_box';
    box.innerHTML='<div class="delivery-quick-line"><b class="delivery-quick-label">GÜN</b><button type="button" class="delivery-quick-btn" data-day-offset="0">Bugün</button><button type="button" class="delivery-quick-btn" data-day-offset="1">Yarın</button><button type="button" class="delivery-quick-btn" data-day-offset="2">+2 Gün</button><button type="button" class="delivery-quick-btn" data-custom-date>Tarih Seç</button><span class="delivery-quick-summary"></span></div><div class="delivery-quick-line"><b class="delivery-quick-label">SAAT</b><button type="button" class="delivery-quick-btn" data-quick-time="10:00">10:00</button><button type="button" class="delivery-quick-btn" data-quick-time="12:00">12:00</button><button type="button" class="delivery-quick-btn" data-quick-time="13:00">13:00</button><button type="button" class="delivery-quick-btn" data-quick-time="15:00">15:00</button><button type="button" class="delivery-quick-btn" data-quick-time="16:00">16:00</button><button type="button" class="delivery-quick-btn" data-quick-time="17:00">17:00</button><button type="button" class="delivery-quick-btn" data-other-time>Diğer</button></div><div class="delivery-custom-fields"><span style="font-size:11px;font-weight:900;color:#64748b">Özel:</span></div>';

    parent.insertBefore(box,oldLabel&&oldLabel.parentNode===parent?oldLabel:date);
    const custom=box.querySelector('.delivery-custom-fields');
    custom.appendChild(date);
    if(oldTimeWrap&&oldTimeWrap.contains(time))custom.appendChild(time);else custom.appendChild(time);
    if(oldLabel)oldLabel.style.display='none';
    if(oldTimeWrap&&oldTimeWrap.parentNode)oldTimeWrap.remove();

    box.querySelectorAll('[data-day-offset]').forEach(btn=>btn.onclick=()=>{date.value=addDays(Number(btn.dataset.dayOffset));custom.classList.remove('open');syncQuickDelivery()});
    box.querySelectorAll('[data-quick-time]').forEach(btn=>btn.onclick=()=>{time.value=btn.dataset.quickTime;syncQuickDelivery()});
    box.querySelector('[data-custom-date]').onclick=()=>showCustomFields('g_delivery');
    box.querySelector('[data-other-time]').onclick=()=>showCustomFields('g_delivery_time');
    date.addEventListener('change',syncQuickDelivery);
    time.addEventListener('change',syncQuickDelivery);
    syncQuickDelivery();
    return true;
  }

  function start(){
    mountQuickDelivery();
    const observer=new MutationObserver(()=>mountQuickDelivery());
    observer.observe(document.body,{childList:true,subtree:true});
    let tries=0;const timer=setInterval(()=>{if(mountQuickDelivery()||++tries>40)clearInterval(timer)},250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('id="g_delivery_quick_box"'))html=html.replace('</body>',deliveryDateTimePatch+'\n</body>');
      const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
