(function(){
  'use strict';
  if(window.__crmPortfolioCustomerJump)return;
  window.__crmPortfolioCustomerJump='20261002-v3';

  /* Firma adına özel click yakalama yapmıyoruz.
     Satırın mevcut onclick="selectCustomer(...)" davranışı çalışsın. */
  var style=document.createElement('style');
  style.id='crmPortfolioCustomerJumpStyle';
  style.textContent='#rows .company{cursor:pointer;color:#1769f6;text-decoration:underline;text-underline-offset:2px}#rows .company:hover{color:#0f4fc4}';
  document.head.appendChild(style);
})();
