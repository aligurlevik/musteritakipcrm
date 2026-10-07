import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('CRM modülleri kalıcı kabukta anında görünür ve veri yükü sonraki framee bırakılır', async () => {
  const page=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

  assert.match(page,/const CRM_PAGE_CACHE_MS=900000/);
  assert.match(page,/async function loadCrmPageData\(page,/);
  assert.match(page,/function activateCrmPage\(page,/);
  assert.match(page,/function requestedCrmPage\(\)/);
  assert.match(page,/history\.replaceState/);
  assert.match(page,/crmPageLoadPromises/);
  assert.match(page,/requestAnimationFrame\(\(\)=>requestAnimationFrame/);
  assert.match(page,/data-page="portfolio"/);
  assert.match(page,/id="portfolioFrame"/);
  assert.match(page,/musteri-portfoyu\.html\?embedded=1/);
  assert.match(page,/function prewarmPortfolioFrame\(\)/);
  assert.match(page,/function ensurePortfolioFrameLoaded\(\)/);
  assert.match(page,/function requestedCrmPage\(\)/);
  assert.match(page,/requested==='portfolio'\|\|saved==='portfolio'/);
  assert.match(page,/sessionStorage\.setItem\('crm_active_page','dash'\)/);
  assert.match(page,/function ensurePortfolioEscapeButton\(\)/);
  assert.match(page,/portfolioEscapeBtn/);
  assert.match(page,/function schedulePortfolioRecovery\(\)/);
  assert.match(page,/portfolioFrameHealthy/);
  assert.match(page,/Müşteri Portföyü yüklenemedi\. CRM Ana Ekran açıldı\./);
  assert.match(page,/embedded=1&recovery=20261007-1/);
  assert.match(page,/getAttribute\('src'\)/);
  assert.match(page,/if\(page==='portfolio'\)\{/);
  assert.match(page,/ensurePortfolioFrameLoaded\(\);/);
  assert.match(page,/schedulePortfolioRecovery\(\);/);
  assert.doesNotMatch(page,/requestIdleCallback\(prewarmPortfolioFrame/);
  assert.match(page,/crmSwitching/);
  assert.match(page,/beginCrmSwitch/);
  assert.match(page,/crmDeferredLoadTimer/);
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
