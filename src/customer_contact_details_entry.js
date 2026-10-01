import worker from './customer_followup_entry.js';

const CONTACT_DETAILS_PATCH=String.raw`
(function(){
  if(window.__crmContactDetailsPatch)return;
  window.__crmContactDetailsPatch='20261001-contact-v1';

  var style=document.createElement('style');
  style.id='crmContactDetailsStyle';
  style.textContent='\n#portfolioDetailExpandModal .pie-hidden-contact-editor{display:block!important;margin-top:10px!important;padding:10px!important;border:1px solid #dbe5f0!important;border-radius:10px!important;background:#f8fafc!important}\n#portfolioDetailExpandModal .crm-contact-title{font-size:13px;font-weight:950;color:#b91c1c;margin-bottom:8px}\n#portfolioDetailExpandModal .pie-contact-toggle{display:none!important}\n#portfolioDetailExpandModal .pie-contact-panel{display:block!important;margin-top:0!important;border:0!important;background:transparent!important;padding:0!important}\n#portfolioDetailExpandModal .pie-contact-head{font-size:10px!important;color:#64748b!important}\n#portfolioDetailExpandModal .pie-contact-row input{background:#fff!important}\n@media(max-width:900px){#portfolioDetailExpandModal .pie-contacts{overflow-x:auto!important}}';
  document.head.appendChild(style);

  function showContactDetails(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');
    if(!editor)return;
    var toggle=editor.querySelector('.pie-contact-toggle');
    var holder=toggle&&toggle.closest('.pie-field');
    var panel=holder&&holder.querySelector('.pie-contact-panel');
    if(!holder||!panel)return;

    holder.classList.remove('pie-hidden-contact-editor');
    holder.style.display='block';
    panel.hidden=false;
    panel.removeAttribute('hidden');
    panel.style.display='block';
    toggle.setAttribute('aria-expanded','true');

    if(!holder.querySelector('.crm-contact-title')){
      var title=document.createElement('div');
      title.className='crm-contact-title';
      title.textContent='👥 Yetkili Kişiler — İsim, Görev, Telefon ve E-posta';
      holder.insertBefore(title,panel);
    }
  }

  var observer=new MutationObserver(function(){setTimeout(showContactDetails,0)});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  document.addEventListener('click',function(){setTimeout(showContactDetails,30)},true);
  setInterval(showContactDetails,700);
  showContactDetails();
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
      html=html.replace(/<script[^>]*data-contact-details-patch[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-contact-details-patch="20261001-contact-v1">${CONTACT_DETAILS_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
