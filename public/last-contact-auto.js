(function(){
  'use strict';
  if(window.__crmAutoLastContact)return;
  window.__crmAutoLastContact='20261002-v6';

  var contacts=new Map();
  window.__crmAutoLastContactMap=contacts;

  function clean(v){return String(v==null?'':v).trim()}
  function isoKey(v){
    var s=clean(v);
    if(!s||s==='—')return '';
    var tr=s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if(tr)return tr[3]+'-'+tr[2]+'-'+tr[1];
    var iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(iso)return iso[1]+'-'+iso[2]+'-'+iso[3];
    var d=new Date(s);
    return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }
  function trDate(v){
    var key=isoKey(v);
    if(!key)return '—';
    var p=key.split('-');
    return p[2]+'.'+p[1]+'.'+p[0];
  }
  function newer(a,b){
    var ak=isoKey(a),bk=isoKey(b);
    if(!ak)return b;
    if(!bk)return a;
    return bk>ak?b:a;
  }
  function customerIdFromRow(row){
    var text=row&&row.getAttribute('onclick')||'';
    var m=text.match(/selectCustomer\((\d+)\)/);
    if(m)return String(m[1]);
    var btn=row&&row.querySelector('[onclick*="selectCustomer("]');
    m=btn&&String(btn.getAttribute('onclick')||'').match(/selectCustomer\((\d+)\)/);
    return m?String(m[1]):'';
  }
  function lastContactColumn(){
    var headers=document.querySelectorAll('.table-card thead th');
    for(var i=0;i<headers.length;i++){
      var t=clean(headers[i].textContent).toLocaleLowerCase('tr');
      if(t.indexOf('son görüşme')===0)return i;
    }
    return -1;
  }
  function selectedCustomerId(){
    var row=document.querySelector('#rows tr.selected');
    return customerIdFromRow(row);
  }

  /* Firma adına tıklanınca mevcut sağ müşteri panelini tam ekrana büyüt. */
  function ensureFullscreenStyle(){
    if(document.getElementById('crmPortfolioFullscreenStyle'))return;
    var style=document.createElement('style');
    style.id='crmPortfolioFullscreenStyle';
    style.textContent='body.crm-portfolio-fullscreen{overflow:hidden!important}'+
      'body.crm-portfolio-fullscreen #detail{position:fixed!important;inset:0!important;z-index:160000!important;width:100vw!important;height:100vh!important;min-height:100vh!important;max-height:100vh!important;margin:0!important;border:0!important;border-radius:0!important;overflow:auto!important;background:#fff!important;box-shadow:none!important}'+
      'body.crm-portfolio-fullscreen #detail .detail-head{position:sticky!important;top:0!important;z-index:60!important;background:#fff!important}'+
      'body.crm-portfolio-fullscreen #detail .tabs{position:sticky!important;top:58px!important;z-index:55!important;background:#fff!important}'+
      'body.crm-portfolio-fullscreen #detail .detail-body{padding:18px!important;max-width:1500px!important;margin:0 auto!important;width:100%!important}'+
      '#crmPortfolioFullscreenClose{background:#ef4444!important;color:#fff!important;border-color:#ef4444!important;font-size:16px!important;min-width:42px!important}'+
      '#rows .company{cursor:pointer!important;color:#1769f6!important;text-decoration:underline!important;text-underline-offset:2px!important}';
    document.head.appendChild(style);
  }

  function ensureCloseButton(){
    var actions=document.querySelector('#detail .detail-actions');
    if(!actions||document.getElementById('crmPortfolioFullscreenClose'))return;
    var btn=document.createElement('button');
    btn.type='button';
    btn.id='crmPortfolioFullscreenClose';
    btn.className='btn small';
    btn.textContent='×';
    btn.title='Tam ekranı kapat';
    btn.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();closeFullscreen()});
    actions.appendChild(btn);
  }

  function openFullscreen(){
    ensureFullscreenStyle();
    ensureCloseButton();
    var detail=document.getElementById('detail');
    if(!detail)return;
    document.body.classList.add('crm-portfolio-fullscreen');
    try{detail.scrollTop=0}catch(_){}
  }

  function closeFullscreen(){
    document.body.classList.remove('crm-portfolio-fullscreen');
  }

  function companyCustomerId(company){
    var row=company&&company.closest?company.closest('#rows tr'):null;
    var id=Number(customerIdFromRow(row)||0);
    if(id)return id;
    try{
      var href=company.getAttribute&&company.getAttribute('href');
      if(href){
        var u=new URL(href,location.href);
        id=Number(u.searchParams.get('editCustomer')||0);
      }
    }catch(_){}
    return id||0;
  }

  function handleCompanyClick(event){
    var company=event.target&&event.target.closest?event.target.closest('#rows .company'):null;
    if(!company)return;
    var id=companyCustomerId(company);
    if(!id)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try{
      if(typeof selectCustomer==='function')selectCustomer(id);
      else if(typeof window.selectCustomer==='function')window.selectCustomer(id);
    }catch(error){console.error('Müşteri seçilemedi',error)}
    setTimeout(openFullscreen,0);
  }

  document.addEventListener('click',handleCompanyClick,true);
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&document.body.classList.contains('crm-portfolio-fullscreen'))closeFullscreen()});

  /* İlk açılışta veri isteği yarıda kalırsa yalnızca iki kez güvenli yeniden deneme yap. */
  function retryInitialLoad(){
    try{
      if(typeof customers!=='undefined'&&Array.isArray(customers)&&customers.length===0&&typeof loadAll==='function')loadAll();
    }catch(_){}
  }
  setTimeout(retryInitialLoad,500);
  setTimeout(retryInitialLoad,1600);

  var originalLastMeeting=window.lastMeeting;
  if(typeof originalLastMeeting==='function'){
    window.lastMeeting=function(c){
      var base=originalLastMeeting(c);
      var auto=c&&c.id?contacts.get(String(c.id)):'';
      var baseAt=base&&(base.meeting_date||base.created_at)||'';
      var best=newer(baseAt,auto);
      if(auto&&isoKey(best)===isoKey(auto)&&(!baseAt||isoKey(auto)>isoKey(baseAt))){
        return {customer_id:c.id,meeting_date:isoKey(auto),created_at:auto,source:'auto-contact'};
      }
      return base;
    };
  }

  function patchDates(){
    try{
      var idx=lastContactColumn();
      if(idx>=0){
        document.querySelectorAll('#rows tr').forEach(function(row){
          var id=customerIdFromRow(row),cell=row.children&&row.children[idx];
          if(!cell)return;
          var auto=id?contacts.get(id):'';
          var best=newer(cell.textContent,auto);
          if(isoKey(best))cell.textContent=trDate(best);
        });
      }
      var selectedId=selectedCustomerId();
      var last=document.getElementById('dLastMeeting');
      if(last){
        var bestSelected=newer(last.textContent,selectedId?contacts.get(selectedId):'');
        if(isoKey(bestSelected))last.textContent=trDate(bestSelected);
      }
    }catch(_){}
  }
  function delayedPatch(){
    patchDates();
    setTimeout(patchDates,0);
    setTimeout(patchDates,80);
  }

  var originalRender=window.render;
  if(typeof originalRender==='function'){
    window.render=function(){
      var result=originalRender.apply(this,arguments);
      delayedPatch();
      return result;
    };
  }
  var originalLoadSelected=window.loadSelected;
  if(typeof originalLoadSelected==='function'){
    window.loadSelected=function(){
      var result=originalLoadSelected.apply(this,arguments);
      delayedPatch();
      return result;
    };
  }

  function refreshView(){
    try{if(typeof window.render==='function')window.render()}catch(_){}
    try{if(typeof window.loadSelected==='function')window.loadSelected()}catch(_){}
    delayedPatch();
  }

  async function load(){
    try{
      var r=await fetch('/api/sales-care-contacts',{credentials:'same-origin',cache:'no-store',headers:{'cache-control':'no-cache'}});
      if(!r.ok)return;
      var d=await r.json();
      contacts.clear();
      (d.contacts||[]).forEach(function(x){
        if(x&&x.customer_id&&x.last_contact_at)contacts.set(String(x.customer_id),x.last_contact_at);
      });
      refreshView();
    }catch(_){}
  }

  window.addEventListener('crm-last-contact-updated',function(event){
    var d=event&&event.detail||{};
    if(!d.customer_id||!d.last_contact_at)return;
    contacts.set(String(d.customer_id),d.last_contact_at);
    refreshView();
  });

  document.addEventListener('click',function(){setTimeout(patchDates,100)},true);
  delayedPatch();
  load();
})();
