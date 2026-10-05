(function(){
  'use strict';
  if(window.__crmPortfolioCompanyOpenV2)return;
  window.__crmPortfolioCompanyOpenV2='20261005-window-capture-v2';

  function idFromCompany(company){
    if(!company)return 0;

    var href=String(company.getAttribute&&company.getAttribute('href')||'');
    var m=href.match(/[?&](?:id|editCustomer)=(\d+)/);
    if(m)return Number(m[1]);

    var row=company.closest?company.closest('#rows tr'):null;
    if(row){
      var raw=String(row.getAttribute('onclick')||'');
      m=raw.match(/selectCustomer\((\d+)\)/);
      if(m)return Number(m[1]);

      var btn=row.querySelector('[onclick*="selectCustomer("]');
      raw=String(btn&&btn.getAttribute('onclick')||'');
      m=raw.match(/selectCustomer\((\d+)\)/);
      if(m)return Number(m[1]);

      try{
        var rows=Array.prototype.slice.call(document.querySelectorAll('#rows tr'));
        var index=rows.indexOf(row);
        if(index>=0&&typeof visibleRows!=='undefined'&&Array.isArray(visibleRows)&&visibleRows[index]&&visibleRows[index].id){
          return Number(visibleRows[index].id)||0;
        }
      }catch(_){ }
    }
    return 0;
  }

  function openCompany(event){
    var target=event&&event.target;
    var company=target&&target.closest?target.closest('#rows .company'):null;
    if(!company)return;

    var id=idFromCompany(company);
    if(!id)return;

    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign('/musteri-detay.html?id='+encodeURIComponent(id));
  }

  // Window capture runs before document/row click handlers, so old portfolio
  // listeners cannot turn a company-name click back into a whole-row selection.
  window.addEventListener('click',openCompany,true);
})();
