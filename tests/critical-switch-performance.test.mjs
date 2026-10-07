import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('kritik program gecis performans katmani agir sorguyu kaldirir ve beklemeyi sinirlar', async () => {
  const wrangler=await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8');
  const entry=await readFile(new URL('../src/critical_switch_performance_entry.js',import.meta.url),'utf8');
  const js=await readFile(new URL('../public/crm-switch-performance-v3.js',import.meta.url),'utf8');

  assert.match(wrangler, /"main": "src\/critical_switch_performance_entry\.js"/);
  assert.match(entry, /import worker from '\.\/portfolio_workflow_patch_entry\.js'/);
  assert.match(entry, /\/api\/graphic-jobs-summary/);
  assert.match(entry, /SELECT COALESCE\(SUM\(price\),0\) total, COUNT\(\*\) count FROM graphic_jobs/);
  assert.match(entry, /private, max-age=30, stale-while-revalidate=120/);
  assert.match(entry, /rel="prefetch"/);
  assert.match(entry, /data-crm-switch-performance="critical-v3"/);
  assert.match(entry, /x-crm-stale-v4':'neutralized/);
  assert.match(entry, /u\.searchParams\.delete\('switch'\)/);
  assert.match(entry, /crm_active_page','dash/);
  assert.match(entry, /no-store, no-cache, must-revalidate/);

  assert.doesNotThrow(()=>new Function(js));
  assert.match(js, /timeoutMs=method==='GET'\?7000:15000/);
  assert.match(js, /Program kilitlenmedi; tekrar deneyin/);
  assert.match(js, /\/api\/graphic-jobs-summary/);
  assert.doesNotMatch(js, /created_from=2000-01-01/);
  assert.match(js, /graphicCumulativeJobs=\[\]/);
  assert.match(js, /window\.__graphicCumulativeSummary/);

  const activateStart=js.indexOf("activateCrmPage=function");
  assert.ok(activateStart>=0);
  const activate=js.slice(activateStart);
  assert.match(activate, /requestAnimationFrame\(\(\)=>\{/);
  assert.match(activate, /\},16\)/);
  assert.doesNotMatch(activate, /requestAnimationFrame\(\(\)=>requestAnimationFrame/);
  assert.doesNotMatch(activate, /\},120\)/);
  assert.match(activate, /Date\.now\(\)-last<CRM_PAGE_CACHE_MS/);
});
