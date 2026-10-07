import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('CRM stability mode arka plan yükünü kapatır ve grafik toplamını hafifletir', async () => {
  const page=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const entry=await readFile(new URL('../src/portfolio_company_link_entry.js',import.meta.url),'utf8');
  const graphicPatch=await readFile(new URL('../src/graphic_fast_daily_load_patch.js',import.meta.url),'utf8');

  assert.match(page,/const CRM_STABILITY_MODE=true/);
  assert.doesNotMatch(page,/created_from=2000-01-01/);
  assert.match(page,/req\('\/api\/graphic-jobs-summary'\)/);
  assert.match(page,/if\(!CRM_STABILITY_MODE\)setInterval\(\(\)=>\{if\(!crmSwitching&&\$\('graphicJobs'\)/);
  assert.match(page,/if\(!CRM_STABILITY_MODE\)setInterval\(\(\)=>\{if\(!crmSwitching&&\$\('tracking'\)/);
  assert.match(page,/if\(!CRM_STABILITY_MODE\)setInterval\(\(\)=>\{if\(crmSwitching\|\|currentAccessRole!=='admin'\)return/);
  assert.match(page,/graphicCumulativeSummary/);
  assert.match(entry,/url\.pathname==='\/api\/graphic-jobs-summary'/);
  assert.match(entry,/SELECT COALESCE\(SUM\(price\),0\) total, COUNT\(\*\) count FROM graphic_jobs/);
  assert.match(graphicPatch,/req\('\/api\/graphic-jobs-summary'\)/);
  assert.doesNotMatch(graphicPatch,/created_from=2000-01-01/);
  assert.match(graphicPatch,/graphicCumulativeSummary=\{total:Number\(summary\.total\|\|0\),count:Number\(summary\.count\|\|0\)\}/);
});
