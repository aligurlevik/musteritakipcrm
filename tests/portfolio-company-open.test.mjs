import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('firma adına tıklama native link ile müşteri kartına gider', async () => {
  const wrapper = await readFile(new URL('../src/portfolio_company_link_entry.js', import.meta.url), 'utf8');
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(wrapper, /crm-company-native-link/);
  assert.match(wrapper, /href="\/\?page=customers&editCustomer=\$\{c\.id\}"/);
  assert.match(wrapper, /PORTFÖY 06\.10-E/);
  assert.match(wrapper, /native-link-v3/);
  assert.doesNotMatch(wrapper, /crmOpenPortfolioCustomer/);

  assert.match(index, /openRequestedCustomerFromUrl/);
  assert.match(index, /params\.get\('editCustomer'\)/);
  assert.match(index, /modal\.classList\.add\('crm-direct-customer'\)/);
  assert.match(index, /editCustomer\(customerId\)/);
  assert.match(index, /\.modal\.crm-direct-customer\.open/);
});
