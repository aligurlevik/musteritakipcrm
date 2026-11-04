import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('public/index.html');
test('desktop main list follows phone main notebook and archive rules without losing overdue notes',()=>{
 const context={agendaEntries:[{id:1,entry_date:'2026-11-01'},{id:2,entry_date:'2026-11-04',entry_status:'Yapıldı'},{id:3,entry_date:'2026-11-03',entry_status:'Yapıldı'},{id:4,is_archived:1},{id:5,notebook_no:2},{id:6,note:'\u2063\u200Bprivate'}],localDateKey:()=> '2026-11-04',agendaTaskSort:(a,b)=>a.id-b.id};
 vm.runInNewContext(html.match(/function refreshTodayAgendaEntries\(\)[^\n]+/)[0],context);context.refreshTodayAgendaEntries();
 assert.deepEqual(Array.from(context.todayAgendaEntries,x=>x.id),[1,2]);
 assert.match(html,/agendaEntries=await req\('\/api\/notes-v3\?scope=all&notebook=1'\)/);
});
test('both devices refresh and native edits update the shared title',()=>{
 assert.match(html,/setInterval\(syncAgendaAcrossDevices,15000\)/);
 const java=read('android-alarm/app/src/main/java/com/musteritakipcrm/alarm/MainActivity.java');
 assert.match(java,/onResume\(\)/);assert.match(java,/removeCallbacks\(syncAgenda\)/);assert.match(java,/!e.explicitlyArchived/);
 assert.match(read('src/engview_entry.js'),/note=\?,remind_at=\?,title=\?,reminder_status=\?/);
});
