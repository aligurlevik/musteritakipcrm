import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {CRM_SAFE_ROOT_HTML as html} from '../src/crm_safe_root_page.js';

const names=['graphicStatusIs','graphicJobsForSelectedDay','visibleGraphicJobsForDay','editableGraphicJobsForDay'];
const source=names.map(name=>{const start=html.indexOf('function '+name+'('),end=html.indexOf('\nfunction ',start+1);return html.slice(start,end)}).join('\n');
test('active and completed lists share the same job mapping without changing revenue inputs',()=>{
  const elements={g_date:{value:'2026-10-19'}};
  const jobs=[
    {id:1,work_date:'2026-10-19',status:'İmalat',price:10},
    {id:2,work_date:'2026-10-19',status:'İmalat Bitti',price:20},
    {id:3,work_date:'2026-10-23',created_date:'2026-10-19',status:'Bekleme Bitti',price:30},
    {id:4,work_date:'2026-10-19',status:'Tamamlandı',price:40},
    {id:5,work_date:'2026-10-20',status:'İmalat',price:50}
  ];
  const ctx=vm.createContext({$:id=>elements[id],allGraphicJobs:jobs,compareGraphicJobs:(a,b)=>a.id-b.id});
  vm.runInContext(source,ctx);
  const ids=fn=>Array.from(vm.runInContext(fn+'()',ctx),x=>x.id);
  assert.deepEqual(ids('visibleGraphicJobsForDay'),[1]);
  elements.graphicCompletionFilter={value:'completed'};
  assert.deepEqual(ids('visibleGraphicJobsForDay'),[2,3,4]);
  assert.deepEqual(ids('editableGraphicJobsForDay'),[2,3,4]);
  assert.deepEqual(ids('graphicJobsForSelectedDay'),[1,2,3,4]);
  elements.graphicCompletionFilter.value='active';
  assert.deepEqual(ids('editableGraphicJobsForDay'),[1]);
  assert.equal(jobs.length,5);
  assert.match(html,/produced=graphicJobsForSelectedDay\(\)\.filter/);
  assert.match(html,/option.textContent='✓ Teslim Edildi'/);
});

test('archive is clearly labeled and delivered production jobs leave tracking',async()=>{
 const {readFile}=await import('node:fs/promises');
 const worker=await readFile(new URL('../src/index.js',import.meta.url),'utf8');
 assert.match(html,/>Arşiv — Teslim Edilen İşler<\/option>/);
 assert.match(worker,/FROM graphic_jobs g WHERE g.work_date=\? AND g.status LIKE 'İmalat%' AND g.status NOT LIKE '%Bitti' ORDER BY/);
});
