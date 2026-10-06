import test from 'node:test';
import assert from 'node:assert/strict';
import {patchPortfolioHtml} from '../src/portfolio_company_link_entry.js';

test('firma adına tıklama eski listener katmanlarını kullanmadan tek müşteri kartını tam ekran açar',()=>{
  const input=`<!doctype html><html><head></head><body>
  <table><tbody id="rows"><tr onclick="selectCustomer(42)"><td><span class="company">${esc(c.company)}</span></td></tr></tbody></table>
  <aside id="detail"><div class="detail-actions"><button>Düzenle</button></div></aside>
  <script data-last-contact-auto="x" src="/last-contact-auto.js?v=1"></script>
  <script data-portfolio-fullscreen-stable="x" src="/portfolio-fullscreen-stable.js?v=1"></script>
  </body></html>`;

  const output=patchPortfolioHtml(input);

  assert.match(output,/class="company crm-company-open"/);
  assert.match(output,/crmOpenPortfolioCustomer\(\$\{c\.id\},event\)/);
  assert.match(output,/event\.preventDefault\(\);event\.stopPropagation\(\)/);
  assert.match(output,/body\.crm-portfolio-detail-open #detail/);
  assert.match(output,/id="crmCustomerClose"/);
  assert.match(output,/crmClosePortfolioCustomer/);

  assert.doesNotMatch(output,/href="\/\?page=customers&editCustomer=/);
  assert.doesNotMatch(output,/src="\/last-contact-auto\.js/);
  assert.doesNotMatch(output,/src="\/portfolio-fullscreen-stable\.js/);
});
