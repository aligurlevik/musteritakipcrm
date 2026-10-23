import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {scratchNotesApi} from '../src/scratch_notes_api.js';
const request=(method='GET',id='',body)=>new Request('https://crm.test/api/scratch-notes'+id,{method,...(body?{body:JSON.stringify(body)}:{})});
function setup(){
 const db=new DatabaseSync(':memory:');
 const env={DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this},async run(){const r=db.prepare(sql).run(...args);return {meta:{last_row_id:Number(r.lastInsertRowid)}}},async all(){return {results:db.prepare(sql).all(...args)}},async first(){return db.prepare(sql).get(...args)}}}}};
 const api=(owner,method='GET',id='',body)=>scratchNotesApi(request(method,id,body),env,async()=>owner);
 return {db,api};
}
test('only Ali completed notes disappear on the next Istanbul day; open and Cagatay notes survive',async()=>{
 const {db,api}=setup();
 for(const owner of ['admin','graphic']){
  await api(owner,'POST','',{title:'iş görüşmesi',note:'Açıklama'});
  await api(owner,'POST','',{title:'Açık not'});
 }
 await api('admin','PUT','/1',{done:true});await api('graphic','PUT','/3',{done:true});
 let rows=await (await api('admin')).json();assert.equal(rows.length,2);
 assert.equal(rows.find(x=>x.id===1).title,'İŞ GÖRÜŞMESİ');
 db.exec("UPDATE scratch_notes SET completed_date='2020-01-01' WHERE done=1");
 rows=await (await api('admin')).json();assert.deepEqual(rows.map(x=>x.id),[2]);
 rows=await (await api('graphic')).json();assert.equal(rows.length,2);assert.equal(rows.find(x=>x.id===3).done,1);
 db.close();
});
test('editing a completed note does not postpone cleanup and unchecking clears its completion date',async()=>{
 const {db,api}=setup();await api('admin','POST','',{title:'Not'});await api('admin','PUT','/1',{done:true});
 const date=db.prepare('SELECT completed_date FROM scratch_notes').get().completed_date;
 await api('admin','PUT','/1',{note:'Düzenleme'});assert.equal(db.prepare('SELECT completed_date FROM scratch_notes').get().completed_date,date);
 await api('admin','PUT','/1',{done:false});assert.equal(db.prepare('SELECT completed_date FROM scratch_notes').get().completed_date,'');
 db.exec("UPDATE scratch_notes SET entry_date='2020-01-01'");assert.equal((await (await api('admin')).json()).length,1);db.close();
});
test('legacy completed notes migrate from UTC to Istanbul dates without deleting Cagatay notes',async()=>{
 const {db,api}=setup();await api('admin','POST','',{title:'Eski'});await api('graphic','POST','',{title:'Çağatay'});
 db.exec("UPDATE scratch_notes SET done=1,updated_at='2020-01-01 22:30:00'");
 await api('admin');assert.equal(db.prepare("SELECT count(*) n FROM scratch_notes WHERE owner='admin'").get().n,0);
 assert.equal((await (await api('graphic')).json()).length,1);db.close();
});
