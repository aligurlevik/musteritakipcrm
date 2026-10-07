import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('CRM root is served directly without wrapper HTML injection', async()=>{
  const entry=await readFile(new URL('../src/portfolio_company_link_entry.js',import.meta.url),'utf8');
  assert.match(entry,/async function directRootResponse\(request,env\)/);
  assert.match(entry,/assetUrl\.pathname='\/index\.html'/);
  assert.match(entry,/env\.ASSETS\.fetch\(assetRequest\)/);
  assert.match(entry,/x-crm-root-mode','direct-safe-v1/);
  assert.match(entry,/url\.pathname==='\/'\|\|url\.pathname==='\/index\.html'/);
  assert.match(entry,/return directRootResponse\(request,env\)/);
});
