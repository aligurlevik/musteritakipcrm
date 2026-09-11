import worker from './mobile_notification_entry.js';

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

async function patchHtml(response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  const needsPatch=html.includes('id="graphicJobs"')&&!html.includes('id="graphicDesktopQuickFixes"');

  const patch=`<style id="graphicDesktopQuickFixesStyle">
#g_delivery_quick_box #g_delivery_1700_quick{display:inline-flex!important;align-items:center;justify-content:center;height:26px!important;min-height:26px!important;margin-left:4px;border:1px solid #93c5fd;border-radius:7px;padding:0 8px;background:#fff;color:#1d4ed8;font-weight:950;font-size:10px;cursor:pointer;white-space:nowrap;position:relative;z-index:5}
#g_delivery_quick_box #g_delivery_1700_quick:hover{background:#dbeafe}
</style>
<script id="graphicDesktopQuickFixes">
(function(){
  function install1700(){
    var input=document.getElementById('g_delivery_time');
    var box=document.getElementById('g_delivery_quick_box');
    if(!input||!box)return false;
    var target=box.querySelector('.delivery-manual-time')||box.querySelectorAll('.delivery-quick-line')[1];
    if(!target)return false;
    var button=document.getElementById('g_delivery_1700_quick');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.id='g_delivery_1700_quick';
      button.className='delivery-quick-btn';
      button.textContent='17:00';
      button.title='Teslim saatini 17:00 yap';
      button.addEventListener('click',function(){
        input.value='17:00';
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.dispatchEvent(new Event('change',{bubbles:true}));
        input.focus();
      });
    }
    if(button.parentElement!==target){
      target.appendChild(button);
    }else if(button.previousElementSibling!==input){
      input.insertAdjacentElement('afterend',button);
    }
    return true;
  }

  function installPriceEdit(){
    if(typeof editableGraphicJobsForDay!=='function'||typeof updateGraphicJobPrice!=='function')return false;
    if(window.__priceEditAlwaysActive)return true;
    window.__priceEditAlwaysActive=true;
    window.enableGraphicPriceEditing=function(){
      var jobs=editableGraphicJobsForDay();
      document.querySelectorAll('#graphicJobRows .graphic-price').forEach(function(price,index){
        var job=jobs[index];if(!job||price.querySelector('input'))return;
        var currentPrice=Number(job.price||0);
        var input=document.createElement('input');
        input.type='number';input.min='0';input.step='0.01';
        input.value=currentPrice||'';input.placeholder='Fiyat ₺';
        input.title='Fiyatı düzenleyin';
        input.style.cssText='width:66px;padding:6px 5px;font-weight:900;color:#047857;background:#fff;border:1px solid #86efac';
        input.addEventListener('keydown',function(event){if(event.key==='Enter')input.blur()});
        input.addEventListener('change',function(){updateGraphicJobPrice(job.id,input.value)});
        var wrap=document.createElement('span'),tl=document.createElement('b');
        wrap.style.cssText='display:inline-flex;align-items:center;gap:4px;white-space:nowrap';
        tl.textContent='TL';tl.style.color='#047857';wrap.append(input,tl);price.replaceWith(wrap);
      });
    };
    try{if(document.getElementById('graphicJobs')?.classList.contains('active')&&typeof renderGraphicJobs==='function')renderGraphicJobs()}catch(e){console.error('Fiyat düzenleme görünümü yenilenemedi:',e)}
    return true;
  }

  var tries=0;
  var timer=setInterval(function(){
    tries++;
    var a=install1700(),b=installPriceEdit();
    if((a&&b)||tries>150)clearInterval(timer);
  },100);
  new MutationObserver(function(){install1700()}).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;

  if(needsPatch)html=html.replace('</body>',patch+'\n</body>');
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  headers.set('pragma','no-cache');headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&shouldPatch(url.pathname))return patchHtml(response);
    return response;
  }
};
