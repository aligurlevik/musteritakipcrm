import worker from './mobile_notification_entry.js';

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

async function patchHtml(response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('id="graphicJobs"')||html.includes('id="graphicDelivery1700Patch"'))return response;

  const patch=`<style id="graphicDelivery1700PatchStyle">
#g_delivery_1700_quick{border:1px solid #2563eb;border-radius:8px;padding:6px 9px;background:#eff6ff;color:#1d4ed8;font-weight:950;cursor:pointer;white-space:nowrap}
#g_delivery_1700_quick:hover{background:#dbeafe}
</style>
<script id="graphicDelivery1700Patch">
(function(){
  function install1700(){
    var input=document.getElementById('g_delivery_time');
    var wrap=document.getElementById('g_delivery_time_wrap');
    if(!input||!wrap)return false;
    if(document.getElementById('g_delivery_1700_quick'))return true;
    var button=document.createElement('button');
    button.type='button';button.id='g_delivery_1700_quick';button.textContent='17:00';button.title='Teslim saatini 17:00 yap';
    button.addEventListener('click',function(){
      input.value='17:00';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      input.focus();
    });
    wrap.appendChild(button);
    return true;
  }
  if(!install1700()){
    var tries=0,timer=setInterval(function(){tries++;if(install1700()||tries>100)clearInterval(timer)},100);
    new MutationObserver(function(){install1700()}).observe(document.documentElement,{childList:true,subtree:true});
  }
})();
</script>`;

  html=html.replace('</body>',patch+'\n</body>');
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
