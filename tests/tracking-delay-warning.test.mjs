import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
for(const path of ['public/index.html','src/crm_safe_root_page.js'])test(path+' keeps delay warning after moving the deadline',()=>{
 const raw=readFileSync(path,'utf8'),html=path.endsWith('.js')?JSON.parse(raw.slice(raw.indexOf(' = ')+3).trim().replace(/;$/,'')):raw;
 const start=html.indexOf('function trackingDelayInfo'),end=html.indexOf('const renderTrackingJobsForSelectedDay',start);
 assert.ok(start>0&&end>start);
 const nodes={trackingRows:{innerHTML:''},trackingDate:{textContent:''}};
 const ctx=vm.createContext({Date,Number,String,Math,trackingJobs:[{id:1,customer_name:'Devreden',job_no:'J1',work_date:'2026-10-23',original_work_date:'2026-10-20',first_delayed_from:'2026-10-20',delay_count:2,tracking_status:'Görüşüldü'},{id:2,customer_name:'Normal',job_no:'J2',work_date:'2026-10-23',original_work_date:'2026-10-23'}],$:id=>nodes[id],document:{querySelector:()=>null},esc:s=>String(s??''),graphicOriginalNote:()=>''});
 vm.runInContext(html.slice(start,end)+';renderTrackingJobs()',ctx);
 const output=nodes.trackingRows.innerHTML;
 assert.match(output,/1 iş önceki termininden devredildi/);
 assert.match(output,/tracking-card tracking-carried-delay done/);
 assert.match(output,/İlk termin: 20.10.2026/);assert.match(output,/3 gün ötelendi/);assert.match(output,/2 kez devredildi/);
 assert.equal((output.match(/TERMİNİ GEÇTİ • DEVREDİLDİ/g)||[]).length,1);
 ctx.trackingJobs[0].work_date='2026-10-24';vm.runInContext('renderTrackingJobs()',ctx);
 assert.match(nodes.trackingRows.innerHTML,/4 gün ötelendi/);
});
