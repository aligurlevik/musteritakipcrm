import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('temiz portföy ekranı firma butonundan müşteri kartını aynı sayfada açar', async () => {
  const wrapper = await readFile(new URL('../src/portfolio_company_link_entry.js', import.meta.url), 'utf8');
  const page = await readFile(new URL('../public/musteri-portfoyu-v2.html', import.meta.url), 'utf8');

  assert.match(wrapper, /clean-v2/);
  assert.match(wrapper, /musteri-portfoyu-v2\.html/);
  assert.match(wrapper, /env\.ASSETS\.fetch/);
  assert.doesNotMatch(wrapper, /crmOpenPortfolioCustomer/);
  assert.doesNotMatch(wrapper, /patchPortfolioHtml/);

  assert.match(page, /PORTFOY CLEAN V2/);
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

  const scripts=[...page.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)];
  assert.ok(scripts.length>0,'portföy sayfasında inline script bulunmalı');
  const inlineScript=scripts.at(-1)[1];
  assert.doesNotThrow(()=>new Function(inlineScript));
});
