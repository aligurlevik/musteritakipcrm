(function(){
  'use strict';
  if(window.__crmPortfolioFullscreenStable)return;
  window.__crmPortfolioFullscreenStable='20261005-v2-dashboard';

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
      'body.'+BODY_CLASS+' #detail .detail-head{position:sticky!important;top:0!important;z-index:50!important;background:#fff!important;padding:17px 24px!important;box-shadow:0 1px 0 #dce5ef,0 8px 24px rgba(15,23,42,.05)!important}'+
      'body.'+BODY_CLASS+' #detail .detail-title{font-size:24px!important;line-height:1.2!important}'+
      'body.'+BODY_CLASS+' #detail .tabs{display:none!important}'+
      'body.'+BODY_CLASS+' #detail .detail-body{width:min(1560px,calc(100vw - 44px))!important;max-width:1560px!important;margin:0 auto!important;padding:24px 0 46px!important;display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:16px!important;align-items:start!important}'+
      'body.'+BODY_CLASS+' #detail .tabpane{display:block!important;min-width:0!important}'+
      'body.'+BODY_CLASS+' #detail .tabpane.hidden{display:block!important}'+
      'body.'+BODY_CLASS+' #detail #tabGeneral{grid-column:1/-1!important}'+
      'body.'+BODY_CLASS+' #detail #tabNotes{grid-column:span 6!important}'+
      'body.'+BODY_CLASS+' #detail #tabOffers{grid-column:span 6!important}'+
      'body.'+BODY_CLASS+' #detail #tabOrders{grid-column:span 6!important}'+
      'body.'+BODY_CLASS+' #detail #tabAnalysis{grid-column:span 6!important}'+
      'body.'+BODY_CLASS+' #detail #tabGeneral:before,body.'+BODY_CLASS+' #detail #tabNotes:before,body.'+BODY_CLASS+' #detail #tabOffers:before,body.'+BODY_CLASS+' #detail #tabOrders:before,body.'+BODY_CLASS+' #detail #tabAnalysis:before{display:block!important;font-size:14px!important;font-weight:900!important;color:#0f172a!important;margin:0 0 9px 2px!important}'+
      'body.'+BODY_CLASS+' #detail #tabGeneral:before{content:"Müşteri Genel Bilgileri"}'+
      'body.'+BODY_CLASS+' #detail #tabNotes:before{content:"Görüşmeler & Notlar"}'+
      'body.'+BODY_CLASS+' #detail #tabOffers:before{content:"Teklifler"}'+
      'body.'+BODY_CLASS+' #detail #tabOrders:before{content:"Sipariş Durumu"}'+
      'body.'+BODY_CLASS+' #detail #tabAnalysis:before{content:"Müşteri Analizi"}'+
      'body.'+BODY_CLASS+' #detail .summary4{gap:12px!important;margin-bottom:16px!important}'+
      'body.'+BODY_CLASS+' #detail .mini-card{min-height:86px!important;padding:14px!important;border-radius:11px!important;background:#fff!important;box-shadow:0 2px 8px rgba(15,23,42,.04)!important}'+
      'body.'+BODY_CLASS+' #detail .mini-card .m-label{font-size:11px!important}'+
      'body.'+BODY_CLASS+' #detail .mini-card .m-value{font-size:15px!important;margin-top:7px!important}'+
      'body.'+BODY_CLASS+' #detail .two-col{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr)!important;gap:16px!important;margin-bottom:16px!important}'+
      'body.'+BODY_CLASS+' #detail .panel,body.'+BODY_CLASS+' #detail .notes-panel{padding:17px!important;border-radius:12px!important;background:#fff!important;box-shadow:0 2px 10px rgba(15,23,42,.05)!important;border-color:#dce5ef!important}'+
      'body.'+BODY_CLASS+' #detail .notes-panel{padding:0!important;margin-top:16px!important}'+
      'body.'+BODY_CLASS+' #detail .panel h3{font-size:15px!important;margin-bottom:12px!important}'+
      'body.'+BODY_CLASS+' #detail .info-row{font-size:13px!important;margin:11px 0!important;grid-template-columns:28px 1fr!important}'+
      'body.'+BODY_CLASS+' #detail .info-row .ico{font-size:16px!important}'+
      'body.'+BODY_CLASS+' #detail .info-row input,body.'+BODY_CLASS+' #detail .info-row select{height:40px!important;font-size:12px!important;background:#fff!important}'+
      'body.'+BODY_CLASS+' #detail .notes-title{padding:13px 15px!important;font-size:13px!important}'+
      'body.'+BODY_CLASS+' #detail .note-list{max-height:310px!important;padding:11px 14px!important}'+
      'body.'+BODY_CLASS+' #detail .add-note{padding:11px 14px!important}'+
      'body.'+BODY_CLASS+' #detail .follow-grid{grid-template-columns:1fr 120px 1.4fr auto!important;gap:10px!important;padding:16px!important;background:#fff!important;border:1px solid #dce5ef!important;border-radius:12px!important;margin-top:16px!important;box-shadow:0 2px 10px rgba(15,23,42,.04)!important}'+
      'body.'+BODY_CLASS+' #detail .follow-grid input,body.'+BODY_CLASS+' #detail .follow-grid select{height:40px!important;font-size:12px!important}'+
      'body.'+BODY_CLASS+' #detail .savebar{margin-top:14px!important}'+
      'body.'+BODY_CLASS+' #detail .history{gap:9px!important}'+
      'body.'+BODY_CLASS+' #detail .history-item{font-size:12px!important;padding:13px 15px!important;border-radius:9px!important;background:#f8fafc!important}'+
      'body.'+BODY_CLASS+' #detail .analysis-box{font-size:12px!important;line-height:1.7!important;padding:14px!important;min-height:92px!important}'+
      '#'+CLOSE_ID+'{background:#ef4444!important;color:#fff!important;border-color:#ef4444!important;padding:10px 16px!important;font-size:13px!important;font-weight:900!important;border-radius:9px!important}'+
      '#rows .company{cursor:pointer!important;text-decoration:underline!important;text-underline-offset:2px!important;color:#1769f6!important}'+
      '@media(max-width:1100px){body.'+BODY_CLASS+' #detail .detail-body{width:calc(100vw - 28px)!important}body.'+BODY_CLASS+' #detail #tabNotes,body.'+BODY_CLASS+' #detail #tabOffers,body.'+BODY_CLASS+' #detail #tabOrders,body.'+BODY_CLASS+' #detail #tabAnalysis{grid-column:1/-1!important}body.'+BODY_CLASS+' #detail .two-col{grid-template-columns:1fr!important}}'+
      '@media(max-width:760px){body.'+BODY_CLASS+' #detail .detail-head{padding:13px 14px!important}body.'+BODY_CLASS+' #detail .detail-title{font-size:19px!important}body.'+BODY_CLASS+' #detail .detail-body{width:calc(100vw - 18px)!important;padding-top:14px!important}body.'+BODY_CLASS+' #detail .summary4{grid-template-columns:1fr 1fr!important}body.'+BODY_CLASS+' #detail .follow-grid{grid-template-columns:1fr 1fr!important}body.'+BODY_CLASS+' #detail .follow-grid .wide{grid-column:1/-1!important}}';
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
