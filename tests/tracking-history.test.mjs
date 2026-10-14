import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const backend=readFileSync('src/index.js','utf8'),page=readFileSync('public/index.html','utf8');
const start=backend.indexOf("if(path==='/api/tracking'&&request.method==='GET'){");
const route=backend.slice(start,backend.indexOf('  const trackingJob=',start));
async function tracking(date){
  const calls=[];
  const context={path:'/api/tracking',request:{method:'GET'},url:new URL('https://crm.test/api/tracking'+(date?'?date='+date:'')),
    istanbulDate:d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d),
    dateAtNoon:key=>new Date(key+'T12:00:00+03:00'),nextWorkingDate:()=> '2026-10-15',isNonWorkingDate:()=>true,
    json:(data,status=200)=>({data,status}),env:{DB:{prepare(sql){return {bind(...args){calls.push({sql,args});return this},async all(){return {results:[{id:8,work_date:date}]}},async run(){return {}}}}}}
  };
  const result=await vm.runInNewContext('(async()=>{'+route+'})()',context);
  return {result,calls};
}
test('geçmiş takip günü seçilen tarihi sorgular ve işlerin tarihini değiştirmez',async()=>{
  const {result,calls}=await tracking('2026-10-13');
  assert.equal(result.status,200);assert.equal(result.data[0].work_date,'2026-10-13');
  assert.equal(calls.length,1);assert.match(calls[0].sql,/SELECT g.id/);assert.equal(calls[0].args[0],'2026-10-13');
  assert.doesNotMatch(calls[0].sql,/price|revenue/);
});
test('takip tarih sorgusu geçersiz takvim gününü reddeder',async()=>{
  for(const date of ['2026-02-30','yanlış']){const {result,calls}=await tracking(date);assert.equal(result.status,400);assert.equal(calls.length,0)}
});
test('önceki ve sonraki gün düğmeleri ay sınırını geçer ve takvim seçimi sorguya gider',()=>{
  const source=page.slice(page.indexOf("let trackingJobs=[]"),page.indexOf('const trackingHolidays='));
  const ctx=vm.createContext({localDateKey:d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},nextTrackingWorkDate:()=>new Date('2026-10-15T12:00:00'),loadTrackingJobs:()=>{},Date});
  vm.runInContext(source,ctx);
  vm.runInContext("setTrackingDate('2026-10-01');changeTrackingDate(-1)",ctx);
  assert.equal(vm.runInContext('trackingDateKey()',ctx),'2026-09-30');
  vm.runInContext('changeTrackingDate(1)',ctx);assert.equal(vm.runInContext('trackingDateKey()',ctx),'2026-10-01');
  assert.match(page,/date=\s*['"]?\+encodeURIComponent\(trackingSelectedDate\)/);
  assert.match(page,/trackingViewDay==='date'\)\{document.querySelectorAll[\s\S]*?el.disabled=true/);
});
