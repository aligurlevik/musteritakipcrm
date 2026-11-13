import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {reminderTime} from '../src/phone_reminders.js';
const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const route=source.split("if(path==='/api/meetings' && request.method==='POST') {")[1].split('\n  const md=')[0].replace(/\n  }\s*$/,'');
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE customers(id INTEGER PRIMARY KEY,company TEXT,record_status TEXT,stage TEXT,follow_date TEXT,updated_at TEXT);
 INSERT INTO customers VALUES(1,'Örnek Firma','Aktif','Yeni Lead','','');
 CREATE TABLE meetings(id INTEGER PRIMARY KEY,customer_id INTEGER,meeting_no INTEGER,meeting_date TEXT,note TEXT,next_follow_date TEXT,remind_at TEXT,remind_note TEXT,reminder_status TEXT,result TEXT,result_note TEXT,participants_json TEXT);
 CREATE TABLE agenda_entries(id INTEGER PRIMARY KEY,entry_date TEXT,sort_order INTEGER,title TEXT,note TEXT,remind_at TEXT,reminder_status TEXT,image_data TEXT,source_type TEXT,entry_status TEXT,notebook_no INTEGER);
 `);
 const env={DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this},async first(){return db.prepare(sql).get(...args)||null},async run(){const r=db.prepare(sql).run(...args);return {meta:{last_row_id:Number(r.lastInsertRowid),changes:r.changes}}}}},async batch(statements){db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}}};
 const input={customer_id:1,meeting_date:'2030-11-13',next_follow_date:'2030-11-14',note:'[GERCEK_GORUSME] Numune görüşüldü',participants:[{name:'Yetkili'}],result:'Beklemede',remind_at:'2030-11-14T09:45',remind_note:'Tekrar ara',alarm_channel:'agenda'};
 const run=async b=>{const ctx={env,request:{},body:async()=>b,json:(data,status=200)=>({data,status})};vm.createContext(ctx);return vm.runInContext('(async()=>{'+route+'})()',ctx)};
 return {db,run,input};
}
test('meeting save creates an Istanbul alarm in the shared agenda without a second meeting popup',async()=>{
 const f=fixture();try{
  const response=await f.run(f.input);assert.equal(response.status,201);assert.equal(response.data.alarm_created,true);
  const meeting=f.db.prepare('SELECT * FROM meetings').get(),alarm=f.db.prepare('SELECT * FROM agenda_entries').get();
  assert.equal(meeting.remind_at,'2030-11-14T09:45');assert.equal(meeting.reminder_status,'Ajandada');
  assert.equal(alarm.remind_at,meeting.remind_at);assert.equal(alarm.source_type,'manual');assert.equal(alarm.reminder_status,'Açık');assert.equal(alarm.entry_status,'Yapılacak');assert.equal(alarm.notebook_no,1);assert.match(alarm.note,/Örnek Firma.*Tekrar arama/);
  assert.equal(reminderTime(alarm.remind_at),Date.parse('2030-11-14T06:45Z'));
  assert.equal(f.db.prepare('SELECT follow_date FROM customers').get().follow_date,'2030-11-14');
 }finally{f.db.close()}
});
test('failed alarm insertion rolls back the meeting so a retry cannot leave a silent meeting record',async()=>{
 const f=fixture();try{f.db.exec("CREATE TRIGGER fail_alarm BEFORE INSERT ON agenda_entries BEGIN SELECT RAISE(ABORT,'test alarm failure'); END");await assert.rejects(()=>f.run(f.input),/test alarm failure/);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meetings').get().n,0);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM agenda_entries').get().n,0)}finally{f.db.close()}
});
test('incomplete alarm input and missing customers create no meeting or alarm',async()=>{
 const f=fixture();try{for(const input of [{...f.input,remind_at:''},{...f.input,next_follow_date:'2030-11-15'},{...f.input,customer_id:99}])assert.ok((await f.run(input)).status>=400);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM meetings').get().n,0)}finally{f.db.close()}
});
test('legacy meeting callers retain their existing reminder behavior',async()=>{
 const f=fixture();try{const b={...f.input};delete b.alarm_channel;const response=await f.run(b);assert.equal(response.status,201);assert.equal(f.db.prepare('SELECT reminder_status FROM meetings').get().reminder_status,'Açık');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM agenda_entries').get().n,0)}finally{f.db.close()}
});
