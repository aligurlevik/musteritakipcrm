import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
const backend=readFileSync('src/index.js','utf8');
test('delivery day includes finished and waiting jobs until tracking independently checks them',()=>{
 const start=backend.indexOf("if(path==='/api/tracking'&&request.method==='GET'){");
 const route=backend.slice(start,backend.indexOf('  const trackingJob=',start));
 const query=route.match(/prepare\("(SELECT g.id.*?)"\)/s)[1];
 const script=`import sqlite3,json,sys\ndb=sqlite3.connect(':memory:')\ndb.executescript('CREATE TABLE graphic_jobs(id,work_date,original_work_date,job_no,customer_name,description,note,tracking_note,status,remind_at,delivery_place,tracking_status,tracked_by,tracked_at); CREATE TABLE graphic_job_delays(graphic_job_id,delayed_from,delayed_to);')\nfor id,status,tracked,date in [(1,'İmalat Bitti','','2026-10-23'),(2,'İmalat','','2026-10-23'),(3,'Bekleme Bitti','','2026-10-23'),(4,'İmalat Bitti','Görüşüldü','2026-10-23'),(5,'İmalat','','2026-10-24')]:\n db.execute('INSERT INTO graphic_jobs(id,status,tracking_status,work_date) VALUES(?,?,?,?)',(id,status,tracked,date))\nquery=sys.argv[1]\nprint(json.dumps([[r[0] for r in db.execute(query,params)] for params in [('2026-10-23','2026-10-23','2026-10-23',0),('2026-10-23','2026-10-23','2026-10-24',0)]]))`;
 const [active,history]=JSON.parse(execFileSync('python',['-c',script,query],{encoding:'utf8'}));
 assert.deepEqual(active,[1,2,3]);assert.deepEqual(history,[1,2,3,4]);
 assert.doesNotMatch(route,/UPDATE graphic_jobs|INSERT INTO graphic_job_delays/);
});
for(const file of ['public/index.html','src/crm_safe_root_page.js'])test(file+' removes checked jobs only after successful server save',async()=>{
 let page=readFileSync(file,'utf8');if(file.endsWith('.js'))page=JSON.parse(page.slice(page.indexOf('=')+1).trim().replace(/;$/,''));
 const source=page.slice(page.indexOf('async function setTrackingDone('),page.indexOf('async function updateTrackingDeliveryPlace('));
 let fail=false;const ctx=vm.createContext({trackingJobs:[{id:1,status:'İmalat Bitti'},{id:2}],trackingViewDay:'today',confirm:()=>true,req:async()=>{if(fail)throw Error('save failed')},renderTrackingJobs(){},showMsg(){},loadTrackingJobs:async()=>{}});
 vm.runInContext(source,ctx);await ctx.setTrackingDone(1,true);assert.deepEqual(Array.from(ctx.trackingJobs,x=>x.id),[2]);
 fail=true;await ctx.setTrackingDone(2,true);assert.deepEqual(Array.from(ctx.trackingJobs,x=>x.id),[2]);
});
test('all three tracking date moves preserve delivery time and replace its date',()=>{
 const start=backend.indexOf('  const trackingJob=');
 const route=backend.slice(start,backend.indexOf("if(path===",start));
 const updates=[...route.matchAll(/prepare\("(UPDATE graphic_jobs SET work_date=.*?)"\)/g)].map(x=>x[1]);
 assert.equal(updates.length,3);
 for(const sql of updates){
  const script=`import sqlite3,sys\ndb=sqlite3.connect(':memory:')\ndb.executescript("CREATE TABLE graphic_jobs(id,work_date,remind_at,tracking_status,tracked_by,tracked_at,updated_at); INSERT INTO graphic_jobs(id,work_date,remind_at) VALUES(1,'2026-10-23','2026-10-23T13:30');")\ndb.execute(sys.argv[1],('2026-10-24','2026-10-24',1))\nprint(db.execute('SELECT remind_at FROM graphic_jobs').fetchone()[0])`;
  assert.equal(execFileSync('python',['-c',script,sql],{encoding:'utf8'}).trim(),'2026-10-24T13:30');
 }
});
for(const file of ['public/index.html','src/crm_safe_root_page.js']){
 function html(){const raw=readFileSync(file,'utf8');return file.endsWith('.js')?JSON.parse(raw.split(' = ')[1].trim().replace(/;$/,'')):raw}
 test(file+' cancelling confirmation keeps the job without saving',async()=>{
  const page=html(),source=page.slice(page.indexOf('async function setTrackingDone('),page.indexOf('async function saveTrackingTime('));
  let saves=0,renders=0,prompts=0;
  const ctx=vm.createContext({trackingJobs:[{id:1}],confirm:()=>{prompts++;return false},req:async()=>{saves++},renderTrackingJobs:()=>{renders++}});
  vm.runInContext(source,ctx);await ctx.setTrackingDone(1,true);
  assert.equal(prompts,1);assert.equal(saves,0);assert.equal(renders,1);assert.equal(ctx.trackingJobs.length,1);
 });
 test(file+' sorts all jobs by hour, with missing hours last',()=>{
  const page=html(),start=page.indexOf('function trackingDelayInfo'),end=page.indexOf('const renderTrackingJobsForSelectedDay',start);
  const nodes={trackingRows:{innerHTML:''},trackingDate:{}};
  const ctx=vm.createContext({Date,Number,String,Math,trackingJobs:[{id:1,customer_name:'CARRIED',work_date:'2026-10-23',original_work_date:'2026-10-22',remind_at:'2026-10-23T17:00'},{id:2,customer_name:'EARLY',work_date:'2026-10-23',remind_at:'2026-10-23T09:00'},{id:3,customer_name:'MISSING',work_date:'2026-10-23'}],$:id=>nodes[id],document:{querySelector:()=>null},esc:s=>String(s??''),graphicOriginalNote:()=>''});
  vm.runInContext(page.slice(start,end)+';renderTrackingJobs()',ctx);
  const out=nodes.trackingRows.innerHTML;assert.ok(out.indexOf('EARLY')<out.indexOf('CARRIED'));assert.ok(out.indexOf('CARRIED')<out.indexOf('MISSING'));
 });
}
test('moving a tracking job leaves delivery place unchanged',()=>{
 const start=backend.indexOf('  const trackingJob=');const route=backend.slice(start,backend.indexOf("if(path===",start));
 const updates=[...route.matchAll(/prepare\("(UPDATE graphic_jobs SET work_date=.*?)"\)/g)].map(x=>x[1]);
 assert.equal(updates.length,3);for(const sql of updates)assert.doesNotMatch(sql,/delivery_place/);
});
for(const file of ['public/index.html','src/crm_safe_root_page.js'])test(file+' restores a checked job without changing its production status',async()=>{
 let page=readFileSync(file,'utf8');if(file.endsWith('.js'))page=JSON.parse(page.slice(page.indexOf('=')+1).trim().replace(/;$/,''));
 const source=page.slice(page.indexOf('async function setTrackingDone('),page.indexOf('async function saveTrackingTime('));
 let payload;const job={id:1,status:'İmalat Bitti',tracking_status:'Görüşüldü'};
 const ctx=vm.createContext({trackingJobs:[job],trackingViewDay:'today',req:async(url,options)=>{payload=JSON.parse(options.body)},renderTrackingJobs(){},showMsg(){},loadTrackingJobs:async()=>{}});
 vm.runInContext(source,ctx);await ctx.setTrackingDone(1,false);
 assert.equal(payload.done,false);assert.equal(job.status,'İmalat Bitti');assert.equal(job.tracking_status,'');assert.equal(ctx.trackingJobs.length,0);
 assert.match(page,/Kontrol Edilenler \/ Geri Al/);assert.match(page,/Takibe Geri Al/);
});
