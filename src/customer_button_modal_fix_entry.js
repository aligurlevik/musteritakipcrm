import worker from './portfolio_data_guard_entry.js';

const CUSTOMER_BUTTON_MODAL_FIX=String.raw`
(function(){
  if(window.__crmCustomerButtonModalCompatFix)return;
  window.__crmCustomerButtonModalCompatFix='20261001-customer-button-modal-v1';

  function arm(button){
    if(!button||!button.closest('.detail-actions')||!button.classList.contains('crm-customer-button'))return;
    if(button.querySelector('[data-expand-compat-marker]'))return;
    var marker=document.createElement('span');
    marker.setAttribute('data-expand-compat-marker','1');
    marker.setAttribute('aria-hidden','true');
    marker.style.display='none';
    marker.textContent='Düzenle';
    button.appendChild(marker);
  }

  function apply(){
    document.querySelectorAll('.detail-actions .crm-customer-button').forEach(arm);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){apply();setTimeout(apply,80);setTimeout(apply,350);},{once:true});
  else apply();

  var observer=new MutationObserver(function(){setTimeout(apply,0)});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();
`;

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-customer-button-modal-fix[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-customer-button-modal-fix="20261001-v1">${CUSTOMER_BUTTON_MODAL_FIX}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
