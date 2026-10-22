import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {CRM_SAFE_ROOT_HTML as html} from '../src/crm_safe_root_page.js';
const names=['graphicStatusIs','graphicJobsForSelectedDay','visibleGraphicJobsForDay','editableGraphicJobsForDay'];
const source=names.map(name=>{const start=html.indexOf('function '+name+'('),end=html.indexOf('\nfunction ',start+1);return html.slice(start,end)}).join('\n');
test('only ongoing jobs appear, including previously Istanbul-marked jobs, without deleting history',()=>{
 const jobs=[{id:1,work_date:'2026-10-22',status:'İmalat',price:100},{id:2,work_date:'2026-10-22',status:'İmalat',istanbul_processing:1,price:200},{id:3,work_date:'2026-10-22',status:'İmalat Bitti',price:300},{id:4,work_date:'2026-10-22',status:'Tamamlandı',price:400}];
 const ctx=vm.createContext({$:id=>id==='g_date'?{value:'2026-10-22'}:undefined,allGraphicJobs:jobs,compareGraphicJobs:(a,b)=>a.id-b.id});vm.runInContext(source,ctx);
 assert.deepEqual(Array.from(vm.runInContext('visibleGraphicJobsForDay()',ctx),x=>x.id),[1,2]);
 assert.deepEqual(Array.from(vm.runInContext('editableGraphicJobsForDay()',ctx),x=>x.id),[1,2]);
 assert.equal(vm.runInContext('graphicJobsForSelectedDay().reduce((s,x)=>s+x.price,0)',ctx),1000);
 assert.equal(jobs.length,4);assert.doesNotMatch(html,/data-graphic-view=|toggleIstanbulProcessing/);
});
test('Ali and Cagatay receive the same ongoing job cards',()=>{
 const render=html.slice(html.indexOf('function renderGraphicJobs(){'),html.indexOf('\nif(!CRM_STABILITY_MODE)setInterval',html.indexOf('function renderGraphicJobs(){')));
 const outputs=[];
 for(const role of ['admin','graphic']){
  const elements={g_date:{value:'2026-10-22'},graphicJobRows:{innerHTML:''},graphicWorkingDay:{textContent:''}};
  const ctx=vm.createContext({Date,Intl,currentAccessRole:role,allGraphicJobs:[{id:1,work_date:'2026-10-22',created_date:'2026-10-22',customer_name:'Firma',job_no:'J1',status:'İmalat',price:100,created_by:'Ali'}],$:id=>elements[id],document:{querySelector:()=>({innerHTML:''})},compareGraphicJobs:()=>0,ensureGraphicUserSelector:()=>{},ensureGraphicCompletionFilter:()=>{},graphicEntryTime:()=>'',esc:x=>String(x??''),renderGraphicMonth:()=>{},renderGraphicEnteredJobs:()=>{}});
  vm.runInContext(source+'\n'+render+'\nrenderGraphicJobs()',ctx);outputs.push(elements.graphicJobRows.innerHTML);
 }
 assert.equal(outputs[0],outputs[1]);assert.match(outputs[0],/toggleGraphicJobDone/);
});

test('both users can select finished jobs without Istanbul or Archive tabs',()=>{
 const elements={g_date:{value:'2026-10-22'},graphicCompletionFilter:{value:'completed'}};
 const ctx=vm.createContext({$:id=>elements[id],allGraphicJobs:[{id:1,work_date:'2026-10-22',status:'İmalat'},{id:2,work_date:'2026-10-22',status:'İmalat Bitti'}],compareGraphicJobs:()=>0});vm.runInContext(source,ctx);assert.deepEqual(Array.from(vm.runInContext('visibleGraphicJobsForDay()',ctx),x=>x.id),[2]);assert.match(html,/<option value="completed">Biten İşler<\/option>/);
});
