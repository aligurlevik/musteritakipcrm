import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('CRM sayfa geçişi önce görünümü değiştirir ve ağır işleri erteler', async () => {
  const source=await readFile(new URL('../public/index.html',import.meta.url),'utf8');

  assert.match(source,/const CRM_PAGE_CACHE_MS=900000/);
  assert.match(source,/let crmSwitching=false/);
  assert.match(source,/function beginCrmSwitch\(page\)/);
  assert.doesNotMatch(source,/requestAnimationFrame\(\(\)=>requestAnimationFrame/);
  assert.match(source,/requestAnimationFrame\(\(\)=>\{/);
  assert.match(source,/setTimeout\(\(\)=>\{/);
  assert.match(source,/\},16\)/);
  assert.doesNotMatch(source,/\},120\)/);
  assert.match(source,/if\(generation!==crmSwitchGeneration\|\|crmActivePage!==page\)return/);
  assert.match(source,/if\(!crmSwitching&&\$\('graphicJobs'\)/);
  assert.match(source,/if\(!crmSwitching&&\$\('tracking'\)/);
  assert.match(source,/if\(!crmSwitching&&currentAccessRole==='admin'\)checkLocalAgendaAlarms/);
  assert.match(source,/portfolio iframe is loaded only when the user opens Portfolio/);
  assert.doesNotMatch(source,/requestIdleCallback\(prewarmPortfolioFrame/);
});
