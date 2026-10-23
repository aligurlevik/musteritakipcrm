import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('public/silent-fullscreen-reminders.js','utf8');
function setup(){
 const listeners={},shown=[],notifications=[],registrations=[],frame={contentWindow:{}};
 const create=()=>({children:[],setAttribute(){},append(...nodes){this.children.push(...nodes)},focus(){},remove(){}});
 class Registration{showNotification(title,options){notifications.push({title,options})}}
 const context={window:{ServiceWorkerRegistration:Registration,addEventListener(type,fn){listeners[type]=fn}},navigator:{serviceWorker:{register(url){registrations.push(url);return Promise.resolve()}}},location:{origin:'https://crm.test'},document:{createElement:create,head:{appendChild(){}},body:{appendChild(node){shown.push(node)}},getElementById:id=>id==='desktopNotesFrame'?frame:null,addEventListener(type,fn){listeners[type]=fn}}};
 vm.runInNewContext(source,context);return {context,listeners,shown,notifications,registrations,frame,Registration};
}
test('silent policy runs before clients and suppresses vibration even when a caller asks for sound',async()=>{
 const {context,notifications,registrations,Registration}=setup();assert.equal(context.window.CRM_SILENT_DESKTOP,true);
 await context.navigator.serviceWorker.register('/agenda-sw.js?v=old',{});assert.equal(registrations[0],'/agenda-sw-silent.js?v=20261023');
 new Registration().showNotification('Not',{silent:false,vibrate:[500],renotify:true});assert.equal(notifications[0].options.silent,true);assert.equal(notifications[0].options.renotify,false);assert.equal('vibrate' in notifications[0].options,false);
});
test('only the same-origin notes frame can open the parent fullscreen warning; simultaneous notes queue',()=>{
 const {listeners,shown,frame}=setup();
 const send=(text,origin='https://crm.test',source=frame.contentWindow)=>listeners.message({origin,source,data:{type:'CRM_SCRATCH_ALARM',text}});
 send('bad','https://other.test');send('bad','https://crm.test',{});assert.equal(shown.length,0);
 send('BAŞLIK\n\nAçıklama');send('İKİNCİ');assert.equal(shown.length,1);assert.equal(shown[0].children[1].textContent,'BAŞLIK\n\nAçıklama');
 shown[0].children[2].onclick();assert.equal(shown.length,2);assert.equal(shown[1].children[1].textContent,'İKİNCİ');
});
