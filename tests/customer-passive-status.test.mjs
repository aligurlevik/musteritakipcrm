import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {CLEAN_PORTFOLIO_HTML as html} from '../src/portfolio_clean_page.js';
const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const route=source.split("if(recordStatusRoute&&request.method==='PUT'){")[1].split('\n  const customerPotentialRoute=')[0].replace(/\n  }\s*$/,'');
test('temporary inactive and reactivation change only record status and keep customer history and outcome',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE customers(id INTEGER PRIMARY KEY,record_status TEXT,stage TEXT,company TEXT,special_notes TEXT,contacts_json TEXT,follow_date TEXT,updated_at TEXT);INSERT INTO customers VALUES(1,'Aktif','Teklif','Firma','Korunacak not','[{\"name\":\"Yetkili\"}]','2030-12-01','');CREATE TABLE meetings(id INTEGER PRIMARY KEY,customer_id INTEGER,note TEXT);INSERT INTO meetings VALUES(1,1,'Eski görüşme');INSERT INTO customers VALUES(2,'Silindi','Yeni Lead','Silinmiş','','','','')");
 const original=db.prepare('SELECT * FROM customers WHERE id=1').get();
 const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this},first:async()=>db.prepare(sql).get(...args),run:async()=>db.prepare(sql).run(...args)}}}};
 async function run(status,id=1){const ctx={env,recordStatusRoute:[null,String(id)],request:{},body:async()=>({record_status:status}),json:(data,status=200)=>({data,status})};vm.createContext(ctx);return vm.runInContext('(async()=>{'+route+'})()',ctx)}
 try{
  for(const status of ['Pasif','Aktif']){assert.equal((await run(status)).status,200);const saved=db.prepare('SELECT * FROM customers WHERE id=1').get();assert.equal(saved.record_status,status);for(const key of ['stage','company','special_notes','contacts_json','follow_date'])assert.equal(saved[key],original[key]);assert.equal(db.prepare('SELECT note FROM meetings').get().note,'Eski görüşme')}
  assert.equal((await run('Silindi')).status,400);assert.equal((await run('Aktif',2)).status,404);assert.equal((await run('Pasif',99)).status,404);
 }finally{db.close()}
});
test('the default customer list hides inactive customers while Passive and All restore them without marking them lost',()=>{
 const elements=Object.fromEntries(['recordFilter','search','city','district','neighborhood','sector','priority','result','followFilter'].map(id=>[id,{value:''}]));elements.recordFilter.value='Aktif';
 const ctx={$:id=>elements[id],customers:[{id:1,company:'Aktif',stage:'Teklif',record_status:'Aktif'},{id:2,company:'Pasif',stage:'Teklif',record_status:'Pasif'},{id:3,company:'Silinmiş',record_status:'Silindi'}]};vm.createContext(ctx);
 for(const name of ['resultOf','filterRows'])vm.runInContext(html.match(new RegExp('function '+name+'\\([^\\n]+'))[0],ctx);
 assert.deepEqual(Array.from(ctx.filterRows(),x=>x.id),[1]);elements.recordFilter.value='Pasif';assert.deepEqual(Array.from(ctx.filterRows(),x=>x.id),[2]);assert.equal(ctx.resultOf(ctx.customers[1]),'open');elements.recordFilter.value='';assert.deepEqual(Array.from(ctx.filterRows(),x=>x.id),[1,2]);
});
