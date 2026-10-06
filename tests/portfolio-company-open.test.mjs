import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('temiz portföy ekranı firma butonundan müşteri kartını aynı sayfada açar', async () => {
  const wrapper = await readFile(new URL('../src/portfolio_company_link_entry.js', import.meta.url), 'utf8');
  const page = await readFile(new URL('../public/musteri-portfoyu.html', import.meta.url), 'utf8');

  assert.match(wrapper, /clean-v2/);
  assert.match(wrapper, /env\.ASSETS\.fetch\(request\)/);
  assert.doesNotMatch(wrapper, /crmOpenPortfolioCustomer/);
  assert.doesNotMatch(wrapper, /patchPortfolioHtml/);

  assert.match(page, /PORTFÖY CLEAN V2/);
  assert.match(page, /id="listView"/);
  assert.match(page, /id="detailView"/);
  assert.match(page, /data-open-customer/);
  assert.match(page, /function openCustomerCard\(id\)/);
  assert.match(page, /\$\('listView'\)\.classList\.add\('hidden'\)/);
  assert.match(page, /\$\('detailView'\)\.classList\.remove\('hidden'\)/);
  assert.match(page, /customerRows'\)\.addEventListener\('click'/);
  assert.match(page, /api\('\/api\/customers\?status=Tümü'\)/);

  assert.doesNotMatch(page, /portfolio-fullscreen-detail\.js/);
  assert.doesNotMatch(page, /portfolio-fullscreen-stable\.js/);
  assert.doesNotMatch(page, /onclick="selectCustomer/);
});
