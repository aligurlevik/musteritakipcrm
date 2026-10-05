(function(){
  'use strict';
  if(window.__crmPortfolioFullscreenStable)return;
  window.__crmPortfolioFullscreenStable='20261005-v1';

  var BODY_CLASS='crm-customer-fullscreen';
  var CLOSE_ID='crmCustomerFullscreenClose';
  var STYLE_ID='crmCustomerFullscreenStableStyle';

  function detail(){return document.getElementById('detail')||document.querySelector('.workspace .detail')}

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    var style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent='body.'+BODY_CLASS+'{overflow:hidden!important}'+
      'body.'+BODY_CLASS+' #detail{position:fixed!important;inset:0!important;top:0!important;left:0!important;right:0!important;bottom:0!important;z-index:2147483000!important;width:100vw!important;height:100vh!important;min-width:100vw!important;max-width:100vw!important;min-height:100vh!important;max-height:100vh!important;margin:0!important;border:0!important;border-radius:0!important;overflow:auto!important;background:#f4f7fb!important;box-shadow:none!important}'+
      'body.'+BODY_CLASS+' #detail .detail-head{position:sticky!important;top:0!important;z-index:50!important;background:#fff!important;padding:15px 20px!important;box-shadow:0 1px 0 #dce5ef!important}'+
      'body.'+BODY_CLASS+' #detail .detail-title{font-size:22px!important}'+
      'body.'+BODY_CLASS+' #detail .tabs{position:sticky!important;top:63px!important;z-index:45!important;background:#fff!important;padding:0 18px!important}'+
      'body.'+BODY_CLASS+' #detail .tab{font-size:12px!important;padding:13px 8px!important}'+
      'body.'+BODY_CLASS+' #detail .detail-body{width:min(1500px,calc(100vw - 44px))!important;max-width:1500px!important;margin:0 auto!important;padding:22px 0 40px!important}'+
      'body.'+BODY_CLASS+' #detail .summary4{gap:12px!important}'+
      'body.'+BODY_CLASS+' #detail .mini-card{min-height:78px!important;padding:12px!important}'+
      'body.'+BODY_CLASS+' #detail .mini-card .m-label{font-size:11px!important}'+
      'body.'+BODY_CLASS+' #detail .mini-card .m-value{font-size:14px!important}'+
      'body.'+BODY_CLASS+' #detail .panel{padding:16px!important}'+
      'body.'+BODY_CLASS+' #detail .panel h3{font-size:15px!important}'+
      'body.'+BODY_CLASS+' #detail .info-row{font-size:13px!important;margin:10px 0!important}'+
      'body.'+BODY_CLASS+' #detail .info-row input,body.'+BODY_CLASS+' #detail .info-row select{height:38px!important;font-size:12px!important}'+
      'body.'+BODY_CLASS+' #detail .notes-panel{margin-top:14px!important}'+
      'body.'+BODY_CLASS+' #detail .note-list{max-height:280px!important}'+
      'body.'+BODY_CLASS+' #detail .history-item{font-size:12px!important;padding:12px 14px!important}'+
      '#'+CLOSE_ID+'{background:#ef4444!important;color:#fff!important;border-color:#ef4444!important;padding:9px 15px!important;font-size:13px!important;font-weight:900!important}'+
      '#rows .company{cursor:pointer!important;text-decoration:underline!important;text-underline-offset:2px!important;color:#1769f6!important}'+
      '@media(max-width:900px){body.'+BODY_CLASS+' #detail .detail-body{width:calc(100vw - 24px)!important}body.'+BODY_CLASS+' #detail .two-col{grid-template-columns:1fr!important}body.'+BODY_CLASS+' #detail .summary4{grid-template-columns:1fr 1fr!important}}';
    document.head.appendChild(style);
  }

  function closeFullscreen(){
    document.body.classList.remove(BODY_CLASS);
    var d=detail();
    if(d){try{d.scrollTop=0}catch(_){}}
  }

  function ensureCloseButton(){
    var d=detail();
    if(!d||document.getElementById(CLOSE_ID))return;
    var actions=d.querySelector('.detail-actions');
    if(!actions)return;
    var btn=document.createElement('button');
    btn.type='button';
    btn.id=CLOSE_ID;
    btn.className='btn small';
    btn.textContent='✕ Kapat';
    btn.title='Müşteri kartını kapat';
    btn.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();closeFullscreen()});
    actions.appendChild(btn);
  }

  function openFullscreen(){
    var d=detail();
    if(!d)return;
    ensureStyle();
    ensureCloseButton();
    document.body.classList.add(BODY_CLASS);
    try{d.scrollTop=0}catch(_){}
  }

  function onClick(event){
    var company=event.target&&event.target.closest?event.target.closest('#rows .company'):null;
    if(!company)return;
    // Satırın mevcut onclick'i müşteri seçimini yapar. Bu dinleyici bubble aşamasında
    // yalnızca aynı sağ kartı tam ekrana büyütür; ikinci kez veri isteği başlatmaz.
    setTimeout(openFullscreen,0);
  }

  function start(){
    ensureStyle();
    document.addEventListener('click',onClick,false);
    document.addEventListener('keydown',function(event){if(event.key==='Escape'&&document.body.classList.contains(BODY_CLASS))closeFullscreen()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
