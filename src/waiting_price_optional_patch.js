import worker from './graphic_delivery_1700_patch.js';

const forcedPriceValidation = "async function saveGraphicJob(allowDuplicate=false,selectedStatus=''){const requiredDeliveryPlace=$('g_delivery_place')?.value||'';const requiredPriceRaw=String($('g_price')?.value||'').trim();const requiredPrice=Number(requiredPriceRaw.replace(',','.'));if(!requiredDeliveryPlace){$('g_delivery_place')?.focus();return showMsg('Teslim yeri seçmeden iş kaydedilemez.','err')}if(!requiredPriceRaw||!(requiredPrice>0)){$('g_price')?.focus();return showMsg('Fiyat girmeden iş kaydedilemez.','err')}const status=selectedStatus||await chooseGraphicJobStatus();";

const statusAwarePriceValidation = "async function saveGraphicJob(allowDuplicate=false,selectedStatus=''){const requiredDeliveryPlace=$('g_delivery_place')?.value||'';if(!requiredDeliveryPlace){$('g_delivery_place')?.focus();return showMsg('Teslim yeri seçmeden iş kaydedilemez.','err')}const status=selectedStatus||await chooseGraphicJobStatus();if(!status)return;const requiredPriceRaw=String($('g_price')?.value||'').trim();const requiredPrice=Number(requiredPriceRaw.replace(',','.'));const statusKey=String(status||'').toLocaleLowerCase('tr-TR');const priceRequired=statusKey.includes('imalat')||statusKey.includes('üretim');if(priceRequired&&(!requiredPriceRaw||!(requiredPrice>0))){$('g_price')?.focus();return showMsg('İmalat işi için fiyat girmelisiniz.','err')}";

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

export default {
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    const type=response.headers.get('content-type')||'';
    if(request.method!=='GET'||!shouldPatch(url.pathname)||!response.ok||!type.includes('text/html'))return response;

    let html=await response.text();
    html=html.split(forcedPriceValidation).join(statusAwarePriceValidation);

    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-cache, no-store, must-revalidate');
    headers.set('pragma','no-cache');headers.set('expires','0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
