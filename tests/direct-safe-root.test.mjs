import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('CRM root is served directly without wrapper HTML injection', async()=>{
  const entry=await readFile(new URL('../src/portfolio_company_link_entry.js',import.meta.url),'utf8');
  assert.match(entry,/import \{CRM_SAFE_ROOT_HTML\} from '\.\/crm_safe_root_page\.js'/);
  assert.match(entry,/function directRootResponse\(\)/);
  assert.match(entry,/new Response\(CRM_SAFE_ROOT_HTML/);
  assert.match(entry,/x-crm-root-mode','worker-bundled-safe-v2/);
  assert.match(entry,/url\.pathname==='\/'\|\|url\.pathname==='\/index\.html'/);
  assert.match(entry,/url\.pathname==='\/safe-crm'/);
  assert.match(entry,/return directRootResponse\(\)/);
  assert.doesNotMatch(entry,/env\.ASSETS\.fetch\(assetRequest\)/);
});
