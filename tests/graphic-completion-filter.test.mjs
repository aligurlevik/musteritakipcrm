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

test('Istanbul processing is separate from active jobs and completion takes precedence',()=>{
 const elements={g_date:{value:'2026-10-22'},graphicCompletionFilter:{value:'active'}};
 const jobs=[{id:1,work_date:'2026-10-22',status:'İmalat',price:100},{id:2,work_date:'2026-10-22',status:'İmalat',istanbul_processing:1,price:200},{id:3,work_date:'2026-10-01',status:'İmalat',istanbul_processing:1,price:300},{id:4,work_date:'2026-10-22',status:'İmalat Bitti',istanbul_processing:1,price:400}];
 const ctx=vm.createContext({$:id=>elements[id],allGraphicJobs:jobs,compareGraphicJobs:(a,b)=>a.id-b.id});vm.runInContext(source,ctx);
 const ids=()=>Array.from(vm.runInContext('visibleGraphicJobsForDay()',ctx),x=>x.id);
 assert.deepEqual(ids(),[1]);elements.graphicCompletionFilter.value='istanbul';assert.deepEqual(ids(),[2,3]);
 jobs[1].status='İmalat Bitti';assert.deepEqual(ids(),[3]);elements.graphicCompletionFilter.value='completed';assert.deepEqual(ids(),[2,4]);
 assert.equal(jobs.reduce((sum,x)=>sum+x.price,0),1000);
});

test('Istanbul transfer persists independently without changing status, price or date',async()=>{
 const {readFile}=await import('node:fs/promises');const {DatabaseSync}=await import('node:sqlite');
 const worker=await readFile(new URL('../src/index.js',import.meta.url),'utf8');
 const code=worker.split("if(graphicJob&&request.method==='PUT'){")[1].split("  if(graphicJob&&request.method==='DELETE')")[0].replace(/\n  }\s*$/,'');
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE graphic_jobs(id INTEGER PRIMARY KEY,work_date TEXT,job_no TEXT,customer_name TEXT,description TEXT,quantity INTEGER,delivery_date TEXT,delivery_place TEXT,status TEXT,note TEXT,price REAL,created_by TEXT,completed_by TEXT,remind_at TEXT,completed_at TEXT,alarm_enabled INTEGER,istanbul_processing INTEGER DEFAULT 0,updated_at TEXT);INSERT INTO graphic_jobs(id,work_date,status,price) VALUES(1,'2026-10-22','İmalat',1234)");
 const env={DB:{prepare(sql){return {bind(...v){return {run:async()=>db.prepare(sql).run(...v)}}}}}};
 for(const flag of [true,false]){const ctx=vm.createContext({env,request:{},graphicJob:[null,'1'],role:'admin',body:async()=>({istanbul_processing:flag}),json:x=>x});await vm.runInContext('(async()=>{'+code+'})()',ctx);const row=db.prepare('SELECT * FROM graphic_jobs').get();assert.equal(row.istanbul_processing,flag?1:0);assert.equal(row.status,'İmalat');assert.equal(row.price,1234);assert.equal(row.work_date,'2026-10-22');}
 db.close();
});

test('Ali and Cagatay use identical graphic job cards and tabs',()=>{
 const render=html.slice(html.indexOf('function renderGraphicJobs(){'),html.indexOf('\nif(!CRM_STABILITY_MODE)setInterval',html.indexOf('function renderGraphicJobs(){')));
 const tabSource=html.slice(html.indexOf('function setGraphicJobView('),html.indexOf('\nasync function toggleIstanbulProcessing'));
 const outputs=[];
 for(const role of ['admin','graphic']){
  const elements={g_date:{value:'2026-10-22'},graphicJobRows:{innerHTML:''},graphicWorkingDay:{textContent:''},graphicCompletionFilter:{value:'active'}};
  const title={innerHTML:''};const ctx=vm.createContext({Date,Intl,currentAccessRole:role,allGraphicJobs:[{id:1,work_date:'2026-10-22',created_date:'2026-10-22',customer_name:'Firma',job_no:'J1',status:'İmalat',price:100,created_by:'Ali'}],$:id=>elements[id],document:{querySelector:()=>title,querySelectorAll:()=>[]},compareGraphicJobs:()=>0,ensureGraphicUserSelector:()=>{},graphicEntryTime:()=>'',esc:x=>String(x??''),renderGraphicMonth:()=>{},renderGraphicEnteredJobs:()=>{}});
  vm.runInContext(source+'\n'+tabSource+'\n'+render+'\nrenderGraphicJobs()',ctx);outputs.push(elements.graphicJobRows.innerHTML);
  assert.match(outputs.at(-1),/İstanbul’da işlemde/);assert.match(outputs.at(-1),/updateGraphicJobStatus/);assert.match(outputs.at(-1),/toggleGraphicJobDone/);
 }
 assert.equal(outputs[0],outputs[1]);
 assert.match(html,/selector.style.display='';selector.disabled=currentAccessRole==='graphic'/);
});
