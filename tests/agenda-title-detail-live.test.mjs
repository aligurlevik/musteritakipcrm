import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/agenda_title_detail_ui.js',import.meta.url),'utf8');
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
    handlers:{},
    addEventListener(name,handler){this.handlers[name]=handler},
    focus(){}
  };
}

function browser(overrides={}){
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
    console,
    ...overrides
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


test('telefon notu masaüstünde başlık üstte açıklama altta gösterilir',()=>{
  let apply;
  const {context}=browser({setTimeout(fn){apply=fn;return 0}});
  const title=element();title.id='agendaTodayText-93';title.textContent='Başlık';
  const parent={style:{},querySelector(){return this.detail||null}};
  title.parentElement=parent;
  title.insertAdjacentElement=(position,node)=>{assert.equal(position,'afterend');parent.detail=node};
  context.agendaEntries.push({id:93,title:'Telefon başlığı',note:'Birinci açıklama\nİkinci açıklama'});
  context.document.querySelectorAll=selector=>selector.includes('done-note')?[title]:[];
  apply();
  assert.equal(title.textContent,'Telefon başlığı');
  assert.equal(parent.style.display,'block');
  assert.equal(parent.detail.textContent,'Birinci açıklama\nİkinci açıklama');
  assert.equal(parent.detail.className,'agenda-detail-live');
});

test('telefondan gelen not düzenlenince ayrı başlığı ve çok satırlı açıklaması korunur',async()=>{
  const requests=[];
  const {context,elements}=browser({req:async(path,options)=>requests.push({path,payload:JSON.parse(options.body)}),loadAgenda:async()=>{}});
  const item={id:94,title:'Eski başlık',note:'Eski açıklama',entry_date:'2026-10-14',remind_at:'2026-10-14T18:00',image_data:'resim'};
  context.agendaEntries.push(item);
  context.window.openAgendaTitleDetail(94,item);
  elements.get('agendaTitleDetailLiveEditTitle').value='Yeni başlık';
  elements.get('agendaTitleDetailLiveEditDetail').value='Yeni açıklama\nİkinci satır';
  await elements.get('agendaTitleDetailLiveSaveBtn').handlers.click();
  assert.equal(requests[0].path,'/api/notes-v3/94');
  assert.equal(requests[0].payload.title,'Yeni başlık');
  assert.equal(requests[0].payload.note,'Yeni açıklama\nİkinci satır');
  assert.equal(requests[0].payload.image_data,'resim');
  assert.equal(requests[0].payload.remind_at,item.remind_at);
});

test('başlık ve açıklama arayüzü canlı Worker girişinden eklenir',async()=>{
  const {addAgendaTitleDetailUi}=await import('../src/agenda_title_detail_ui.js');
  const root=fs.readFileSync(new URL('../src/crm_safe_root_page.js',import.meta.url),'utf8');
  const html=JSON.parse(root.slice(root.indexOf('=')+1).trim().replace(/;$/,''));
  const injected=addAgendaTitleDetailUi(html);
  assert.match(injected,/agendaTitleDetailLiveSafeScript/);
  assert.equal(addAgendaTitleDetailUi(injected),injected);
  assert.equal(addAgendaTitleDetailUi('<html><body>Başka sayfa</body></html>'),'<html><body>Başka sayfa</body></html>');
  assert.match(fs.readFileSync(new URL('../src/graphic_weekly_revenue_entry.js',import.meta.url),'utf8'),/addAgendaTitleDetailUi\(html\)/);
});

test('bilgisayarda yeni başlık ve açıklama birlikte ve satırları korunarak kaydedilir',async()=>{
  let stored;
  const {context,elements}=browser({window:{saveAgendaInline:async(date,noteId)=>{stored=context.document.getElementById(noteId).value}}});
  const title=element('input'),detail=element('textarea');title.value='Yeni başlık';detail.value='Açıklama 1\nAçıklama 2';
  elements.set('todayInlineNoteTitle',title);elements.set('todayInlineNote',detail);
  await context.window.saveAgendaInline('2026-10-14','todayInlineNote','todayInlineReminder');
  assert.equal(stored,'Yeni başlık\nAçıklama 1\nAçıklama 2');
  assert.equal(detail.value,'Açıklama 1\nAçıklama 2');
  title.value='';stored=undefined;
  await context.window.saveAgendaInline('2026-10-14','todayInlineNote','todayInlineReminder');
  assert.equal(stored,undefined);
});
