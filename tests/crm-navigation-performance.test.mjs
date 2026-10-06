import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('CRM modülleri ağır toplu yükleme yerine sayfa bazlı lazy yüklenir', async () => {
  const page=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

  assert.match(page,/const CRM_PAGE_CACHE_MS=30000/);
  assert.match(page,/async function loadCrmPageData\(page,/);
  assert.match(page,/async function activateCrmPage\(page,/);
  assert.match(page,/function requestedCrmPage\(\)/);
  assert.match(page,/history\.replaceState/);
  assert.match(page,/crmPageLoadPromises/);
  assert.match(page,/loadCrmPageData\('meetings',\{force:true\}\)/);
  assert.match(page,/\},60000\);/);
  assert.match(page,/rel="prefetch" href="\/musteri-portfoyu\.html"/);
  assert.match(page,/if\(\$\('meetings'\)\?\.classList\.contains\('active'\)\)renderMeetings\(\)/);
  assert.match(page,/setTimeout\(\(\)=>\{pollMeetingReminders\(\);pollAgendaReminders\(\);checkLocalAgendaAlarms\(\);checkAutomaticEndOfDayReport\(\)\},900\)/);

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

// hidden meetings DOM is not rebuilt while the Mail module is active.

test('Portföy ekranı ana CRM kabuğunu önceden yükler', async () => {
  const page=await readFile(new URL('../public/musteri-portfoyu-v2.html',import.meta.url),'utf8');
  assert.match(page,/PORTFOY RICH V18/);
  assert.match(page,/rel="prefetch" href="\/"/);
});
