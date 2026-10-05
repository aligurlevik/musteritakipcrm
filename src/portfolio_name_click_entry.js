import worker from './portfolio_api_recovery_entry.js';

const PORTFOLIO_NAME_CLICK_PATCH=String.raw`
(function(){
  'use strict';
  if(window.__crmPortfolioNameClickFix)return;
  window.__crmPortfolioNameClickFix='20261005-v1';

  function customerIdFromCompany(company){
    var row=company&&company.closest?company.closest('#rows tr'):null;
    if(row){
      var raw=String(row.getAttribute('onclick')||'');
      var match=raw.match(/selectCustomer\((\d+)\)/);
      if(match)return Number(match[1]);
    }
    try{
      var href=company&&company.getAttribute?company.getAttribute('href')||'':'';
      if(href){
        var u=new URL(href,location.href);
        var id=Number(u.searchParams.get('editCustomer')||0);
        if(id)return id;
      }
    }catch(_){}
    return 0;
  }

  async function selectFromName(event){
    var company=event.target&&event.target.closest?event.target.closest('#rows .company'):null;
    if(!company)return;
    var id=customerIdFromCompany(company);
    if(!id)return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    try{
      var fn=(typeof window.selectCustomer==='function')?window.selectCustomer:null;
      if(!fn&&typeof selectCustomer==='function')fn=selectCustomer;
      if(!fn)return;
      await fn(id);
      var detail=document.getElementById('detail');
      if(detail){
        try{detail.scrollTop=0}catch(_){}
        detail.classList.add('crm-name-click-updated');
        setTimeout(function(){detail.classList.remove('crm-name-click-updated')},220);
      }
    }catch(error){
      console.error('Müşteri seçimi başarısız',error);
    }
  }

  var style=document.createElement('style');
  style.textContent='#rows .company{cursor:pointer!important;color:#1769f6!important;text-decoration:underline!important;text-underline-offset:2px!important}#detail.crm-name-click-updated{outline:2px solid rgba(23,105,246,.22);outline-offset:-2px}';
  document.head.appendChild(style);
  document.addEventListener('click',selectFromName,true);
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
      html=html.replace(/<script[^>]*data-portfolio-name-click[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-portfolio-name-click="20261005-v1">${PORTFOLIO_NAME_CLICK_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
