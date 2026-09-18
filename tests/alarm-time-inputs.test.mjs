import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import test from 'node:test';

const html=await readFile('public/yeni-not.html','utf8');
const editorCode=await readFile('public/notes-title-patch.js','utf8');
function dom(){
  const nodes=new Map();
  function element(id){
    const listeners=new Map();
    const node={id,value:'',style:{},scrollHeight:150,classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){},
      addEventListener(name,callback){listeners.set(name,callback)},emit(name){listeners.get(name)?.()},
      insertAdjacentElement(position,next){nodes.set(next.id,next)},closest(){return {classList:{add(){}}}}};
    return node;
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)};
  return {nodes,get,document:{readyState:'loading',getElementById:id=>nodes.get(id)||null,createElement:()=>element(''),addEventListener(){}}};
}
function newNote(){
  const d=dom(),requests=[];
  for(const id of ['alarmDate','alarmHour','alarmMinute','alarmBtn','alarmBox','note','fontSizeLabel','textColor','bgColor','msg','saveBtn'])d.get(id);
  d.get('note').value='Toplantıyı hatırla';d.get('alarmDate').value='2030-09-22';d.get('textColor').value='#101828';d.get('bgColor').value='#fffdf1';
  const location={href:''},window={};
  const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  new Script(script).runInNewContext({window,document:d.document,location,navigator:{},localStorage:{getItem:()=>null,setItem(){}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},
    async fetch(path,options){if(path==='/api/notes-v3')requests.push(JSON.parse(options.body));return new Response(JSON.stringify({id:1}),{headers:{'content-type':'application/json'}})}});
  return {...d,window,requests,location};
}
function noteEditor(){
  const d=dom(),alerts=[],window={fetch:async()=>new Response('[]')};
  const hidden=d.get('editAlarmTime');
  const script=editorCode.replace(/\}\)\(\);\s*$/,'window.alarmTest={installAlarmSplit,syncAlarmFromHidden,syncAlarmToHidden};})();');
  new Script(script).runInNewContext({window,document:d.document,location:{pathname:'/notlar-v2.html'},alert:message=>alerts.push(message)});
  window.alarmTest.installAlarmSplit();return {...d,hidden,alerts,alarm:window.alarmTest};
}

test('new note hour and minute use a numeric keyboard with an enforced two-character limit',()=>{
  for(const id of ['alarmHour','alarmMinute']){
    const tag=html.match(new RegExp('<input id="'+id+'"[^>]*>'))[0];
    assert.match(tag,/type="text"/);assert.match(tag,/inputmode="numeric"/);assert.match(tag,/maxlength="2"/);
  }
  const b=newNote();
  for(const id of ['alarmHour','alarmMinute']){
    const input=b.get(id);
    input.value='00000';input.emit('input');assert.equal(input.value,'00');
    input.value='09abc';input.emit('input');assert.equal(input.value,'09');
    input.value='5';input.emit('blur');assert.equal(input.value,'05');
    input.value='';input.emit('blur');assert.equal(input.value,'');
  }
});

test('saving a new alarm rejects overlong values, invalid ranges and partial times; valid values save as HH:mm',async()=>{
  for(const [hour,minute] of [['00000','05'],['09','00000'],['24','05'],['09','60'],['-1','05'],['09','1e1'],['','05'],['09','']]){
    const b=newNote();await b.window.toggleAlarm();b.get('alarmHour').value=hour;b.get('alarmMinute').value=minute;
    await b.window.saveNote();assert.equal(b.requests.length,0,hour+':'+minute+' must not be saved');assert.ok(b.get('msg').textContent);
  }
  for(const [hour,minute,expected] of [['9','5','09:05'],['00','00','00:00'],['23','59','23:59']]){
    const b=newNote();await b.window.toggleAlarm();b.get('alarmHour').value=hour;b.get('alarmMinute').value=minute;
    await b.window.saveNote();assert.equal(b.requests[0].remind_at,'2030-09-22T'+expected);assert.equal(b.get('alarmHour').value,expected.slice(0,2));assert.equal(b.get('alarmMinute').value,expected.slice(3));
  }
});

test('editing an alarm uses the same two-digit limits and preserves leading zeroes',()=>{
  const b=noteEditor(),hour=b.get('editAlarmHour'),minute=b.get('editAlarmMinute');
  for(const input of [hour,minute]){assert.equal(input.type,'text');assert.equal(input.maxLength,2);assert.equal(input.inputMode,'numeric');input.value='00000';input.emit('input');assert.equal(input.value,'00')}
  b.hidden.value='09:05';b.alarm.syncAlarmFromHidden();assert.equal(hour.value,'09');assert.equal(minute.value,'05');
  hour.value='3';minute.value='7';hour.emit('blur');minute.emit('blur');assert.equal(hour.value,'03');assert.equal(minute.value,'07');assert.equal(b.alarm.syncAlarmToHidden(),true);assert.equal(b.hidden.value,'03:07');
  for(const [h,m] of [['00000','05'],['09','00000'],['24','05'],['09','60'],['09',''],['1e1','05']]){
    hour.value=h;minute.value=m;assert.equal(b.alarm.syncAlarmToHidden(),false);assert.equal(b.hidden.value,'03:07');
  }
  hour.value='';minute.value='';assert.equal(b.alarm.syncAlarmToHidden(),true);assert.equal(b.hidden.value,'');
});
