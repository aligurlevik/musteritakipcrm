import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/agenda_title_detail_live_safe.js',import.meta.url),'utf8');
const script=source.match(/<script id="agendaTitleDetailLiveSafeScript">([\s\S]*?)<\/script>/)?.[1];

function classList(){
  const values=new Set();
  return {
    add(...names){names.forEach(name=>values.add(name))},
    remove(...names){names.forEach(name=>values.delete(name))},
    toggle(name,force){
      if(force===undefined)force=!values.has(name);
      if(force)values.add(name);else values.delete(name);
      return force;
    },
    contains(name){return values.has(name)}
  };
}

function element(tagName='div'){
  return {
    tagName:tagName.toUpperCase(),
    classList:classList(),
    textContent:'',
    value:'',
    hidden:false,
    addEventListener(){},
    focus(){}
  };
}

function browser(){
  const elements=new Map();
  const childIds=[
    'agendaTitleDetailLiveBox','agendaTitleDetailLiveView','agendaTitleDetailLiveHeading',
    'agendaTitleDetailLiveText','agendaTitleDetailLiveMeta','agendaTitleDetailLiveActions',
    'agendaTitleDetailLiveEditBtn','agendaTitleDetailLiveCloseBtn','agendaTitleDetailLiveEdit',
    'agendaTitleDetailLiveEditTitle','agendaTitleDetailLiveEditDetail',
    'agendaTitleDetailLiveSaveBtn','agendaTitleDetailLiveCancelBtn'
  ];
  const document={
    readyState:'complete',
    documentElement:{},
    getElementById(id){return elements.get(id)||null},
    createElement(tagName){return element(tagName)},
    querySelectorAll(){return []},
    addEventListener(){},
    body:{
      appendChild(node){
        elements.set(node.id,node);
        childIds.forEach(id=>{if(!elements.has(id))elements.set(id,element(id.includes('Title')?'input':'div'))});
        return node;
      },
      contains(){return true}
    }
  };
  const context={
    document,
    window:{},
    agendaEntries:[],
    todayAgendaEntries:[],
    MutationObserver:class{observe(){}},
    queueMicrotask(){},
    setTimeout(){return 0},
    clearTimeout(){},
    console
  };
  vm.runInNewContext(script,context);
  return {context,elements};
}

test('alarmdan gelen geçici kayıt listede olmasa da başlık ve açıklaması açılır',()=>{
  assert.ok(script,'canlı ajanda ayrıntı betiği bulunmalı');
  const {context,elements}=browser();
  assert.equal(typeof context.window.openAgendaTitleDetail,'function');

  const opened=context.window.openAgendaTitleDetail(91,{
    id:91,
    title:'Alarm başlığı',
    note:'Alarm açıklaması\nİkinci satır',
    entry_date:'2026-10-13',
    remind_at:'2026-10-13T09:00'
  });

  assert.equal(opened,true);
  assert.equal(context.agendaEntries.length,0);
  assert.equal(context.todayAgendaEntries.length,0);
  assert.equal(elements.get('agendaTitleDetailLiveHeading').textContent,'Alarm başlığı');
  assert.equal(elements.get('agendaTitleDetailLiveText').textContent,'Alarm açıklaması\nİkinci satır');
  assert.equal(elements.get('agendaTitleDetailLiveEditTitle').value,'Alarm başlığı');
  assert.equal(elements.get('agendaTitleDetailLiveEditDetail').value,'Alarm açıklaması\nİkinci satır');
  assert.equal(elements.get('agendaTitleDetailLiveOverlay').classList.contains('open'),true);
});

test('eski birleşik not biçimi geçici kayıtta da başlık ve ayrıntıya ayrılır',()=>{
  const {context,elements}=browser();
  assert.equal(context.window.openAgendaTitleDetail(92,{id:92,note:'Eski başlık\nEski açıklama'}),true);
  assert.equal(elements.get('agendaTitleDetailLiveHeading').textContent,'Eski başlık');
  assert.equal(elements.get('agendaTitleDetailLiveText').textContent,'Eski açıklama');
});
