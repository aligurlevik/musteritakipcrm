import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('firma adına tıklama eski listener katmanlarını kullanmadan tek müşteri kartını tam ekran açar',async()=>{
  const source=await readFile(new URL('../src/portfolio_company_link_entry.js',import.meta.url),'utf8');

  assert.match(source,/class="company crm-company-open"/);
  assert.match(source,/crmOpenPortfolioCustomer/);
  assert.match(source,/event\.preventDefault\(\)/);\n  assert.match(source,/event\.stopPropagation\(\)/);
  assert.match(source,/body\.crm-portfolio-detail-open #detail/);
  assert.match(source,/id="crmCustomerClose"/);
  assert.match(source,/crmClosePortfolioCustomer/);

  assert.match(source,/portfolio-fullscreen-detail\\\.js/);
  assert.match(source,/portfolio-fullscreen-stable\\\.js/);
  assert.match(source,/last-contact-auto\\\.js/);
});
