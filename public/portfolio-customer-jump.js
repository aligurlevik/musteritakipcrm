(function(){
  'use strict';
  if(window.__crmPortfolioCustomerJump)return;
  window.__crmPortfolioCustomerJump='20261002-v1';

  function customerIdFromRow(row){
    var raw=String(row&&row.getAttribute('onclick')||'');
    var m=raw.match(/selectCustomer\((\d+)\)/);
    return m?Number(m[1]):0;
  }

  document.addEventListener('click',function(event){
    var name=event.target&&event.target.closest?event.target.closest('#rows .company'):null;
    if(!name)return;
    var row=name.closest('tr'),id=customerIdFromRow(row);
    if(!id)return;
    event.preventDefault();
    event.stopPropagation();
    location.href='/?page=customers&editCustomer='+encodeURIComponent(id);
  },true);

  var style=document.createElement('style');
  style.textContent='#rows .company{cursor:pointer;color:#1769f6;text-decoration:underline;text-underline-offset:2px}#rows .company:hover{color:#0f4fc4}';
  document.head.appendChild(style);
})();
