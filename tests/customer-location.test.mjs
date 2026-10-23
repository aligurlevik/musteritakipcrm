import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {CLEAN_PORTFOLIO_HTML as html} from '../src/portfolio_clean_page.js';
const helper=html.match(/function customerLocation\(c\)\{[\s\S]*?\n\}/)[0];
test('legacy location remains usable without guessing missing neighborhoods',()=>{
 const c={};vm.createContext(c);vm.runInContext(helper,c);
 for(const [row,expected] of [
  [{region:'İvedik OSB / Yenimahalle'},['Ankara','Yenimahalle','']],
  [{region:'ANKARA'},['Ankara','','']],
  ...['Yeni Mahalle','YENI MAHALLE','YENİ MAHALLE','Yenimahalle','YENIMAHALLE'].map(district=>[{city:'Ankara',district},['Ankara','Yenimahalle','']]),
  [{district:'Yeni Mahalle'},['Ankara','Yenimahalle','']],

  [{region:'old info',city:'ANKARA',district:'ÇANKAYA',neighborhood:'BAHÇELİEVLER'},['Ankara','Çankaya','Bahçelievler']],
  [{region:'Uncertain / Area'},['','','']]
 ])assert.deepEqual(Object.values(c.customerLocation(row)),expected);
});
test('district and neighborhood options cascade and filter by the selected province',()=>{
 const ids=['city','district','neighborhood','search','sector','priority','result','followFilter'];
 const elements=Object.fromEntries(ids.map(id=>[id,{value:'',innerHTML:''}]));
 const customers=[{id:1,city:'Ankara',district:'Yenimahalle',neighborhood:'İvedikköy'},{id:2,city:'Ankara',district:'Çankaya',neighborhood:'Bahçelievler'},{id:3,city:'İstanbul',district:'Bahçelievler',neighborhood:'Şirinevler'},{id:4,city:'Ankara',district:'Sincan',neighborhood:'Temelli',record_status:'Silindi'}];
 const c={$:id=>elements[id],customers,esc:x=>x};vm.createContext(c);vm.runInContext(helper+'\n'+['locationOptions','fillLocationFilters','filterRows'].map(n=>html.match(new RegExp('function '+n+'\\([^\\n]+'))[0]).join('\n'),c);
 elements.city.value='Ankara';c.fillLocationFilters();assert.match(elements.district.innerHTML,/Yenimahalle/);assert.doesNotMatch(elements.district.innerHTML,/Bahçelievler|Sincan/);
 elements.district.value='Yenimahalle';c.fillLocationFilters();assert.match(elements.neighborhood.innerHTML,/İvedikköy/);assert.doesNotMatch(elements.neighborhood.innerHTML,/Şirinevler|Temelli/);
 elements.neighborhood.value='İvedikköy';assert.deepEqual(Array.from(c.filterRows(),x=>x.id),[1]);
});
test('customer POST and PUT persist separate location columns; old clients preserve them',async()=>{
 const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE customers(id INTEGER PRIMARY KEY,company TEXT,contact_name TEXT,phone TEXT,email TEXT,region TEXT,sector TEXT,priority TEXT,stage TEXT,follow_date TEXT,invoice_title TEXT,tax_office TEXT,tax_number TEXT,invoice_address TEXT,record_status TEXT,special_notes TEXT,machine_info TEXT,phones_json TEXT,emails_json TEXT,contacts_json TEXT,categories TEXT,note_image_data TEXT,city TEXT,district TEXT,neighborhood TEXT,first_meeting_date TEXT,updated_at TEXT)`);
 const env={DB:{prepare(sql){return {bind(...values){const stmt=db.prepare(sql);return {run:async()=>({meta:{last_row_id:stmt.run(...values).lastInsertRowid}}),first:async()=>stmt.get(...values)};}};}}};
 const ctx={env,request:{},body:async()=>ctx.payload,json:x=>x,validAgendaImage:()=>'',cm:[null,'1']};vm.createContext(ctx);
 const post=source.split("if(path==='/api/customers' && request.method==='POST') {")[1].split('\n  const cm=')[0].replace(/\n  }\s*$/,'');
 const put=source.split("if(cm && request.method==='PUT') {")[1].split('\n  const customerResult=')[0].replace(/\n  }\s*$/,'');
 const run=code=>vm.runInContext('(async()=>{'+code+'})()',ctx);
 ctx.payload={company:'ANOLSAN',city:'Ankara',district:'Yenimahalle',neighborhood:'İvedikköy',first_meeting_date:'2026-09-10'};await run(post);
 assert.equal(db.prepare('SELECT neighborhood FROM customers').get().neighborhood,'İvedikköy');
 ctx.payload={company:'ANOLSAN',district:'Sincan',neighborhood:'Temelli'};await run(put);
 let row=db.prepare('SELECT * FROM customers').get();assert.equal(row.first_meeting_date,'2026-09-10');assert.equal(row.city,'Ankara');assert.equal(row.district,'Sincan');
 ctx.payload={company:'ANOLSAN'};await run(put);row=db.prepare('SELECT * FROM customers').get();assert.equal(row.neighborhood,'Temelli');
 ctx.payload={company:'ANOLSAN',neighborhood:'',first_meeting_date:'2026-08-01'};await run(put);assert.equal(db.prepare('SELECT neighborhood FROM customers').get().neighborhood,'');assert.equal(db.prepare('SELECT first_meeting_date FROM customers').get().first_meeting_date,'2026-08-01');db.close();
});
