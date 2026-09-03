import worker from './frontend_patch.js';

const deliveryDateTimePatch = String.raw`
<style>
  #g_entry_date_label{display:none!important}
  #g_delivery_time_wrap{display:none!important}
  #g_delivery_quick_box{
    display:grid;gap:5px;min-width:390px;padding:6px 8px;background:#eff6ff;
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
  .delivery-manual-time{
    display:flex;align-items:center;gap:6px
  }
  #g_delivery_quick_box #g_delivery_time{
    display:block!important;width:105px!important;min-width:105px!important;height:30px!important;
    padding:4px 7px!important;background:#fff!important;border:1px solid #2563eb!important;
    border-radius:7px!important;font-weight:900!important
  }
  #g_delivery_quick_box #g_delivery{
    display:none!important;width:132px!important;height:30px!important;padding:4px 7px!important;
    background:#fff!important;border:1px solid #93c5fd!important;border-radius:7px!important;font-weight:900!important
  }
  #g_delivery_quick_box #g_delivery.custom-open{display:block!important}
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
    const summary=box.querySelector('.delivery-quick-summary');
    if(summary)summary.textContent='TESLİM: '+trDate(value)+(time.value?' • '+time.value:'');
  }

  function mountQuickDelivery(){
    const existing=document.getElementById('g_delivery_quick_box');
    if(existing){syncQuickDelivery();return true}

    const date=document.getElementById('g_delivery');
    const time=document.getElementById('g_delivery_time');
    if(!date||!time)return false;
    const oldLabel=document.getElementById('g_entry_date_label');
    const parent=date.parentNode;if(!parent)return false;

    const box=document.createElement('div');
    box.id='g_delivery_quick_box';
    box.innerHTML='<div class="delivery-quick-line"><b class="delivery-quick-label">GÜN</b><button type="button" class="delivery-quick-btn" data-day-offset="0">Bugün</button><button type="button" class="delivery-quick-btn" data-day-offset="1">Yarın</button><button type="button" class="delivery-quick-btn" data-day-offset="2">+2 Gün</button><button type="button" class="delivery-quick-btn" data-custom-date>Tarih Seç</button><span class="delivery-quick-summary"></span></div><div class="delivery-quick-line"><b class="delivery-quick-label">SAAT</b><span class="delivery-manual-time"><span style="font-size:13px">🕒</span></span></div>';

    parent.insertBefore(box,oldLabel&&oldLabel.parentNode===parent?oldLabel:date);
    box.appendChild(date);
    box.querySelector('.delivery-manual-time').appendChild(time);
    if(oldLabel)oldLabel.style.display='none';

    box.querySelectorAll('[data-day-offset]').forEach(btn=>btn.onclick=()=>{
      date.value=addDays(Number(btn.dataset.dayOffset));
      date.classList.remove('custom-open');
      syncQuickDelivery();
    });
    box.querySelector('[data-custom-date]').onclick=()=>{
      date.classList.add('custom-open');
      date.focus();
      try{date.showPicker&&date.showPicker()}catch{}
    };
    date.addEventListener('change',()=>{date.classList.remove('custom-open');syncQuickDelivery()});
    time.addEventListener('input',syncQuickDelivery);
    time.addEventListener('change',syncQuickDelivery);
    syncQuickDelivery();

    if(!window.__graphicJobsReloadedAfterQuickDelivery){
      window.__graphicJobsReloadedAfterQuickDelivery=true;
      setTimeout(()=>{try{if(typeof loadGraphicJobs==='function')loadGraphicJobs()}catch(e){console.error(e)}},150);
    }
    return true;
  }

  function start(){
    if(mountQuickDelivery())return;
    let tries=0;
    const timer=setInterval(()=>{if(mountQuickDelivery()||++tries>40)clearInterval(timer)},250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;

const saveGraphicJobStart = "async function saveGraphicJob(allowDuplicate=false,selectedStatus=''){const status=selectedStatus||await chooseGraphicJobStatus();";
const saveGraphicJobRequired = "async function saveGraphicJob(allowDuplicate=false,selectedStatus=''){const requiredDeliveryPlace=$('g_delivery_place')?.value||'';const requiredPriceRaw=String($('g_price')?.value||'').trim();const requiredPrice=Number(requiredPriceRaw.replace(',','.'));if(!requiredDeliveryPlace){$('g_delivery_place')?.focus();return showMsg('Teslim yeri seçmeden iş kaydedilemez.','err')}if(!requiredPriceRaw||!(requiredPrice>0)){$('g_price')?.focus();return showMsg('Fiyat girmeden iş kaydedilemez.','err')}const status=selectedStatus||await chooseGraphicJobStatus();";

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      html=html.split(saveGraphicJobStart).join(saveGraphicJobRequired);
      if(!html.includes('id="g_delivery_quick_box"'))html=html.replace('</body>',deliveryDateTimePatch+'\n</body>');
      const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
