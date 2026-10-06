import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('CRM modülleri kalıcı kabukta anında görünür ve veri yükü sonraki framee bırakılır', async () => {
  const page=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

  assert.match(page,/const CRM_PAGE_CACHE_MS=300000/);
  assert.match(page,/async function loadCrmPageData\(page,/);
  assert.match(page,/function activateCrmPage\(page,/);
  assert.match(page,/function requestedCrmPage\(\)/);
  assert.match(page,/history\.replaceState/);
  assert.match(page,/crmPageLoadPromises/);
  assert.match(page,/requestAnimationFrame\(\(\)=>setTimeout/);
  assert.match(page,/data-page="portfolio"/);
  assert.match(page,/id="portfolioFrame"/);
  assert.match(page,/musteri-portfoyu\.html\?embedded=1/);
  assert.match(page,/function prewarmPortfolioFrame\(\)/);
  assert.match(page,/portfolio-mode/);

  const loadAllStart=page.indexOf('async function loadAll(){');
  const loadAllEnd=page.indexOf('function openM(',loadAllStart);
  assert.ok(loadAllStart>=0&&loadAllEnd>loadAllStart);
  const loadAllBlock=page.slice(loadAllStart,loadAllEnd);
  assert.doesNotMatch(loadAllBlock,/Promise\.allSettled\(\[loadDashboard\(\),loadCustomers\(\),loadMeetings\(\),loadOffers\(\),loadMails\(\),loadAgenda\(\)\]\)/);
  assert.match(loadAllBlock,/await loadCrmPageData\(page,\{force:true\}\)/);

  const start=page.lastIndexOf('<script>');
  const end=page.indexOf('</script>',start);
  assert.ok(start>=0&&end>start,'ana CRM inline script bulunmalı');
  const inlineScript=page.slice(start+'<script>'.length,end);
  assert.doesNotThrow(()=>new Function(inlineScript));
});

test('Portföy ekranı ana CRM kabuğu içinde gömülü çalışır ve standalone açılışı kabuğa yönlendirir', async () => {
  const page=await readFile(new URL('../public/musteri-portfoyu-v2.html',import.meta.url),'utf8');
  assert.match(page,/PORTFOY RICH V19/);
  assert.match(page,/embedded/);
  assert.match(page,/crm-embedded/);
  assert.match(page,/location\.replace\('\/\?page=portfolio'\)/);
  assert.match(page,/window\.parent\.activateCrmPage\('customers'\)/);
});
