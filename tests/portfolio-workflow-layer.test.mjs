import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('güvenli portföy iş akışı temel ekranı bozmadan ek özellikleri yükler', async () => {
  const wrangler = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/portfolio_workflow_patch_entry.js', import.meta.url), 'utf8');
  const js = await readFile(new URL('../public/portfolio-workflow-v1.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/portfolio-workflow-v1.css', import.meta.url), 'utf8');

  assert.match(wrangler, /"main": "src\/portfolio_workflow_patch_entry\.js"/);
  assert.match(entry, /import worker from '\.\/portfolio_company_link_entry\.js'/);
  assert.match(entry, /data-workflow-layer="safe-v1"/);
  assert.match(entry, /portfolio-workflow-v1\.js/);
  assert.match(entry, /portfolio-workflow-v1\.css/);
  assert.match(entry, /return response/);

  assert.doesNotThrow(() => new Function(js));
  assert.match(js, /Portföy ek özellik katmanı atlandı; temel ekran korunuyor/);
  assert.match(js, /textContent='Mail'/);
  assert.match(js, /textContent\.trim\(\)==='Not'/);
  assert.match(js, /workflowContactPicker/);
  assert.match(js, /Asıl Yetkili Yap/);
  assert.match(js, /openWorkflowMail/);
  assert.match(js, /\/api\/customer-mail\/send/);
  assert.match(js, /meetingNoteResult/);
  assert.match(js, /Sonuçlanmamış/);
  assert.match(js, /dResultSelect/);
  assert.match(js, /Kaydedildi\. Sonuç müşteri listesine işlendi/);
  assert.match(css, /workflow-table-mail/);
  assert.match(css, /workflow-mail-panel/);
});
