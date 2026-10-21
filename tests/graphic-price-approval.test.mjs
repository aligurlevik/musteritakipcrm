import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {redactGraphicRevenue} from '../src/graphic_calendar_security_helpers.js';
import {readFile} from 'node:fs/promises';
globalThis.crypto??=webcrypto;
const source=await readFile(new URL('../src/graphic_calendar_security_entry.js',import.meta.url),'utf8');
const worker=vm.runInNewContext(source.replace(/^import .*$/gm,'').replace(/^export \{.*$/gm,'').replace('export function','function').replace('export default','const entry=')+';entry',{
 crypto:webcrypto,TextEncoder,Request,Response,Headers,URL,console,Date,
 worker:{async fetch(){return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json'}})}},redactGraphicRevenue,injectGraphicCalendarPatch:html=>html
});
for(const role of ['admin','graphic','tracking']){
 for(const status of ['Bitti','İmalat Bitti','Tamamlandı']){
  test(`${role} cannot approve an unpriced job as ${status}`,async()=>{
   const raw=role+'.'+new Date().toISOString().slice(0,10),cookie=raw+'.'+createHmac('sha256','test-secret').update(raw).digest('hex');
   let writes=0;
   const env={SESSION_SECRET:'test-secret',DB:{prepare(sql){assert.match(sql,/SELECT status,price/);return {bind(){return this},async first(){return {status:'İmalat',price:0}},async run(){writes++}}}}};
   const response=await worker.fetch(new Request('https://crm.test/api/graphic-jobs/123',{method:'PUT',headers:{cookie:'crm_session='+cookie,'content-type':'application/json'},body:JSON.stringify({status})}),env,{});
   assert.equal(response.status,400);assert.match((await response.json()).error,/Fiyat girmeden onay/);assert.equal(writes,0);
  });
 }
}
test('Cagatay gets individual job price while aggregate revenue stays private',()=>{
 const row={price:750,revenue:1000,total:1000,revenue_total:1000,job_no:'J1'};
 assert.deepEqual(redactGraphicRevenue([row],true),[{price:750,job_no:'J1'}]);
 assert.deepEqual(redactGraphicRevenue([row]),[{job_no:'J1'}]);
});
test('both served pages allow admin and graphic price edits on older jobs',async()=>{
 for(const path of ['public/index.html','src/crm_safe_root_page.js']){
  const raw=await readFile(new URL('../'+path,import.meta.url),'utf8');
  const html=path.endsWith('.js')?JSON.parse(raw.slice(raw.indexOf(' = ')+3).trim().replace(/;$/,'')):raw;
  const fn=html.slice(html.indexOf('function enableGraphicPriceEditing'),html.indexOf('function showCompletedGraphicStatus'));
  assert.match(fn,/currentAccessRole!=='admin'&&currentAccessRole!=='graphic'/);
  assert.doesNotMatch(fn,/if\(entryDate!==selectedDate\)/);
 }
});
for(const role of ['admin','graphic','tracking'])test(`${role} can approve a priced job`,async()=>{
 const raw=role+'.'+new Date().toISOString().slice(0,10),cookie=raw+'.'+createHmac('sha256','test-secret').update(raw).digest('hex');
 const env={SESSION_SECRET:'test-secret',DB:{prepare(){return {bind(){return this},async first(){return {status:'İmalat',price:1200}}}}}};
 const response=await worker.fetch(new Request('https://crm.test/api/graphic-jobs/123',{method:'PUT',headers:{cookie:'crm_session='+cookie},body:JSON.stringify({status:'İmalat Bitti'})}),env,{});
 assert.equal(response.status,200);
});
