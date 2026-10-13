import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import test from 'node:test';
import {applyCrmBranding} from '../src/crm_branding.js';

const [
  mobileNotificationEntry,
  notificationControls,
  visualAlert,
  legacySilentWorker,
  crmBranding,
  backend
]=await Promise.all([
  readFile('src/mobile_notification_entry.js','utf8'),
  readFile('public/phone-notification-controls.js','utf8'),
  readFile('public/agenda-visual-alert.js','utf8'),
  readFile('public/agenda-sw-silent.js','utf8'),
  readFile('src/crm_branding.js','utf8'),
  readFile('src/index.js','utf8')
]);

test('the general HTML layer leaves the audible worker enabled for phones',()=>{
  assert.doesNotMatch(mobileNotificationEntry,/CRM_VISUAL_ONLY/);
  assert.doesNotMatch(mobileNotificationEntry,/crmVisualOnlyWorker/);
  assert.doesNotMatch(mobileNotificationEntry,/agenda-sw-silent\.js/);
});

test('notification controls keep the audible worker and an audible system test',()=>{
  assert.match(notificationControls,/serviceWorker\.register\(['"]\/agenda-sw\.js['"]/);
  assert.doesNotMatch(notificationControls,/agenda-sw-silent\.js/);
  assert.doesNotMatch(notificationControls,/installVisualOnly|__visualOnly|sound\s*:\s*false/);
  assert.match(notificationControls,/showNotification\([\s\S]*?silent\s*:\s*false/);
});

test('the visual alert uses the audible worker without replacing the CRM alarm handler',()=>{
  assert.match(visualAlert,/serviceWorker\.register\(['"]\/agenda-sw\.js['"]/);
  assert.doesNotMatch(visualAlert,/agenda-sw-silent\.js/);
  assert.match(visualAlert,/showNotification\([\s\S]*?silent\s*:\s*false/);
  assert.doesNotMatch(visualAlert,/window\.showAgendaReminder\s*=/);
  assert.match(visualAlert,/if\(window\.CRM_SILENT_DESKTOP&&onMainAgenda\(\)\)return/);
  assert.match(visualAlert,/if\(window\.CRM_SILENT_DESKTOP&&window\.crmReminders\?\.fire\)[\s\S]*?else\{\s*showVisual\(item\);\s*if\(!onMainAgenda\(\)&&window\.crmReminders\?\.fire\)window\.crmReminders\.fire\(item\)/);
});

test('Windows branding alone remaps notifications to the silent worker and suppresses in-page sound',async()=>{
  const source='<!doctype html><html><head></head><body></body></html>';
  const render=async userAgent=>{
    const response=new Response(source,{headers:{'content-type':'text/html; charset=utf-8'}});
    const request=new Request('https://crm.test/notlar-v2.html',{headers:{'user-agent':userAgent}});
    return (await applyCrmBranding(response,request)).text();
  };
  const windowsHtml=await render('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  const androidHtml=await render('Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile');

  assert.match(crmBranding,/if\s*\(isWindows\s*&&[^)]*crmSilentDesktopWorker/);
  assert.match(windowsHtml,/id="crmSilentDesktopWorker"/);
  assert.match(windowsHtml,/CRM_SILENT_DESKTOP\s*=\s*true/);
  assert.match(windowsHtml,/url\s*===\s*['"]\/agenda-sw\.js['"]\s*\?\s*['"]\/agenda-sw-silent\.js['"]/);
  assert.match(windowsHtml,/id="crmSilentDesktopAlarm"/);
  assert.match(windowsHtml,/unlockReminderAudio\s*=\s*function\s*\(\)\s*\{\s*\}/);
  assert.match(windowsHtml,/playReminderSound\s*=\s*function\s*\(\)\s*\{\s*\}/);
  assert.match(windowsHtml,/reminderAudioContext\.close/);
  assert.match(windowsHtml,/reminders\.present\(data,\{sound:false\}\)/);
  assert.match(windowsHtml,/GÖRSEL UYARI TESTİ/);
  assert.match(windowsHtml,/BİLGİSAYARDA SESSİZ GÖRSEL UYARI/);
  assert.match(windowsHtml,/silent\s*:\s*true/);
  assert.doesNotMatch(androidHtml,/crmSilentDesktopWorker|crmSilentDesktopAlarm|agenda-sw-silent\.js|CRM_SILENT_DESKTOP/);
  for(const id of ['crmSilentDesktopWorker','crmSilentDesktopAlarm']){
    const script=windowsHtml.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)<\\/script>'));
    assert.ok(script,id+' must be injected');
    assert.doesNotThrow(()=>new Script(script[1]),id+' must contain valid JavaScript');
  }
});

test('the silent worker shows a visual notification without sound, vibration, or in-page replay',async()=>{
  const listeners={},notifications=[];
  const self={
    location:{origin:'https://crm.test'},
    addEventListener(name,listener){listeners[name]=listener},
    registration:{
      async showNotification(title,options){notifications.push({title,options})},
      pushManager:{async getSubscription(){return null}}
    },
    clients:{
      async matchAll(){return []},
      async openWindow(){}
    },
    async skipWaiting(){}
  };
  new Script(legacySilentWorker).runInNewContext({self,URL,fetch});
  let pending;
  listeners.push({
    data:{json:()=>({title:'Sessiz ajanda',body:'Hatırlatma',tag:'agenda-regression'})},
    waitUntil(promise){pending=promise}
  });
  await pending;
  assert.equal(notifications.length,1);
  assert.equal(notifications[0].options.silent,true);
  assert.equal(notifications[0].options.renotify,false);
  assert.equal('vibrate' in notifications[0].options,false);
  assert.doesNotMatch(legacySilentWorker,/CRM_REMINDER|\.postMessage\s*\(/);
});

test('desktop agenda UPDATE leaves the separately stored mobile title untouched',()=>{
  const putStart=backend.indexOf("if(agendaItem&&request.method==='PUT')");
  const deleteStart=backend.indexOf("if(agendaItem&&request.method==='DELETE')",putStart);
  assert.ok(putStart>=0&&deleteStart>putStart,'desktop agenda update route must remain present');

  const putRoute=backend.slice(putStart,deleteStart);
  assert.match(putRoute,/UPDATE agenda_entries SET[^'"]*\bnote\s*=\s*\?/i);
  assert.doesNotMatch(putRoute,/UPDATE agenda_entries SET[^'"]*\btitle\s*=/i);
  assert.doesNotMatch(putRoute,/\bb\.title\b/i);
});
