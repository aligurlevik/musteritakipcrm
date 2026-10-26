import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {purgeArchivedNotes} from '../src/archive_retention.js';
test('archive expiry respects Istanbul day, strict 35-day boundary, completion dates and active records',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE agenda_entries(id INTEGER PRIMARY KEY,source_type TEXT,is_archived INTEGER,entry_date TEXT,completed_date TEXT);CREATE TABLE agenda_voice_notes(agenda_id INTEGER);`);
 const insert=db.prepare('INSERT INTO agenda_entries VALUES(?,?,?,?,?)');
 for(const row of [[1,'manual',1,'2026-09-20',''],[2,'manual',1,'2026-09-21',''],[3,'manual',0,'2020-01-01',''],[4,'manual',1,'2020-01-01','2026-10-25'],[5,'graphic',1,'2020-01-01',''],[6,'manual',1,'invalid','']])insert.run(...row);
 db.exec('INSERT INTO agenda_voice_notes VALUES(1),(2),(3)');
 const DB={prepare(sql){let args=[];return {bind(...a){args=a;return this},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return db.prepare(sql).run(...args)}}},async batch(statements){return Promise.all(statements.map(s=>s.run()))}};
 await purgeArchivedNotes({DB},Date.parse('2026-10-25T21:30:00Z'));
 assert.deepEqual(db.prepare('SELECT id FROM agenda_entries ORDER BY id').all().map(x=>x.id),[2,3,4,5,6]);
 assert.deepEqual(db.prepare('SELECT agenda_id FROM agenda_voice_notes ORDER BY agenda_id').all().map(x=>x.agenda_id),[2,3]);
 db.close();
});
