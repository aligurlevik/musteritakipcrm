(function(){
  'use strict';
  if(window.__crmPortfolioFullscreenDetail)return;
  window.__crmPortfolioFullscreenDetail='20261005-v2';

  var marker=null;
  var oldBodyOverflow='';

  function customerIdFromCompany(company){
    var row=company&&company.closest?company.closest('#rows tr'):null;
    if(!row)return 0;
    var raw=String(row.getAttribute('onclick')||'');
    var match=raw.match(/selectCustomer\((\d+)\)/);
    return match?Number(match[1]):0;
  }

  function ensureStyle(){
    if(document.getElementById('crmPortfolioFullscreenDetailStyle'))return;
    var style=document.createElement('style');
    style.id='crmPortfolioFullscreenDetailStyle';
    style.textContent='\n#portfolioFullscreenDetail{position:fixed;inset:0;z-index:150000;background:rgba(15,23,42,.32);display:none;padding:0}\n#portfolioFullscreenDetail.show{display:flex;justify-content:flex-end}\n#portfolioFullscreenDetail .pfd-shell{height:100vh;width:min(72vw,1180px);min-width:720px;background:#fff;border-left:1px solid #dce5ef;box-shadow:-24px 0 70px rgba(15,23,42,.22);display:flex;flex-direction:column;overflow:hidden}\n#portfolioFullscreenDetail .pfd-top{height:56px;flex:0 0 56px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;border-bottom:1px solid #dce5ef;background:#fff}\n#portfolioFullscreenDetail .pfd-title{font-size:17px;font-weight:900;color:#0f172a}\n#portfolioFullscreenDetail .pfd-close{border:0;border-radius:9px;background:#eef2f7;color:#0f172a;font-size:24px;width:40px;height:40px;cursor:pointer;line-height:1}\n#portfolioFullscreenDetail .pfd-body{flex:1;min-height:0;overflow:auto;padding:12px;background:#f4f7fb}\n#portfolioFullscreenDetail .detail{position:static!important;top:auto!important;width:100%!important;min-height:100%!important;max-height:none!important;overflow:visible!important;border-radius:10px!important;box-shadow:none!important}\n#portfolioFullscreenDetail .detail-body{padding:16px!important}\n#portfolioFullscreenDetail .tabs{position:sticky;top:0;z-index:20;background:#fff}\n#rows .company{cursor:pointer;text-decoration:underline;text-underline-offset:2px;color:#1769f6}\n#rows .company:hover{color:#0f4fc4}\n@media(max-width:1050px){#portfolioFullscreenDetail .pfd-shell{width:92vw;min-width:0}}\n@media(max-width:760px){#portfolioFullscreenDetail .pfd-shell{width:100vw;min-width:0}.pfd-title{font-size:14px!important}}';
    document.head.appendChild(style);
  }

  function ensureModal(){
    var modal=document.getElementById('portfolioFullscreenDetail');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='portfolioFullscreenDetail';
    modal.innerHTML='<div class="pfd-shell"><div class="pfd-top"><div class="pfd-title">Müşteri Kartı — Geniş Görünüm</div><button type="button" class="pfd-close" aria-label="Kapat">×</button></div><div class="pfd-body"><div id="portfolioFullscreenMount"></div></div></div>';
    modal.querySelector('.pfd-close').addEventListener('click',closePanel);
    modal.addEventListener('click',function(event){if(event.target===modal)closePanel();});
    document.body.appendChild(modal);
    return modal;
  }

  function openPanel(){
    var detail=document.querySelector('.workspace > .detail')||document.querySelector('#portfolioFullscreenDetail .detail');
    if(!detail)return;
    ensureStyle();
    var modal=ensureModal();
    if(!marker&&detail.parentNode){
      marker=document.createComment('portfolio-detail-home');
      detail.parentNode.insertBefore(marker,detail);
    }
    var mount=document.getElementById('portfolioFullscreenMount');
    if(mount&&detail.parentNode!==mount)mount.appendChild(detail);
    oldBodyOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    modal.classList.add('show');
    try{detail.scrollTop=0}catch(_){ }
  }

  function closePanel(){
    var modal=document.getElementById('portfolioFullscreenDetail');
    var detail=modal&&modal.querySelector('.detail');
    if(detail&&marker&&marker.parentNode){
      marker.parentNode.insertBefore(detail,marker);
      marker.remove();
      marker=null;
    }
    if(modal)modal.classList.remove('show');
    document.body.style.overflow=oldBodyOverflow;
  }

  function onCompanyClick(event){
    var company=event.target&&event.target.closest?event.target.closest('#rows .company'):null;
    if(!company)return;
    var id=customerIdFromCompany(company);
    if(!id)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try{
      if(typeof window.selectCustomer==='function'){
        Promise.resolve(window.selectCustomer(id)).then(openPanel).catch(function(error){console.error('Müşteri seçilemedi',error);});
      }else{
        openPanel();
      }
    }catch(error){
      console.error('Müşteri seçilemedi',error);
    }
  }

  function onKey(event){
    if(event.key==='Escape'&&document.getElementById('portfolioFullscreenDetail')?.classList.contains('show'))closePanel();
  }

  function start(){
    ensureStyle();
    ensureModal();
    document.addEventListener('click',onCompanyClick,true);
    document.addEventListener('keydown',onKey);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
