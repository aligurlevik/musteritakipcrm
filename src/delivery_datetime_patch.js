import worker from './frontend_patch.js';

const deliveryDateTimePatch = String.raw`
<style>
  #g_entry_date_label{display:none!important}
  #g_delivery_datetime_box{
    display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:3px 7px;
    background:#eff6ff;border:2px solid #2563eb;border-radius:10px;white-space:nowrap
  }
  #g_delivery_datetime_box .delivery-datetime-title{
    font-size:11px;font-weight:1000;color:#1e3a8a;margin-right:2px
  }
  #g_delivery_datetime_box .delivery-datetime-icon{font-size:13px;line-height:1}
  #g_delivery_datetime_box #g_delivery{
    width:132px!important;min-width:132px!important;height:30px!important;padding:4px 7px!important;
    border:1px solid #93c5fd!important;border-radius:7px!important;background:#fff!important;font-weight:900!important
  }
  #g_delivery_datetime_box #g_delivery_time{
    display:block!important;width:92px!important;min-width:92px!important;height:30px!important;padding:4px 6px!important;
    border:1px solid #93c5fd!important;border-radius:7px!important;background:#fff!important;font-weight:900!important
  }
  #g_delivery_datetime_box .delivery-datetime-sep{width:1px;height:22px;background:#bfdbfe;margin:0 1px}
  @media(max-width:900px){
    #g_delivery_datetime_box{flex-wrap:wrap;white-space:normal}
  }
</style>
<script>
(function(){
  function mountDeliveryDateTime(){
    if(document.getElementById('g_delivery_datetime_box'))return true;
    const date=document.getElementById('g_delivery');
    const time=document.getElementById('g_delivery_time');
    if(!date||!time)return false;

    const oldLabel=document.getElementById('g_entry_date_label');
    const oldTimeWrap=document.getElementById('g_delivery_time_wrap');
    const parent=date.parentNode;
    if(!parent)return false;

    const box=document.createElement('span');
    box.id='g_delivery_datetime_box';
    box.title='Teslim tarihini ve saatini buradan birlikte seçin';
    box.innerHTML='<b class="delivery-datetime-title">TESLİM</b><span class="delivery-datetime-icon">📅</span>';
    parent.insertBefore(box,oldLabel&&oldLabel.parentNode===parent?oldLabel:date);
    box.appendChild(date);
    const sep=document.createElement('span');sep.className='delivery-datetime-sep';box.appendChild(sep);
    const clock=document.createElement('span');clock.className='delivery-datetime-icon';clock.textContent='🕒';box.appendChild(clock);
    box.appendChild(time);

    date.title='Teslim tarihi';
    time.title='Teslim saati';
    if(oldLabel)oldLabel.style.display='none';
    if(oldTimeWrap)oldTimeWrap.remove();
    return true;
  }

  function start(){
    mountDeliveryDateTime();
    const observer=new MutationObserver(()=>mountDeliveryDateTime());
    observer.observe(document.body,{childList:true,subtree:true});
    let tries=0;
    const timer=setInterval(()=>{if(mountDeliveryDateTime()||++tries>40)clearInterval(timer)},250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';

    if (
      request.method === 'GET' &&
      response.status === 200 &&
      (url.pathname === '/' || url.pathname === '/index.html') &&
      contentType.includes('text/html')
    ) {
      let html = await response.text();
      if (!html.includes('id="g_delivery_datetime_box"')) html = html.replace('</body>', deliveryDateTimePatch + '\n</body>');
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }

    return response;
  }
};
