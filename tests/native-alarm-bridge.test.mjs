import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {nativeAlarmBridge,alarmTime} from '../src/native_alarm_bridge.js';
function setup(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(`CREATE TABLE agenda_entries(id INTEGER PRIMARY KEY,note TEXT,remind_at TEXT,reminder_status TEXT DEFAULT '',entry_status TEXT DEFAULT '',is_archived INTEGER DEFAULT 0,notebook_no INTEGER DEFAULT 1);
 CREATE TABLE scratch_notes(id INTEGER PRIMARY KEY,title TEXT,note TEXT,remind_at TEXT,owner TEXT,done INTEGER DEFAULT 0);`);
 const DB={prepare(query){const stmt=sql.prepare(query);return {bind(...values){return {first:async()=>stmt.get(...values)||null,all:async()=>({results:stmt.all(...values)}),run:async()=>stmt.run(...values)}},run:async()=>stmt.run(),all:async()=>({results:stmt.all()})}}};
 let role='admin',sequence=0;const now=Date.parse('2026-10-23T12:00:00+03:00');
 const forward=async request=>{const p=new URL(request.url).pathname;if(p.endsWith('pair-code'))return Response.json({code:'123456'});if(p.endsWith('/pair')){const token='device-'+(++sequence);sql.prepare('INSERT INTO native_alarm_devices_v2(device_token,device_name) VALUES(?,?)').run(token,'Test Windows EXE Alarm');return Response.json({token})}return Response.json({error:'unpaired'}, {status:401})};
 const call=(path,token='',payload)=>nativeAlarmBridge(new Request('https://crm.test/api/native-alarm/'+path,{method:payload===undefined?'GET':'POST',headers:{authorization:token?'Bearer '+token:'','content-type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)}),{DB},{forward,getRole:async()=>role,now});
 const pair=async()=>{await call('pair-code','',{});return (await (await call('pair','',{code:'123456'})).json()).token};
 return {sql,call,pair,setRole:r=>role=r,now};
}
test('native alarm timestamps accept minutes, seconds, UTC and explicit offsets',()=>{
 const expected=Date.parse('2026-10-23T09:00:00Z');
 for(const time of ['2026-10-23T12:00','2026-10-23 12:00:00','2026-10-23T12:00:00+03:00','2026-10-23T09:00:00Z'])assert.equal(alarmTime(time),expected);
 assert.ok(Number.isNaN(alarmTime('not a date')));
});
test('both sources reach paired devices, acknowledgments are per-device, and owners stay isolated',async()=>{
 const f=setup(),a=await f.pair(),b=await f.pair();
 f.sql.exec(`INSERT INTO agenda_entries(id,note,remind_at) VALUES(1,'Agenda','2026-10-23 12:00:00');
 INSERT INTO scratch_notes VALUES(1,'Ali note','Private Ali','2026-10-23T12:00','admin',0),(2,'Çağatay note','Private graphic','2026-10-23T12:00','graphic',0),(3,'Done','No alarm','2026-10-23T12:00','admin',1);`);
 let data=await (await f.call('reminders',a)).json();assert.deepEqual(data.reminders.map(x=>x.id),[-1,1]);assert.equal(data.notesLinked,true);
 await f.call('ack',a,{id:1,remind_at:'2026-10-23 12:00:00'});await f.call('ack',a,{id:-1,remind_at:'2026-10-23T12:00'});
 assert.equal((await (await f.call('reminders',a)).json()).reminders.length,0);
 assert.equal((await (await f.call('reminders',b)).json()).reminders.length,2);
 assert.equal(f.sql.prepare('SELECT reminder_status FROM agenda_entries').get().reminder_status,'');
 f.setRole('graphic');const graphic=await f.pair();data=await (await f.call('reminders',graphic)).json();assert.deepEqual(data.reminders.map(x=>x.id),[-2,1]);assert.ok(!JSON.stringify(data).includes('Private Ali'));
 assert.equal((await f.call('ack',graphic,{id:-1,remind_at:'2026-10-23T12:00'})).status,404);
 f.sql.close();
});
test('legacy devices require explicit ownership before receiving private notes; heartbeat status is accurate',async()=>{
 const f=setup();await f.call('status');f.sql.prepare('INSERT INTO native_alarm_devices_v2(device_token,device_name) VALUES(?,?)').run('legacy','Office Windows Alarm');f.sql.exec("INSERT INTO scratch_notes VALUES(1,'Private','Secret','2026-10-23T12:00','admin',0)");
 assert.equal((await (await f.call('reminders','legacy')).json()).reminders.length,0);
 let status=await (await f.call('status')).json();assert.equal(status.devices[0].notesLinked,false);
 assert.equal((await f.call('claim','',{id:status.devices[0].id})).status,200);
 assert.equal((await (await f.call('reminders','legacy')).json()).reminders.length,1);
 status=await (await f.call('status')).json();assert.equal(status.online,true);assert.equal(status.devices[0].notesLinked,true);
 f.setRole('');assert.equal((await f.call('pair-code','',{})).status,401);assert.equal((await f.call('status')).status,401);f.sql.close();
});
test('previous hashed-token installations migrate without losing positive agenda acknowledgments',async()=>{
 const f=setup();await f.call('status');f.sql.exec('CREATE TABLE native_alarm_devices(id TEXT,token_hash TEXT,label TEXT,enabled INTEGER);CREATE TABLE native_alarm_acks(device_id TEXT,agenda_id INTEGER,remind_at TEXT);');
 const token='previous-install',digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 f.sql.prepare('INSERT INTO native_alarm_devices VALUES(?,?,?,1)').run('old',digest,'Old Windows Alarm');f.sql.exec("INSERT INTO native_alarm_acks VALUES('old',1,'2026-10-23T12:00');INSERT INTO agenda_entries(id,note,remind_at) VALUES(1,'Already dismissed','2026-10-23T12:00'),(2,'Still due','2026-10-23T12:00')");
 const response=await f.call('reminders',token);assert.equal(response.status,200);assert.deepEqual((await response.json()).reminders.map(x=>x.id),[2]);assert.equal((await f.call('reminders','wrong-token')).status,401);f.sql.close();
});
