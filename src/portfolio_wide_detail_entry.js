import worker from './sales_care_bridge_entry.js';

const PORTFOLIO_WIDE_DETAIL_PATCH=String.raw`
(function(){
  'use strict';
  if(window.__crmPortfolioWideDetailV2)return;
  window.__crmPortfolioWideDetailV2='20261005-v2';

  var marker=null;
  var oldBodyOverflow='';

  function ensureStyle(){
    if(document.getElementById('crmPortfolioWideDetailStyleV2'))return;
    var style=document.createElement('style');
    style.id='crmPortfolioWideDetailStyleV2';
    style.textContent='\n#portfolioWideDetailV2{position:fixed;inset:0;z-index:250000;background:rgba(15,23,42,.48);display:none;justify-content:flex-end;align-items:stretch}\n#portfolioWideDetailV2.show{display:flex}\n#portfolioWideDetailV2 .pwd-shell{width:min(72vw,1180px);height:100vh;background:#f4f7fb;box-shadow:-24px 0 70px rgba(15,23,42,.28);display:flex;flex-direction:column;overflow:hidden}\n#portfolioWideDetailV2 .pwd-head{height:58px;flex:0 0 58px;background:#fff;border-bottom:1px solid #dce5ef;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px}\n#portfolioWideDetailV2 .pwd-title{font-size:18px;font-weight:950;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#portfolioWideDetailV2 .pwd-close{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:9px;padding:8px 12px;font-size:13px;font-weight:950;cursor:pointer}\n#portfolioWideDetailV2 .pwd-close:hover{background:#f1f5f9}\n#portfolioWideDetailV2 .pwd-body{flex:1;min-height:0;overflow:auto;padding:12px}\n#portfolioWideDetailMountV2{min-height:100%}\n#portfolioWideDetailV2 .detail{position:static!important;top:auto!important;width:100%!important;min-height:100%!important;max-height:none!important;overflow:visible!important;border-radius:12px!important;box-shadow:0 8px 28px rgba(15,23,42,.08)!important}\n#portfolioWideDetailV2 .detail-body{padding:16px!important}\n#portfolioWideDetailV2 .summary4{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}\n#portfolioWideDetailV2 .two-col{grid-template-columns:1fr 1fr!important;gap:12px!important}\n#portfolioWideDetailV2 .tabs{position:sticky;top:0;z-index:25;background:#fff}\n#rows .company{cursor:pointer!important;text-decoration:underline!important;text-underline-offset:2px!important;color:#1769f6!important}\n#rows .company:hover{color:#0f4fc4!important}\n@media(max-width:1180px){#portfolioWideDetailV2 .pwd-shell{width:82vw}}\n@media(max-width:820px){#portfolioWideDetailV2 .pwd-shell{width:100vw}#portfolioWideDetailV2 .pwd-body{padding:6px}#portfolioWideDetailV2 .summary4{grid-template-columns:1fr 1fr!important}#portfolioWideDetailV2 .two-col{grid-template-columns:1fr!important}}';
    document.head.appendChild(style);
  }

  function ensurePanel(){
    var panel=document.getElementById('portfolioWideDetailV2');
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='portfolioWideDetailV2';
    panel.innerHTML='<div class="pwd-shell" role="dialog" aria-modal="true"><div class="pwd-head"><div class="pwd-title" id="portfolioWideTitleV2">Müşteri Kartı</div><button type="button" class="pwd-close">✕ Kapat</button></div><div class="pwd-body"><div id="portfolioWideDetailMountV2"></div></div></div>';
    panel.querySelector('.pwd-close').addEventListener('click',closePanel);
    panel.addEventListener('click',function(event){if(event.target===panel)closePanel()});
    document.body.appendChild(panel);
    return panel;
  }

  function customerId(company){
    var row=company&&company.closest?company.closest('#rows tr'):null;
    if(row){
      var raw=String(row.getAttribute('onclick')||'');
      var match=raw.match(/selectCustomer\((\d+)\)/);
      if(match)return Number(match[1]);
    }
    try{
      var href=company&&company.getAttribute?company.getAttribute('href')||'':'';
      var parsed=new URL(href,location.href);
      return Number(parsed.searchParams.get('editCustomer')||0);
    }catch(_){return 0}
  }

  function openPanel(companyText){
    ensureStyle();
    var panel=ensurePanel();
    var detail=document.querySelector('.workspace > #detail, .workspace > .detail')||document.querySelector('#portfolioWideDetailV2 .detail');
    if(!detail)return;
    if(!marker&&detail.parentNode){
      marker=document.createComment('portfolio-wide-detail-home-v2');
      detail.parentNode.insertBefore(marker,detail);
    }
    var mount=document.getElementById('portfolioWideDetailMountV2');
    if(mount&&detail.parentNode!==mount)mount.appendChild(detail);
    var title=document.getElementById('portfolioWideTitleV2');
    if(title)title.textContent='Müşteri Kartı — '+String(companyText||'Müşteri');
    oldBodyOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    panel.classList.add('show');
    var body=panel.querySelector('.pwd-body');
    if(body)body.scrollTop=0;
  }

  function closePanel(){
    var panel=document.getElementById('portfolioWideDetailV2');
    var detail=panel&&panel.querySelector('.detail');
    if(detail&&marker&&marker.parentNode){
      marker.parentNode.insertBefore(detail,marker);
      marker.remove();
      marker=null;
    }
    if(panel)panel.classList.remove('show');
    document.body.style.overflow=oldBodyOverflow;
  }

  function onCompanyClick(event){
    var company=event.target&&event.target.closest?event.target.closest('#rows .company'):null;
    if(!company)return;
    var id=customerId(company);
    if(!id)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    var text=(company.textContent||'').trim();
    try{
      var result=typeof window.selectCustomer==='function'?window.selectCustomer(id):null;
      Promise.resolve(result).catch(function(error){console.error('Müşteri seçilemedi',error)}).finally(function(){openPanel(text)});
    }catch(error){
      console.error('Müşteri seçilemedi',error);
      openPanel(text);
    }
  }

  function onKey(event){if(event.key==='Escape'&&document.getElementById('portfolioWideDetailV2')?.classList.contains('show'))closePanel()}

  function start(){
    ensureStyle();
    ensurePanel();
    document.addEventListener('click',onCompanyClick,true);
    document.addEventListener('keydown',onKey);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
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
      html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-detail\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
      html=html.replace(/<script[^>]*data-portfolio-wide-detail[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-portfolio-wide-detail="20261005-v2">${PORTFOLIO_WIDE_DETAIL_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
