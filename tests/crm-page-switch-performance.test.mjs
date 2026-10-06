import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('CRM sayfa geçişi görünümü anında değiştirir ve ağır işi 16 ms kuyruğa bırakır', async () => {
  const source=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

  assert.match(source,/const CRM_PAGE_CACHE_MS=900000/);
  assert.match(source,/let crmSwitching=false/);
  assert.match(source,/function beginCrmSwitch\(page\)/);

  const start=source.indexOf('function activateCrmPage(');
  const end=source.indexOf("document.querySelectorAll('.menu button[data-page]')",start);
  assert.ok(start>=0&&end>start,'activateCrmPage bloğu bulunmalı');
  const block=source.slice(start,end);

  assert.doesNotMatch(block,/requestAnimationFrame\(\(\)=>requestAnimationFrame/);
  assert.match(block,/requestAnimationFrame\(\(\)=>\{/);
  assert.match(block,/setTimeout\(\(\)=>\{/);
  assert.match(block,/\},16\)/);
  assert.doesNotMatch(block,/\},120\)/);
  assert.match(block,/if\(!force&&last&&now-last<CRM_PAGE_CACHE_MS\)/);
  assert.match(block,/if\(generation!==crmSwitchGeneration\|\|crmActivePage!==page\)return/);

  assert.match(source,/if\(!crmSwitching&&\$\('graphicJobs'\)/);
  assert.match(source,/if\(!crmSwitching&&\$\('tracking'\)/);
  assert.match(source,/if\(!crmSwitching&&currentAccessRole==='admin'\)checkLocalAgendaAlarms/);
  assert.match(source,/portfolio iframe is loaded only when the user opens Portfolio/);
  assert.doesNotMatch(source,/requestIdleCallback\(prewarmPortfolioFrame/);
});
