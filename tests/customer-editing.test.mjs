import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {CLEAN_PORTFOLIO_HTML as html} from '../src/portfolio_clean_page.js';
const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
test('potential selection synchronizes editable values and notes can be corrected without deleting them',()=>{
 const elements=Object.fromEntries(['dPriority','dPotential','customerSaveStatus'].map(id=>[id,{value:'',textContent:''}]));
 const ctx={$:id=>elements[id],notes:[{text:'Eski not',date:'',done:true}]};vm.createContext(ctx);
 for(const name of ['syncPotential','updateNoteText','updateNoteDate'])vm.runInContext(html.match(new RegExp('function '+name+'\\([^\\n]+'))[0],ctx);
 ctx.syncPotential('KRİTİK');assert.equal(elements.dPriority.value,'KRİTİK');assert.equal(elements.dPotential.value,'KRİTİK');
 ctx.updateNoteText(0,'Düzeltilen not');ctx.updateNoteDate(0,'2026-10-22');assert.equal(ctx.notes[0].text,'Düzeltilen not');assert.equal(ctx.notes[0].done,true);assert.equal(ctx.notes[0].date,'2026-10-22');
 assert.doesNotMatch(html,/<th>Not<\/th>|<span class="note-check">/);assert.match(html,/id="dPotential"[^>]+onchange=/);assert.match(html,/onclick="saveCustomerChanges\(\)"/);
});
test('editing a meeting note changes only its text and date, preserving reminders and outcome',async()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE meetings(id INTEGER PRIMARY KEY,note TEXT,meeting_date TEXT,remind_at TEXT,result TEXT,participants_json TEXT);INSERT INTO meetings VALUES(1,'Eski','2026-10-01','2026-10-30T10:00','Olumlu','[{\"name\":\"Ali\"}]')");
 const env={DB:{prepare(sql){return {bind(...v){const stmt=db.prepare(sql);return {first:async()=>stmt.get(...v),run:async()=>stmt.run(...v)}}}}}};
 const ctx={env,request:{},md:[null,'1'],body:async()=>({note:'Yeni not',meeting_date:'2026-09-15'}),json:(d,status=200)=>({d,status})};vm.createContext(ctx);
 const code=source.split("if(md&&request.method==='PATCH'){")[1].split("  if(md&&request.method==='PUT')")[0].replace(/\n  }\s*$/,'');
 await vm.runInContext('(async()=>{'+code+'})()',ctx);const row=db.prepare('SELECT * FROM meetings').get();assert.equal(row.note,'Yeni not');assert.equal(row.meeting_date,'2026-09-15');assert.equal(row.remind_at,'2026-10-30T10:00');assert.equal(row.result,'Olumlu');assert.match(row.participants_json,/Ali/);db.close();
});
test('offer and mail notes update without replacing other record fields',async()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE offers(id INTEGER PRIMARY KEY,note TEXT,amount INTEGER);INSERT INTO offers VALUES(1,'Eski teklif notu',1500);CREATE TABLE mails(id INTEGER PRIMARY KEY,summary TEXT,subject TEXT);INSERT INTO mails VALUES(2,'Eski mail notu','Konu')");
 const env={DB:{prepare(sql){return {bind(...v){const stmt=db.prepare(sql);return {first:async()=>stmt.get(...v),run:async()=>stmt.run(...v)}}}}}};
 const code=source.split("if(relatedNote&&request.method==='PATCH'){")[1].split("  if(md&&request.method==='PATCH')")[0].replace(/\n  }\s*$/,'');
 for(const [table,id,payload] of [['offers','1',{note:'Yeni teklif notu'}],['mails','2',{summary:'Yeni mail notu'}]]){
  const ctx={env,request:{},relatedNote:[null,table,id],body:async()=>payload,json:(d,status=200)=>({d,status})};vm.createContext(ctx);await vm.runInContext('(async()=>{'+code+'})()',ctx);
 }
 assert.equal(db.prepare('SELECT note FROM offers').get().note,'Yeni teklif notu');assert.equal(db.prepare('SELECT amount FROM offers').get().amount,1500);assert.equal(db.prepare('SELECT summary FROM mails').get().summary,'Yeni mail notu');assert.equal(db.prepare('SELECT subject FROM mails').get().subject,'Konu');db.close();
});
