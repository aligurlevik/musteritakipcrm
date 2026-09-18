import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import test from 'node:test';

const html=await readFile('public/notlar-v2.html','utf8');
const helper=html.match(/<script id="noteDayGroupsScript">([\s\S]*?)<\/script>/)[1];
const now=new Date('2026-09-18T08:00:00Z');
const NativeDate=Date;
class FixedDate extends NativeDate{
  constructor(...args){super(...(args.length?args:[now.getTime()]))}
}
function setup(extra={}){
  const context=createContext({window:{},document:{addEventListener(){}},setInterval(){},Date:FixedDate,...extra});
  runInContext(helper,context);
  return {context,days:context.window.crmNoteDays};
}

test('today stays first and each day stays together across completion and importance changes',()=>{
  const {days}=setup();
  const notes=[
    {id:100,entry_date:'2026-09-17',is_important:1},
    {id:5,entry_date:'2026-09-18',entry_status:'Yapıldı'},
    {id:4,entry_date:'2026-09-18'},
    {id:3,entry_date:'2026-09-18',is_important:1},
    {id:200,entry_date:'2026-09-16'},
    {id:300,entry_date:'2026-09-17',entry_status:'Yapıldı'},
    {id:500,entry_date:'2026-09-19'},
    {id:999}
  ];
  assert.deepEqual(Array.from(days.sort(notes,now),item=>item.id),[3,4,5,500,100,300,200,999]);
  assert.equal(notes[0].id,100,'sorting must preserve the original data array');
});

test('selected note dates take priority and old UTC timestamps use the Istanbul calendar day',()=>{
  const {days}=setup();
  assert.equal(days.noteDay({entry_date:'2026-09-16',created_at:'2026-09-18 10:00:00'}),'2026-09-16');
  assert.equal(days.noteDay({created_at:'2026-09-17 22:30:00'}),'2026-09-18');
  assert.equal(days.todayKey(new Date('2026-09-17T21:01:00Z')),'2026-09-18');
  assert.equal(days.noteDay({entry_date:'2026-02-30',created_at:'not a date'}),'');
  assert.match(days.dayLabel('2026-09-18',now),/^Bugün · /);
  assert.match(days.dayLabel('2026-09-17',now),/^Dün · /);
});

test('day colors remain stable and distinct even across different weeks',()=>{
  const {days}=setup(),colors=[];
  for(let day=1;day<=21;day++){
    const key='2026-09-'+String(day).padStart(2,'0');
    const color=days.colorForDate(key);
    assert.deepEqual(color,days.colorForDate(key));
    colors.push(color.bg);
  }
  assert.equal(new Set(colors).size,21);
});

test('the actual note renderer adds one day heading per group and preserves card actions',()=>{
  const list={innerHTML:''};
  const notes=[
    {id:20,entry_date:'2026-09-17',note:'Dünkü not',created_at:'2026-09-18 10:00:00'},
    {id:2,entry_date:'2026-09-18',note:'Bugünkü ikinci not',is_locked:1,is_archived:1},
    {id:3,entry_date:'2026-09-18',note:'Bugünkü ilk not',remind_at:'2026-09-18T14:00'}
  ];
  const {context}=setup({state:{items:notes,scope:'archive'},$:()=>list,esc:value=>String(value??''),noteWrittenLabel:()=> '18.09.2026',alarmLabel:value=>value});
  const start=html.indexOf('window.render=function(){');
  const renderer=html.slice(start,html.indexOf('\nconst baseRender',start));
  runInContext(renderer+'\nwindow.render();',context);
  assert.deepEqual(Array.from(list.innerHTML.matchAll(/data-note-id="(\d+)"/g),match=>Number(match[1])),[3,2,20]);
  assert.equal((list.innerHTML.match(/class="noteDayHeading"/g)||[]).length,2);
  assert.ok(list.innerHTML.indexOf('Bugün · ')<list.innerHTML.indexOf('Dün · '));
  const cards=Array.from(list.innerHTML.matchAll(/data-note-id="\d+" data-note-day="([^"]*)" style="([^"]*)"/g));
  assert.equal(cards[0][2],cards[1][2]);
  assert.notEqual(cards[0][2],cards[2][2]);
  assert.match(list.innerHTML,/openEditor\(3\)/);
  assert.match(list.innerHTML,/setDone\(2,this.checked\)/);
  assert.match(list.innerHTML,/🔒 Kilitli/);
  assert.match(list.innerHTML,/Geri Çek/);
});

test('mobile card titles stay attached to their own notes after day ordering changes',async()=>{
  const source=await readFile('src/mobile_latest_entry.js','utf8');
  const script=source.match(/const titleListPatch=String.raw`<script id="mobileTitleListPatch">([\s\S]*?)<\/script>`/)[1];
  const timers=[];
  const cards=[7,2].map(id=>({dataset:{noteId:String(id)},classList:{toggle(){}},body:{querySelector(){return null},prepend(node){this.title=node.textContent}},querySelector(selector){return selector==='.body'?this.body:null}}));
  const context=createContext({
    window:{fetch:async()=>({ok:true,async json(){return [{id:2,title:'Dün'},{id:7,title:'Bugün'}]}})},
    document:{getElementById:id=>id==='list'?{}:null,querySelectorAll:()=>cards,createElement:()=>({}),addEventListener(){}},
    setTimeout:callback=>timers.push(callback),MutationObserver:class{observe(){}}
  });
  runInContext(script,context);
  await timers[0]();
  assert.equal(cards[0].body.title,'Bugün');
  assert.equal(cards[1].body.title,'Dün');
});
