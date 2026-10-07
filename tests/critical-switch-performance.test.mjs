import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('guvenilir program gecisi temiz sayfa oturumu kullanir ve agir sorguyu kaldirir', async () => {
  const wrangler=await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8');
  const entry=await readFile(new URL('../src/critical_switch_performance_entry.js',import.meta.url),'utf8');
  const js=await readFile(new URL('../public/crm-switch-reliable-v4.js',import.meta.url),'utf8');

  assert.match(wrangler, /"main": "src\/critical_switch_performance_entry\.js"/);
  assert.match(entry, /import worker from '\.\/portfolio_workflow_patch_entry\.js'/);
  assert.match(entry, /RELIABLE_PROGRAM_SWITCH_V4/);
  assert.doesNotMatch(entry, /env\.ASSETS\.fetch\(request\).*crm-switch-reliable-v4/);
  assert.match(entry, /x-crm-switch-client':'worker-bundled-v4/);
  assert.match(entry, /\/api\/graphic-jobs-summary/);
  assert.match(entry, /SELECT COALESCE\(SUM\(price\),0\) total, COUNT\(\*\) count FROM graphic_jobs/);
  assert.match(entry, /no-cache, must-revalidate/);
  assert.match(entry, /rel="prefetch"/);
  assert.match(entry, /data-crm-switch-reliable="reliable-v4"/);

  assert.doesNotThrow(()=>new Function(js));
  assert.match(js, /timeoutMs=method==='GET'\?7000:15000/);
  assert.match(js, /Program kilitlenmedi; tekrar deneyin/);
  assert.match(js, /\/api\/graphic-jobs-summary/);
  assert.doesNotMatch(js, /created_from=2000-01-01/);
  assert.match(js, /graphicCumulativeJobs=\[\]/);
  assert.match(js, /window\.__graphicCumulativeSummary/);

  assert.match(js, /function hardSwitch\(page,button\)/);
  assert.match(js, /location\.replace\(target\)/);
  assert.match(js, /switch','hard-v4'/);
  assert.match(js, /crmHardSwitchOverlay/);
  assert.match(js, /document\.querySelectorAll\('\.menu button\[data-page\]'\)/);
  assert.doesNotMatch(js, /requestAnimationFrame\(\(\)=>requestAnimationFrame/);
});
