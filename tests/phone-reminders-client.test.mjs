import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import test from 'node:test';

const code=await readFile('public/phone-reminders.js','utf8');
function browser({permission='default',allowed='granted',audioSuspended=false}={}){
  const nodes=new Map(),storage=new Map([['crm_notifications_enabled','0']]),timers=new Map(),calls=[],notifications=[],oscillators=[];
  let timerId=0,subscription=null;
  const element=()=>({style:{},setAttribute(){},classList:{add(){},remove(){}},querySelector(){return this.button||=( {focus(){}} )}});
  const document={hidden:false,readyState:'loading',head:{appendChild(){}},body:{appendChild(node){nodes.set(node.id,node);nodes.set('crmAlarmTitle',element());nodes.set('crmAlarmBody',element())}},createElement:element,getElementById:id=>nodes.get(id)||null,addEventListener(){}};
  const key='BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const registration={
    pushManager:{async getSubscription(){return subscription},async subscribe(options){subscription={options,toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/client-test',keys:{p256dh:key,auth:'AAAAAAAAAAAAAAAAAAAAAA'}}),async unsubscribe(){subscription=null;return true}};return subscription}},
    async showNotification(title,options){notifications.push({title,options})}
  };
  class AudioContext{
    constructor(){this.state=audioSuspended?'suspended':'running';this.currentTime=0;this.destination={}}
    async resume(){if(!audioSuspended)this.state='running'}
    createOscillator(){const oscillator={frequency:{},connect(){},disconnect(){},start(t){this.started=t},stop(){}};oscillators.push(oscillator);return oscillator}
    createGain(){return {connect(){},disconnect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){}}}}
  }
  const NativeNotification={permission,async requestPermission(){this.permission=allowed;return allowed}};
  const window={isSecureContext:true,PushManager:function(){},Notification:NativeNotification,AudioContext,
    async fetch(path,options){calls.push({path,options});return new Response(JSON.stringify(path==='/api/push/config'?{publicKey:key}:{ok:true,deviceId:'test-device'}),{headers:{'content-type':'application/json'}})},addEventListener(){},dispatchEvent(){}};
  const navigator={serviceWorker:{async register(){return registration},ready:Promise.resolve(registration),async getRegistration(){return registration},addEventListener(){}},vibrate(){}};
  const context={window,document,navigator,Notification:NativeNotification,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},location:{href:'https://crm.test/notlar-v2.html',search:''},URL,URLSearchParams,Uint8Array,atob,Event,setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId},setInterval(fn,ms){timers.set(++timerId,{fn,ms});return timerId},clearTimeout:id=>timers.delete(id),clearInterval:id=>timers.delete(id)};
  new Script(code).runInNewContext(context);
  return {reminders:window.crmReminders,window,document,nodes,timers,calls,notifications,oscillators,storage};
}

test('phone permission and subscription must both succeed before the app reports notifications connected',async()=>{
  const b=browser();assert.equal(b.reminders.status.connected,false);assert.equal(b.calls.length,0);
  await b.reminders.enable();assert.equal(b.reminders.status.connected,true);assert.equal(b.reminders.status.deviceId,'test-device');
  assert.deepEqual(b.calls.map(x=>x.path),['/api/push/config','/api/push/subscribe']);
  await b.reminders.test();assert.equal(b.oscillators.length,6);assert.deepEqual(b.oscillators.map(o=>o.frequency.value),[920,680,920,680,920,680]);assert.ok(b.oscillators.every(o=>o.type==='square'));assert.equal(b.calls.at(-1).path,'/api/push/test');
  await b.reminders.disable();assert.equal(b.reminders.status.connected,false);assert.equal(b.storage.get('crm_notifications_enabled'),'0');assert.equal(b.calls.at(-1).path,'/api/push/unsubscribe');
  const denied=browser({allowed:'denied'});await assert.rejects(denied.reminders.enable(),/bildirim iznini açın/);assert.equal(denied.reminders.status.connected,false);assert.equal(denied.calls.length,0);
});

test('visible reminder text and alarm sound happen together, duplicate alarms are suppressed, and dismissal advances the queue',async()=>{
  const b=browser();await b.reminders.enable();
  const note={id:1,title:'Müşteri',note:'İşler çok acil',remind_at:'2030-09-20T12:00',notebook_no:1};
  await b.reminders.fire(note);
  assert.equal(b.nodes.get('crmAlarmTitle').textContent,'Müşteri');assert.equal(b.nodes.get('crmAlarmBody').textContent,'İşler çok acil');
  assert.equal(b.oscillators.length,6);assert.ok(b.oscillators.every(o=>typeof o.started==='number'));assert.equal(b.notifications.length,1);assert.equal(b.notifications[0].options.silent,true);
  assert.equal(b.calls.at(-1).path,'/api/push/ack');assert.equal(JSON.parse(b.calls.at(-1).options.body).deviceId,'test-device');
  await b.reminders.fire(note);assert.equal(b.oscillators.length,6);assert.equal(b.notifications.length,1);
  await b.reminders.fire({...note,id:2,note:'İkinci uyarı'});assert.equal(b.nodes.get('crmAlarmBody').textContent,'İşler çok acil');
  b.reminders.dismiss();assert.equal(b.nodes.get('crmAlarmBody').textContent,'İkinci uyarı');assert.equal(b.oscillators.length,12);
  b.reminders.dismiss();assert.equal(b.timers.size,0);
});

test('hidden pages leave notification delivery to the server and suspended audio falls back to system notification sound',async()=>{
  const b=browser({audioSuspended:true});await b.reminders.enable();b.document.hidden=true;
  await b.reminders.fire({id:1,note:'Gizli sekme',remind_at:'2030-09-20T12:00'});assert.equal(b.notifications.length,0);assert.equal(b.oscillators.length,0);
  b.document.hidden=false;
  await b.reminders.fire({id:2,note:'Sesli telefon uyarısı',remind_at:'2030-09-20T12:00'});assert.equal(b.notifications[0].options.silent,false);
});


test('private reminders never reveal the title or content in system notifications',async()=>{
  const b=browser();await b.reminders.enable();
  await b.reminders.fire({id:3,title:'Gizli başlık',note:'Gizli içerik',notebook_no:3,remind_at:'2030-09-20T12:00'});
  assert.equal(b.notifications[0].title,'🔒 Özel not hatırlatıcısı');
  assert.equal(b.notifications[0].options.body,'İçeriği görmek için Not 3 özel şifresini girin.');
  assert.ok(!JSON.stringify(b.notifications).includes('Gizli'));
  b.reminders.clearPrivate();assert.equal(b.nodes.get('crmAlarmBody').textContent,'');assert.equal(b.timers.size,0);
});
