import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const code=html.match(/function agendaReminderExpired\([\s\S]*?\nfunction refreshExpiredAgendaRows/)[0].replace(/\nfunction refreshExpiredAgendaRows$/,'');
const context={};vm.runInNewContext(code,context);
test('expired reminders remain identifiable after dismissal and across Istanbul dates',()=>{
 const now=Date.parse('2026-11-04T12:00:00+03:00');
 for(const reminder_status of ['Açık','Tamamlandı','Çaldı'])assert.equal(context.agendaReminderExpired({remind_at:'2026-11-04T11:59',reminder_status},now),true);
 assert.equal(context.agendaReminderExpired({remind_at:'2026-11-04T12:01'},now),false);
 assert.equal(context.agendaReminderExpired({remind_at:'2026-11-04T09:00Z'},now),true);
 assert.equal(context.agendaReminderExpired({remind_at:'bad'},now),false);
 assert.equal(context.agendaReminderExpired({},now),false);
});
test('rollover retains original alarm time and dismissal state',()=>{
 const api=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
 const rollover=api.slice(api.indexOf("if(path==='/api/agenda/rollover'"),api.indexOf("if(path==='/api/agenda/day'"));
 assert.match(rollover,/UPDATE agenda_entries SET entry_date=\? WHERE/);
 assert.doesNotMatch(rollover,/reminder_status=|remind_at=|DELETE/);
});
